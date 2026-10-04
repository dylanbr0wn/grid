package server

import (
	"errors"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/dylanbr0wn/grid/internal/lastfm"
	"github.com/dylanbr0wn/grid/internal/musicbrainz"
	"github.com/dylanbr0wn/grid/internal/snapshot"
	"github.com/gofiber/fiber/v3"
)

type Config struct {
	LastFMAPIKey          string
	LastFMBaseURL         string
	MusicBrainzBaseURL    string
	MusicBrainzUA         string
	HTTPClient            *http.Client
	Snapshots             *snapshot.Store
	SnapshotUploadsPerIP  int
	SnapshotUploadsGlobal int
	// Canonical browser origin for crawler URLs behind TLS-terminating proxies.
	SnapshotPublicOrigin string
	// Only explicitly allowed proxies may supply a sanitized single X-Real-IP.
	SnapshotTrustedProxies []string
}

type Server struct {
	snapshots            *snapshot.Store
	uploads              *uploadLimiter
	snapshotPublicOrigin string
	lastfm               *lastfm.Client
	musicbrainz          *musicbrainz.Client
}

func New(cfg Config) *fiber.App {
	httpClient := cfg.HTTPClient
	if httpClient == nil {
		httpClient = &http.Client{Timeout: 15 * time.Second}
	}

	s := &Server{
		snapshots:            cfg.Snapshots,
		uploads:              newUploadLimiter(cfg.SnapshotUploadsPerIP, cfg.SnapshotUploadsGlobal),
		snapshotPublicOrigin: cfg.SnapshotPublicOrigin,
		lastfm: &lastfm.Client{
			APIKey:  cfg.LastFMAPIKey,
			BaseURL: cfg.LastFMBaseURL,
			HTTP:    httpClient,
		},
		musicbrainz: &musicbrainz.Client{
			BaseURL:   cfg.MusicBrainzBaseURL,
			UserAgent: cfg.MusicBrainzUA,
			HTTP:      httpClient,
		},
	}

	app := fiber.New(fiber.Config{
		BodyLimit:                    snapshotBodyLimit,
		DisablePreParseMultipartForm: true,
		TrustProxy:                   len(cfg.SnapshotTrustedProxies) > 0,
		TrustProxyConfig:             fiber.TrustProxyConfig{Proxies: cfg.SnapshotTrustedProxies},
		ProxyHeader:                  "X-Real-IP", EnableIPValidation: true,
		ErrorHandler: func(c fiber.Ctx, err error) error {
			// Native body-parser errors can lose the request path before Fiber
			// handles them. Never allow those failures to be cached either.
			snapshotHeaders(c)
			code, message := 500, "Internal server error"
			var e *fiber.Error
			if errors.As(err, &e) {
				code, message = e.Code, e.Message
			}
			return errorJSON(c, code, message)
		},
	})
	app.Get("/api/health", s.health)
	app.Get("/api/users/:user/albums", s.getUserAlbums)
	app.Get("/api/release-groups", s.getReleaseGroups)
	app.Use("/api/snapshots", s.snapshotGuard)
	app.Post("/api/snapshots", s.createSnapshot)
	app.Get("/api/snapshots/:id", s.readSnapshot)
	app.Head("/api/snapshots/:id", s.readSnapshot)
	app.Get("/api/snapshots/:id/image", s.readSnapshot)
	app.Head("/api/snapshots/:id/image", s.readSnapshot)
	app.Get("/api/snapshots/:id/download", s.readSnapshot)
	app.Head("/api/snapshots/:id/download", s.readSnapshot)
	app.Get("/api/snapshots/:id/management", s.manageSnapshot)
	app.Head("/api/snapshots/:id/management", s.manageSnapshot)
	app.Delete("/api/snapshots/:id", s.manageSnapshot)
	app.Get("/s/:id", s.viewSnapshot)
	app.Head("/s/:id", s.viewSnapshot)
	app.Use(func(c fiber.Ctx) error {
		if strings.HasPrefix(c.Path(), "/s/") {
			if c.Method() != "GET" && c.Method() != "HEAD" {
				c.Set("Allow", "GET, HEAD")
				return renderSnapshotPage(c, 405, snapshotPage{Title: "Method not allowed", Message: "Open this snapshot link in your browser."})
			}
			return unavailableSnapshotPage(c, 404)
		}
		return c.Next()
	})
	// Keep API misses in the JSON contract for every method and serving mode.
	app.Use(func(c fiber.Ctx) error {
		if c.Path() == "/api" || strings.HasPrefix(c.Path(), "/api/") {
			return errorJSON(c, fiber.StatusNotFound, "API route not found")
		}
		return c.Next()
	})
	return app
}

