package server

import (
	"bytes"
	"encoding/base64"
	"errors"
	"image/png"
	"io"
	"mime"
	"mime/multipart"
	"strconv"
	"strings"
	"sync"
	"time"
	"unicode/utf8"

	"github.com/dylanbr0wn/grid/internal/snapshot"
	"github.com/gofiber/fiber/v3"
)

const snapshotBodyLimit = snapshot.MaxImageBytes + 16_384

var snapshotResponseHeaders = map[string]string{
	"Cache-Control":          "private, no-store, max-age=0",
	"CDN-Cache-Control":      "no-store",
	"Surrogate-Control":      "no-store",
	"Referrer-Policy":        "no-referrer",
	"X-Robots-Tag":           "noindex, nofollow, noarchive",
	"X-Content-Type-Options": "nosniff",
}

func snapshotHeaders(c fiber.Ctx) {
	for name, value := range snapshotResponseHeaders {
		c.Set(name, value)
	}
}

func (s *Server) snapshotGuard(c fiber.Ctx) error {
	snapshotHeaders(c)
	if s.snapshots == nil {
		return errorJSON(c, 503, "Snapshot sharing is unavailable")
	}
	return c.Next()
}

func (s *Server) createSnapshot(c fiber.Ctx) error {
	if wait := s.uploads.allow(c.IP()); wait > 0 {
		c.Set("Retry-After", strconv.Itoa(wait))
		return errorJSON(c, 429, "Too many publication attempts. Try again after the Retry-After delay with the same publication key.")
	}
	// Reject encodings before Body can decompress them. Only raw multipart PNG uploads are accepted.
	if c.Get("Content-Encoding") != "" {
		return errorJSON(c, 415, "Encoded request bodies are not supported")
	}
	if len(c.Request().Body()) > snapshotBodyLimit {
		return errorJSON(c, 413, "Upload exceeds the request size limit")
	}
	title, image, err := readSnapshotUpload(c.Get("Content-Type"), c.Request().Body())
	if err != nil {
		return errorJSON(c, 400, err.Error())
	}
	if len(image) > snapshot.MaxImageBytes {
		return errorJSON(c, 413, "PNG exceeds 10,000,000 bytes")
	}
	cfg, err := png.DecodeConfig(bytes.NewReader(image))
	if err != nil || cfg.Width < 256 || cfg.Height < 256 || cfg.Width > 2560 || cfg.Height > 2560 || cfg.Width%256 != 0 || cfg.Height%256 != 0 {
		return errorJSON(c, 400, "PNG dimensions must be 256 times 1–10 columns and rows")
	}
	p, err := s.snapshots.PutWithKey(title, image, c.Get("Idempotency-Key"))
	if err != nil {
		return snapshotError(c, err)
	}
	c.Set("Location", "/api/snapshots/"+p.ID)
	return c.Status(201).JSON(fiber.Map{
		"id": p.ID, "title": p.Title, "createdAt": p.CreatedAt, "expiresAt": p.ExpiresAt, "imageBytes": p.ImageBytes,
		"publicUrl": "/s/" + p.ID, "imageUrl": "/api/snapshots/" + p.ID + "/image", "downloadUrl": "/api/snapshots/" + p.ID + "/download",
		"managementToken": p.ManagementToken, "managementUrl": "/manage/" + p.ID + "#token=" + p.ManagementToken,
	})
}

func readSnapshotUpload(contentType string, body []byte) (string, []byte, error) {
	kind, params, err := mime.ParseMediaType(contentType)
	if err != nil || kind != "multipart/form-data" || params["boundary"] == "" {
		return "", nil, errors.New("Expected multipart/form-data with image and optional title")
	}
	reader := multipart.NewReader(bytes.NewReader(body), params["boundary"])
	var title string
	var image []byte
	seen := make(map[string]bool)
	for {
		part, err := reader.NextPart()
		if err == io.EOF {
			break
		}
		if err != nil {
			return "", nil, errors.New("Invalid multipart body")
		}
		name := part.FormName()
		if seen[name] || (name != "title" && name != "image") {
			part.Close()
			return "", nil, errors.New("Only one image and one optional title are accepted")
		}
		seen[name] = true
		limit := int64(snapshot.MaxImageBytes + 1)
		if name == "title" {
			limit = 801
		}
		data, err := io.ReadAll(io.LimitReader(part, limit))
		part.Close()
		if err != nil {
			return "", nil, errors.New("Invalid upload part")
		}
		if name == "title" {
			title = string(data)
			if !utf8.ValidString(title) || utf8.RuneCountInString(title) > 200 {
				return "", nil, snapshot.ErrTitle
			}
		} else {
			image = data
		}
	}
	if len(image) == 0 {
		return "", nil, errors.New("A finished PNG image is required")
	}
	return title, image, nil
}

