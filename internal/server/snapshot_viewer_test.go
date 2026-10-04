package server

import (
	"bytes"
	"encoding/binary"
	"encoding/json"
	"html"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/dylanbr0wn/grid/internal/snapshot"
	"github.com/gofiber/fiber/v3"
)

func viewerRequest(t *testing.T, app *fiber.App, method, path string, status int) string {
	t.Helper()
	req := httptest.NewRequest(method, path, nil)
	req.Header.Set("If-None-Match", "*")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatal(err)
	}
	if resp.StatusCode != status || resp.Header.Get("Content-Type") != "text/html; charset=utf-8" {
		t.Fatalf("viewer: %d %s %s", resp.StatusCode, resp.Header.Get("Content-Type"), body)
	}
	for _, header := range []string{"Cache-Control", "CDN-Cache-Control", "Surrogate-Control"} {
		if !strings.Contains(resp.Header.Get(header), "no-store") {
			t.Fatalf("missing %s", header)
		}
	}
	if !strings.Contains(resp.Header.Get("X-Robots-Tag"), "noindex") || resp.Header.Get("Referrer-Policy") != "no-referrer" || !strings.Contains(resp.Header.Get("Content-Security-Policy"), "default-src 'none'") {
		t.Fatal("missing privacy/security headers")
	}
	if method == http.MethodHead && len(body) != 0 {
		t.Fatal("HEAD returned body")
	}
	return string(body)
}

func TestSnapshotViewerMetadataAndEscaping(t *testing.T) {
	t.Parallel()
	s := apiStore(t, t.TempDir(), 0)
	app := New(Config{Snapshots: s, SnapshotPublicOrigin: "https://grid.example"})
	title := `<script>alert("x")</script> & "albums"`
	data := apiPNG(t, 256, 512)
	p, err := s.Put(title, data)
	if err != nil {
		t.Fatal(err)
	}
	path := "/s/" + p.ID
	body := viewerRequest(t, app, "GET", "http://untrusted.example"+path+"?lastfm-user=private&token=never-echo", 200)
	for _, want := range []string{
		`<h1>` + html.EscapeString(title) + `</h1>`,
		`<meta property="og:title" content="` + html.EscapeString(title) + `">`,
		`<meta property="og:url" content="https://grid.example` + path + `">`,
		`<meta property="og:image" content="https://grid.example/api/snapshots/` + p.ID + `/image">`,
		`<meta name="twitter:image" content="https://grid.example/api/snapshots/` + p.ID + `/image">`,
		`<meta name="twitter:card" content="summary_large_image">`,
		`<meta property="og:image:width" content="256">`,
		`<meta property="og:image:height" content="512">`,
		`href="/api/snapshots/` + p.ID + `/download" download`,
	} {
		if !strings.Contains(body, want) {
			t.Errorf("missing %s in %s", want, body)
		}
	}
	for _, forbidden := range []string{"<script", "management", p.ManagementToken, "lastfm", "private", "never-echo", "untrusted.example", `id="root"`} {
		if strings.Contains(body, forbidden) {
			t.Errorf("viewer exposed %q", forbidden)
		}
	}
	viewerRequest(t, app, "HEAD", path, 200)
	for _, suffix := range []string{"image", "download"} {
		got := snapshotRequest(t, app, httptest.NewRequest("GET", "/api/snapshots/"+p.ID+"/"+suffix, nil), 200)
		if !bytes.Equal(got, data) {
			t.Fatal("stored image changed")
		}
	}
}

func TestSnapshotViewerFallbackAndDirectOrigin(t *testing.T) {
	t.Parallel()
	s := apiStore(t, t.TempDir(), 0)
	app := New(Config{Snapshots: s})
	for _, title := range []string{"", " \t\n"} {
		p, err := s.Put(title, apiPNG(t, 256, 256))
		if err != nil {
			t.Fatal(err)
		}
		req := httptest.NewRequest("GET", "http://localhost:8080/s/"+p.ID, nil)
		req.Header.Set("X-Forwarded-Host", "attacker.example")
		req.Header.Set("X-Forwarded-Proto", "https")
		resp, err := app.Test(req)
		if err != nil {
			t.Fatal(err)
		}
		body, _ := io.ReadAll(resp.Body)
		resp.Body.Close()
		if !bytes.Contains(body, []byte(`<h1>Shared album grid</h1>`)) || !bytes.Contains(body, []byte(`content="http://localhost:8080/s/`+p.ID+`"`)) || bytes.Contains(body, []byte("attacker.example")) {
			t.Fatalf("fallback/origin: %s", body)
		}
	}
}