func (s *Server) health(c fiber.Ctx) error {
	return c.JSON(fiber.Map{"ok": true})
}

func (s *Server) getUserAlbums(c fiber.Ctx) error {
	user := c.Params("user")
	if decoded, err := url.PathUnescape(user); err == nil {
		user = decoded
	}
	user = strings.TrimSpace(user)
	if user == "" {
		return errorJSON(c, fiber.StatusBadRequest, "user is required")
	}
	if utf8.RuneCountInString(user) > 255 {
		return errorJSON(c, fiber.StatusBadRequest, "user exceeds 255 characters")
	}
	if strings.TrimSpace(s.lastfm.APIKey) == "" {
		return errorJSON(c, fiber.StatusServiceUnavailable, "LAST_FM_API_KEY is not set")
	}

	albums, err := s.lastfm.TopAlbums(c.Context(), user)
	if err != nil {
		if errors.Is(err, lastfm.ErrUserNotFound) {
			return errorJSON(c, fiber.StatusNotFound, "User "+user+" not found")
		}
		return errorJSON(c, fiber.StatusBadGateway, "Last.fm upstream failure")
	}
	return c.JSON(albums)
}

func (s *Server) getReleaseGroups(c fiber.Ctx) error {
	query := c.Query("query")

	releaseType := c.Query("type", "all")
	if !validReleaseType(releaseType) {
		return errorJSON(c, fiber.StatusBadRequest, "type must be all, album, ep, or single")
	}

	field := c.Query("field", "all")
	if !validField(field) {
		return errorJSON(c, fiber.StatusBadRequest, "field must be all, title, or artist")
	}

	limit, err := parseBoundedInt(c.Query("limit"), 25, 1, 100)
	if err != nil {
		return errorJSON(c, fiber.StatusBadRequest, "limit must be an integer from 1 to 100")
	}
	offset, err := parseBoundedInt(c.Query("offset"), 0, 0, -1)
	if err != nil {
		return errorJSON(c, fiber.StatusBadRequest, "offset must be an integer >= 0")
	}

	albums, err := s.musicbrainz.SearchReleaseGroups(c.Context(), musicbrainz.SearchOptions{
		Query:  query,
		Type:   releaseType,
		Field:  field,
		Limit:  limit,
		Offset: offset,
	})
	if err != nil {
		return errorJSON(c, fiber.StatusBadGateway, "MusicBrainz upstream failure")
	}
	return c.JSON(albums)
}

func parseBoundedInt(raw string, fallback, min, max int) (int, error) {
	if raw == "" {
		return fallback, nil
	}
	n, err := strconv.Atoi(raw)
	if err != nil {
		return 0, err
	}
	if n < min {
		return 0, strconv.ErrRange
	}
	if max >= min && n > max {
		return 0, strconv.ErrRange
	}
	return n, nil
}

func validReleaseType(v string) bool {
	switch v {
	case "all", "album", "ep", "single":
		return true
	}
	return false
}

func validField(v string) bool {
	switch v {
	case "all", "title", "artist":
		return true
	}
	return false
}

func errorJSON(c fiber.Ctx, status int, msg string) error {
	return c.Status(status).JSON(fiber.Map{"error": msg})
}
