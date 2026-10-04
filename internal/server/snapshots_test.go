package server

import (
	"bufio"
	"bytes"
	"crypto/rand"
	"encoding/base64"
	"encoding/binary"
	"encoding/json"
	"fmt"
	"image"
	"image/png"
	"io"
	"mime/multipart"
	"net"
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

func apiPNG(t *testing.T, width, height int) []byte {
	t.Helper()
	var buf bytes.Buffer
	if err := png.Encode(&buf, image.NewNRGBA(image.Rect(0, 0, width, height))); err != nil {
		t.Fatal(err)
	}
	return buf.Bytes()
}
func apiKey(t *testing.T, stamp time.Time) string {
	t.Helper()
	b := make([]byte, 40)
	binary.BigEndian.PutUint64(b, uint64(stamp.Unix()))
	if _, err := rand.Read(b[8:]); err != nil {
		t.Fatal(err)
	}
	return base64.RawURLEncoding.EncodeToString(b)
}
func apiStore(t *testing.T, dir string, capacity int64) *snapshot.Store {
	t.Helper()
	s, err := snapshot.Open(snapshot.Config{Directory: dir, Capacity: capacity})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { s.Close() })
	return s
}
func uploadRequest(t *testing.T, data []byte, title, key string) *http.Request {
	t.Helper()
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	if err := writer.WriteField("title", title); err != nil {
		t.Fatal(err)
	}
	part, err := writer.CreateFormFile("image", "grid.png")
	if err != nil {
		t.Fatal(err)
	}
	part.Write(data)
	writer.Close()
	req := httptest.NewRequest("POST", "/api/snapshots", &body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	req.Header.Set("Idempotency-Key", key)
	return req
}
func snapshotRequest(t *testing.T, app *fiber.App, req *http.Request, status int) []byte {
	t.Helper()
	var resp *http.Response
	var err error
	if req.ContentLength > snapshotBodyLimit {
		recorder := httptest.NewRecorder()
		HTTPHandler(app).ServeHTTP(recorder, req)
		resp = recorder.Result()
	} else {
		resp, err = app.Test(req, fiber.TestConfig{Timeout: 10 * time.Second})
	}
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatal(err)
	}
	if resp.StatusCode != status {
		t.Fatalf("%s %s status %d want %d: %s", req.Method, req.URL.Path, resp.StatusCode, status, body)
	}
	for _, header := range []string{"Cache-Control", "CDN-Cache-Control", "Surrogate-Control"} {
		if !strings.Contains(resp.Header.Get(header), "no-store") {
			t.Fatalf("cache header missing on %d: %s", status, header)
		}
	}
	if resp.Header.Get("Referrer-Policy") != "no-referrer" || !strings.Contains(resp.Header.Get("X-Robots-Tag"), "noindex") {
		t.Fatal("privacy headers missing")
	}
	if status >= 400 {
		var envelope map[string]string
		if err := json.Unmarshal(body, &envelope); err != nil || envelope["error"] == "" {
			t.Fatalf("error envelope: %s", body)
		}
	}
	return body
}
func publishAPI(t *testing.T, app *fiber.App, data []byte, title, key string) snapshot.Publication {
	t.Helper()
	body := snapshotRequest(t, app, uploadRequest(t, data, title, key), 201)
	var p snapshot.Publication
	if err := json.Unmarshal(body, &p); err != nil {
		t.Fatal(err)
	}
	var fields map[string]any
	json.Unmarshal(body, &fields)
	if fields["publicUrl"] != "/s/"+p.ID || fields["managementUrl"] != "/manage/"+p.ID+"#token="+p.ManagementToken {
		t.Fatalf("wrong URLs: %s", body)
	}
	return p
}
func authorizedRequest(method, path, token string) *http.Request {
	req := httptest.NewRequest(method, path, nil)
	req.Header.Set("Authorization", "Bearer "+token)
	return req
}