func (s *Server) readSnapshot(c fiber.Ctx) error {
	id := c.Params("id")
	if !validPublicID(id) {
		return snapshotError(c, snapshot.ErrNotFound)
	}
	meta, image, err := s.snapshots.Get(id)
	if err != nil {
		return snapshotError(c, err)
	}
	if strings.HasSuffix(c.Route().Path, "/image") || strings.HasSuffix(c.Route().Path, "/download") {
		c.Set("Content-Type", "image/png")
		if strings.HasSuffix(c.Route().Path, "/download") {
			c.Set("Content-Disposition", `attachment; filename="grid-`+id+`.png"`)
		}
		return c.Send(image)
	}
	return c.JSON(meta)
}

func (s *Server) manageSnapshot(c fiber.Ctx) error {
	id, token := c.Params("id"), strings.TrimPrefix(c.Get("Authorization"), "Bearer ")
	if !validPublicID(id) || c.Get("Authorization") != "Bearer "+token || !validToken(token) {
		return errorJSON(c, 404, "Snapshot or management credential not found")
	}
	if c.Method() == "DELETE" {
		if err := s.snapshots.Revoke(id, token); err != nil {
			return snapshotError(c, err)
		}
		return c.SendStatus(204)
	}
	meta, status, err := s.snapshots.Manage(id, token)
	if err != nil {
		return snapshotError(c, err)
	}
	return c.JSON(fiber.Map{"snapshot": meta, "status": status})
}

func snapshotError(c fiber.Ctx, err error) error {
	switch {
	case errors.Is(err, snapshot.ErrNotFound), errors.Is(err, snapshot.ErrUnauthorized):
		return errorJSON(c, 404, "Snapshot or management credential not found")
	case errors.Is(err, snapshot.ErrGone):
		return errorJSON(c, 410, "Publication was revoked, expired, or its creation window has closed. Do not retry with a new key automatically.")
	case errors.Is(err, snapshot.ErrConflict):
		return errorJSON(c, 409, "Publication key was already used with different content")
	case errors.Is(err, snapshot.ErrKey), errors.Is(err, snapshot.ErrTitle), errors.Is(err, snapshot.ErrImage):
		return errorJSON(c, 400, err.Error())
	case errors.Is(err, snapshot.ErrCapacity):
		return errorJSON(c, 507, "Snapshot storage is full. Try again later with the same publication key.")
	default:
		return errorJSON(c, 503, "Snapshot storage is unavailable. Publication outcome may be unknown; retry only with the same publication key after recovery.")
	}
}

func validPublicID(id string) bool { return canonicalSecret(id, 24) }
func validToken(token string) bool { return canonicalSecret(token, 32) }
func canonicalSecret(s string, size int) bool {
	b, err := base64.RawURLEncoding.DecodeString(s)
	return err == nil && len(b) == size && base64.RawURLEncoding.EncodeToString(b) == s
}

// Fixed one-hour windows, with bounded state. All attempts count, including retries.
// The global ceiling limits both expensive decoding and the size of the IP map.
type uploadWindow struct {
	start time.Time
	count int
}
type uploadLimiter struct {
	mu            sync.Mutex
	perIP, global int
	total         uploadWindow
	ips           map[string]int
	now           func() time.Time
}

func newUploadLimiter(perIP, global int) *uploadLimiter {
	if perIP <= 0 {
		perIP = 10
	}
	if global <= 0 {
		global = 120
	}
	return &uploadLimiter{perIP: perIP, global: global, ips: make(map[string]int), now: time.Now}
}
func (l *uploadLimiter) allow(ip string) int {
	l.mu.Lock()
	defer l.mu.Unlock()
	now := l.now()
	if l.total.start.IsZero() || !now.Before(l.total.start.Add(time.Hour)) {
		l.total = uploadWindow{start: now}
		l.ips = make(map[string]int)
	}
	if l.total.count >= l.global || l.ips[ip] >= l.perIP {
		return max(1, int(l.total.start.Add(time.Hour).Sub(now).Seconds())+1)
	}
	l.total.count++
	l.ips[strings.Clone(ip)]++
	return 0
}