func TestSnapshotViewerUnavailable(t *testing.T) {
	t.Parallel()
	dir := t.TempDir()
	s := apiStore(t, dir, 0)
	app := New(Config{Snapshots: s})
	p, err := s.Put("Private title", apiPNG(t, 256, 256))
	if err != nil {
		t.Fatal(err)
	}
	if err := s.Revoke(p.ID, p.ManagementToken); err != nil {
		t.Fatal(err)
	}
	for _, path := range []string{"/s/invalid", "/s/" + p.ID, "/s/", "/s/invalid/extra"} {
		body := viewerRequest(t, app, "GET", path, 404)
		if !strings.Contains(body, "expired, been revoked, or never existed") || strings.Contains(body, "og:image") || strings.Contains(body, "<img") || strings.Contains(body, "Private title") || strings.Contains(body, "Download PNG") {
			t.Fatalf("unavailable state: %s", body)
		}
		viewerRequest(t, app, "HEAD", path, 404)
	}
	viewerRequest(t, app, "POST", "/s/"+p.ID, 405)
	viewerRequest(t, New(Config{}), "GET", "/s/"+p.ID, 503)
	// A failed backing store must not publish stale metadata or image URLs.
	p, err = s.Put("Another private title", apiPNG(t, 256, 256))
	if err != nil {
		t.Fatal(err)
	}
	if err := os.Remove(filepath.Join(dir, p.ID+".snapshot")); err != nil {
		t.Fatal(err)
	}
	body := viewerRequest(t, app, "GET", "/s/"+p.ID, 503)
	if strings.Contains(body, "Another private title") || strings.Contains(body, "og:image") {
		t.Fatal("storage failure leaked stale metadata")
	}
}

func TestSnapshotViewerExpiredAfterRestart(t *testing.T) {
	t.Parallel()
	dir := t.TempDir()
	s := apiStore(t, dir, 0)
	p, err := s.Put("Expired private title", apiPNG(t, 256, 256))
	if err != nil {
		t.Fatal(err)
	}
	if err := s.Close(); err != nil {
		t.Fatal(err)
	}
	// Age a stopped version-1 fixture before startup cleanup. Store tests also
	// verify rejection at the exact expiry boundary before cleanup runs.
	path := filepath.Join(dir, p.ID+".snapshot")
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	length := binary.BigEndian.Uint32(data[:4])
	var header map[string]any
	if err := json.Unmarshal(data[4:4+length], &header); err != nil {
		t.Fatal(err)
	}
	expiry := time.Now().UTC().Add(-time.Hour)
	header["createdAt"], header["expiresAt"] = expiry.Add(-snapshot.Retention), expiry
	aged, err := json.Marshal(header)
	if err != nil {
		t.Fatal(err)
	}
	prefix := make([]byte, 4)
	binary.BigEndian.PutUint32(prefix, uint32(len(aged)))
	if err := os.WriteFile(path, append(append(prefix, aged...), data[4+length:]...), 0600); err != nil {
		t.Fatal(err)
	}
	s = apiStore(t, dir, 0)
	app := New(Config{Snapshots: s})
	body := viewerRequest(t, app, "GET", "/s/"+p.ID, 404)
	if strings.Contains(body, "Expired private title") || strings.Contains(body, "og:image") || strings.Contains(body, "<img") {
		t.Fatal("expired snapshot exposed stale data")
	}
	for _, suffix := range []string{"image", "download"} {
		snapshotRequest(t, app, httptest.NewRequest("GET", "/api/snapshots/"+p.ID+"/"+suffix, nil), 404)
	}
}