func TestSnapshotAPIRecoveryAndLifecycle(t *testing.T) {
	dir := t.TempDir()
	data := apiPNG(t, 256, 512)
	key := apiKey(t, time.Now())
	s := apiStore(t, dir, int64(len(data)))
	app := New(Config{Snapshots: s})
	title := `<script>alert("title")</script> & albums`
	p := publishAPI(t, app, data, title, key)
	if p.Title != title || p.ExpiresAt.Sub(p.CreatedAt) != snapshot.Retention {
		t.Fatal("metadata changed")
	}
	public := snapshotRequest(t, app, httptest.NewRequest("GET", "/api/snapshots/"+p.ID, nil), 200)
	if bytes.Contains(public, []byte("<script>")) || bytes.Contains(public, []byte("management")) || bytes.Contains(public, []byte(p.ManagementToken)) {
		t.Fatal("unsafe public metadata")
	}
	for _, suffix := range []string{"/image", "/download"} {
		req := httptest.NewRequest("GET", "/api/snapshots/"+p.ID+suffix, nil)
		req.Header.Set("If-None-Match", "*")
		req.Header.Set("Range", "bytes=0-3")
		body := snapshotRequest(t, app, req, 200)
		if !bytes.Equal(body, data) {
			t.Fatal("image changed")
		}
		resp, err := app.Test(httptest.NewRequest("HEAD", req.URL.Path, nil))
		if err != nil {
			t.Fatal(err)
		}
		resp.Body.Close()
		if resp.StatusCode != 200 || resp.Header.Get("Content-Type") != "image/png" {
			t.Fatalf("HEAD/image type: %d %q", resp.StatusCode, resp.Header.Get("Content-Type"))
		}
		if suffix == "/download" && !strings.Contains(resp.Header.Get("Content-Disposition"), "attachment;") {
			t.Fatal("download is not an attachment")
		}
	}
	for _, token := range []string{"", p.ID, strings.Repeat("a", 43)} {
		snapshotRequest(t, app, authorizedRequest("GET", "/api/snapshots/"+p.ID+"/management", token), 404)
		snapshotRequest(t, app, authorizedRequest("DELETE", "/api/snapshots/"+p.ID, token), 404)
	}
	req := httptest.NewRequest("DELETE", "/api/snapshots/"+p.ID+"?token="+p.ManagementToken, nil)
	snapshotRequest(t, app, req, 404)
	status := snapshotRequest(t, app, authorizedRequest("GET", "/api/snapshots/"+p.ID+"/management", p.ManagementToken), 200)
	if !bytes.Contains(status, []byte(`"status":"active"`)) || bytes.Contains(status, []byte(p.ManagementToken)) {
		t.Fatal("management status")
	}
	s.Close()
	s = apiStore(t, dir, int64(len(data)))
	app = New(Config{Snapshots: s})
	if got := publishAPI(t, app, data, title, key); got != p {
		t.Fatal("restart lost credentials or duplicated")
	}
	snapshotRequest(t, app, uploadRequest(t, data, "different", key), 409)
	snapshotRequest(t, app, uploadRequest(t, append(data, 0), title, key), 409)
	snapshotRequest(t, app, uploadRequest(t, data, "another", apiKey(t, time.Now())), 507)
	snapshotRequest(t, app, authorizedRequest("DELETE", "/api/snapshots/"+p.ID, p.ManagementToken), 204)
	snapshotRequest(t, app, authorizedRequest("DELETE", "/api/snapshots/"+p.ID, p.ManagementToken), 204)
	status = snapshotRequest(t, app, authorizedRequest("GET", "/api/snapshots/"+p.ID+"/management", p.ManagementToken), 200)
	if !bytes.Contains(status, []byte(`"status":"revoked"`)) {
		t.Fatal("revoked status")
	}
	for _, suffix := range []string{"", "/image", "/download"} {
		snapshotRequest(t, app, httptest.NewRequest("GET", "/api/snapshots/"+p.ID+suffix, nil), 404)
	}
	s.Close()
	s = apiStore(t, dir, int64(len(data)))
	app = New(Config{Snapshots: s})
	snapshotRequest(t, app, uploadRequest(t, data, title, key), 410)
	publishAPI(t, app, data, "replacement", apiKey(t, time.Now()))
}

