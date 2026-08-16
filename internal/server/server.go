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
	"github.com/gofiber/fiber/v3"
)

type Config struct {
	LastFMAPIKey       string
	LastFMBaseURL      string
	MusicBrainzBaseURL string
	MusicBrainzUA      string
	HTTPClient         *http.Client
}

type Server struct {
	lastfm      *lastfm.Client
	musicbrainz *musicbrainz.Client
}

func New(cfg Config) *fiber.App {
	httpClient := cfg.HTTPClient
	if httpClient == nil {
		httpClient = &http.Client{Timeout: 15 * time.Second}
	}

	s := &Server{
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

	app := fiber.New()
	app.Get("/api/health", s.health)
	app.Get("/api/users/:user/albums", s.getUserAlbums)
	app.Get("/api/release-groups", s.getReleaseGroups)
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