func TestSnapshotAPIUploadValidation(t *testing.T) {
	data := apiPNG(t, 256, 256)
	cases := []struct {
		name       string
		data       []byte
		title, key string
		status     int
	}{
		{"invalid PNG", []byte("remote-image-url"), "", "", 400},
		{"truncated PNG", data[:len(data)/2], "", "", 400},
		{"non-grid dimensions", apiPNG(t, 257, 256), "", "", 400},
		{"too small", apiPNG(t, 128, 128), "", "", 400},
		{"too wide", apiPNG(t, 2816, 256), "", "", 400},
		{"long title", data, strings.Repeat("x", 201), "", 400},
		{"invalid UTF8 title", data, string([]byte{0xff}), "", 400},
		{"bad key", data, "", "bad", 400},
		{"old key", data, "", apiKey(t, time.Now().Add(-snapshot.RetryWindow)), 410},
		{"future key", data, "", apiKey(t, time.Now().Add(snapshot.ClockSkew+time.Minute)), 400},
		{"image oversized", bytes.Repeat([]byte("x"), snapshot.MaxImageBytes+1), "", "", 413},
		{"body oversized", bytes.Repeat([]byte("x"), snapshotBodyLimit+1), "", "", 413},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			app := New(Config{Snapshots: apiStore(t, t.TempDir(), 0)})
			key := tc.key
			if key == "" {
				key = apiKey(t, time.Now())
			}
			snapshotRequest(t, app, uploadRequest(t, tc.data, tc.title, key), tc.status)
		})
	}
	app := New(Config{Snapshots: apiStore(t, t.TempDir(), 0), SnapshotUploadsPerIP: 30})
	for _, width := range []int{256, 1280, 2560} {
		publishAPI(t, app, apiPNG(t, width, 256), strings.Repeat("界", 200), apiKey(t, time.Now()))
	}
	req := uploadRequest(t, data, "", apiKey(t, time.Now()))
	req.Header.Set("Content-Encoding", "gzip")
	snapshotRequest(t, app, req, 415)
	req = httptest.NewRequest("POST", "/api/snapshots", strings.NewReader(`{"image":"https://remote.test/cover.png"}`))
	req.Header.Set("Content-Type", "application/json")
	snapshotRequest(t, app, req, 400)
	var body bytes.Buffer
	w := multipart.NewWriter(&body)
	w.WriteField("image", "invalid")
	w.WriteField("image", "duplicate")
	w.Close()
	req = httptest.NewRequest("POST", "/api/snapshots", &body)
	req.Header.Set("Content-Type", w.FormDataContentType())
	snapshotRequest(t, app, req, 400)
	snapshotRequest(t, app, uploadRequest(t, data, "", ""), 400)
}

func TestSnapshotAPIExpiredAfterRestart(t *testing.T) {
	dir := t.TempDir()
	s := apiStore(t, dir, 0)
	p, err := s.Put("expired", apiPNG(t, 256, 256))
	if err != nil {
		t.Fatal(err)
	}
	s.Close()
	path := filepath.Join(dir, p.ID+".snapshot")
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	size := binary.BigEndian.Uint32(data[:4])
	var header map[string]any
	json.Unmarshal(data[4:4+size], &header)
	header["createdAt"] = time.Now().Add(-snapshot.Retention - time.Minute).UTC()
	header["expiresAt"] = header["createdAt"].(time.Time).Add(snapshot.Retention)
	encoded, _ := json.Marshal(header)
	var prefix [4]byte
	binary.BigEndian.PutUint32(prefix[:], uint32(len(encoded)))
	record := append(prefix[:], encoded...)
	record = append(record, data[4+size:]...)
	if err := os.WriteFile(path, record, 0600); err != nil {
		t.Fatal(err)
	}
	app := New(Config{Snapshots: apiStore(t, dir, 0)})
	for _, suffix := range []string{"", "/image", "/download"} {
		snapshotRequest(t, app, httptest.NewRequest("GET", "/api/snapshots/"+p.ID+suffix, nil), 404)
	}
	snapshotRequest(t, app, authorizedRequest("GET", "/api/snapshots/"+p.ID+"/management", p.ManagementToken), 404)
}

func TestSnapshotAPIRateLimitDoesNotTrustSpoofedHeaders(t *testing.T) {
	app := New(Config{Snapshots: apiStore(t, t.TempDir(), 0), SnapshotUploadsPerIP: 1, SnapshotUploadsGlobal: 10})
	data := apiPNG(t, 256, 256)
	publishAPI(t, app, data, "", apiKey(t, time.Now()))
	req := uploadRequest(t, data, "", apiKey(t, time.Now()))
	req.Header.Set("X-Forwarded-For", "203.0.113.2")
	req.Header.Set("X-Real-IP", "203.0.113.2")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatal(err)
	}
	resp.Body.Close()
	if resp.StatusCode != 429 || resp.Header.Get("Retry-After") == "" {
		t.Fatal("spoofed headers bypassed limit")
	}
	limiter := newUploadLimiter(2, 3)
	now := time.Now()
	limiter.now = func() time.Time { return now }
	if limiter.allow("one") != 0 || limiter.allow("one") != 0 || limiter.allow("one") == 0 || limiter.allow("two") != 0 || limiter.allow("three") == 0 {
		t.Fatal("IP/global limit")
	}
	now = now.Add(time.Hour)
	if limiter.allow("one") != 0 || len(limiter.ips) != 1 {
		t.Fatal("window did not reset")
	}
}

func TestSnapshotAPIDisabledAndFenced(t *testing.T) {
	snapshotRequest(t, New(Config{}), httptest.NewRequest("GET", "/api/snapshots/anything", nil), 503)
	s := apiStore(t, t.TempDir(), 0)
	s.Close()
	app := New(Config{Snapshots: s})
	snapshotRequest(t, app, uploadRequest(t, apiPNG(t, 256, 256), "", apiKey(t, time.Now())), 503)
	snapshotRequest(t, app, httptest.NewRequest("GET", "/api/snapshots/"+strings.Repeat("a", 32)+"/image", nil), 503)
}

func TestSnapshotHTTPAdapterBoundsUnknownLengthBodies(t *testing.T) {
	app := New(Config{Snapshots: apiStore(t, t.TempDir(), 0)})
	for _, length := range []int64{-1, int64(snapshotBodyLimit + 1)} {
		req := httptest.NewRequest("POST", "/api/snapshots", bytes.NewReader(make([]byte, snapshotBodyLimit+1)))
		req.ContentLength = length
		recorder := httptest.NewRecorder()
		HTTPHandler(app).ServeHTTP(recorder, req)
		if recorder.Code != 413 || !strings.Contains(recorder.Header().Get("Cache-Control"), "no-store") {
			t.Fatal("unbounded or cached adapter response")
		}
		var envelope map[string]string
		if err := json.Unmarshal(recorder.Body.Bytes(), &envelope); err != nil || envelope["error"] == "" {
			t.Fatal("plain-text adapter failure")
		}
	}
}

func TestSnapshotNativeListenerBodyLimit(t *testing.T) {
	app := New(Config{Snapshots: apiStore(t, t.TempDir(), 0)})
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	done := make(chan error, 1)
	go func() { done <- app.Listener(listener, fiber.ListenConfig{DisableStartupMessage: true}) }()
	t.Cleanup(func() {
		app.ShutdownWithTimeout(5 * time.Second)
		if err := <-done; err != nil {
			t.Error(err)
		}
	})
	for _, chunked := range []bool{false, true} {
		conn, err := net.Dial("tcp", listener.Addr().String())
		if err != nil {
			t.Fatal(err)
		}
		conn.SetDeadline(time.Now().Add(10 * time.Second))
		headers := fmt.Sprintf("Content-Length: %d\r\n", snapshotBodyLimit+1)
		body := ""
		if chunked {
			headers = "Transfer-Encoding: chunked\r\n"
			body = fmt.Sprintf("%x\r\n", snapshotBodyLimit+1)
		}
		// Announce an oversized body/chunk. The parser must reject its length
		// before buffering it, so no concurrent uploader can obscure the response.
		fmt.Fprintf(conn, "POST /api/snapshots HTTP/1.1\r\nHost: localhost\r\n%sConnection: close\r\n\r\n%s", headers, body)
		resp, err := http.ReadResponse(bufio.NewReader(conn), nil)
		if err != nil {
			conn.Close()
			t.Fatal(err)
		}
		responseBody, _ := io.ReadAll(resp.Body)
		resp.Body.Close()
		conn.Close()
		if resp.StatusCode != 413 || !strings.Contains(resp.Header.Get("Cache-Control"), "no-store") {
			t.Fatalf("native body limit: %d %s", resp.StatusCode, responseBody)
		}
		var envelope map[string]string
		if err := json.Unmarshal(responseBody, &envelope); err != nil || envelope["error"] == "" {
			t.Fatalf("native envelope: %s", responseBody)
		}
	}

}

func TestSnapshotTrustedProxyUsesOnlySanitizedSingleIP(t *testing.T) {
	app := New(Config{Snapshots: apiStore(t, t.TempDir(), 0), SnapshotUploadsPerIP: 1, SnapshotTrustedProxies: []string{"192.0.2.0/24"}})
	data := apiPNG(t, 256, 256)
	handler := HTTPHandler(app)
	for i, ip := range []string{"203.0.113.1", "203.0.113.2", "203.0.113.1"} {
		req := uploadRequest(t, data, "", apiKey(t, time.Now()))
		req.RemoteAddr = "192.0.2.1:1234"
		req.Header.Set("X-Real-IP", ip)
		recorder := httptest.NewRecorder()
		handler.ServeHTTP(recorder, req)
		want := 201
		if i == 2 {
			want = 429
		}
		if recorder.Code != want {
			t.Fatalf("proxy IP %s: %d %s", ip, recorder.Code, recorder.Body.String())
		}
	}
}
