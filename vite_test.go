package main

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/dylanbr0wn/grid/internal/server"
)

func TestDevHandlerProxiesNonAPIToVite(t *testing.T) {
	t.Parallel()

	var gotPath string
	vite := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotPath = r.URL.Path
		_, _ = w.Write([]byte("vite:" + r.URL.Path))
	}))
	t.Cleanup(vite.Close)

	proxy, err := newViteProxy(vite.URL)
	if err != nil {
		t.Fatal(err)
	}
	h := devHandler(server.New(server.Config{}), proxy)

	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/someuser", nil))
	if rec.Code != http.StatusOK {
		t.Fatalf("status %d body %s", rec.Code, rec.Body.Bytes())
	}
	if rec.Body.String() != "vite:/someuser" {
		t.Fatalf("body %q", rec.Body.String())
	}
	if gotPath != "/someuser" {
		t.Fatalf("vite path %q", gotPath)
	}
}

func TestDevHandlerKeepsAPIOnFiber(t *testing.T) {
	t.Parallel()

	called := false
	vite := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		t.Errorf("vite should not see API path %s", r.URL.Path)
	}))
	t.Cleanup(vite.Close)

	proxy, err := newViteProxy(vite.URL)
	if err != nil {
		t.Fatal(err)
	}
	h := devHandler(server.New(server.Config{}), proxy)

	t.Run("health", func(t *testing.T) {
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/health", nil))
		if rec.Code != http.StatusOK {
			t.Fatalf("status %d body %s", rec.Code, rec.Body.Bytes())
		}
		var payload map[string]any
		if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
			t.Fatal(err)
		}
		if payload["ok"] != true {
			t.Fatalf("payload %v", payload)
		}
	})

	t.Run("unknown api is not proxied", func(t *testing.T) {
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/does-not-exist", nil))
		if rec.Code != http.StatusNotFound {
			t.Fatalf("status %d body %s", rec.Code, rec.Body.Bytes())
		}
	})

	if called {
		t.Fatal("vite was called for an API path")
	}
}

func TestDevHandlerViteDownIs502(t *testing.T) {
	t.Parallel()

	proxy, err := newViteProxy("http://127.0.0.1:1")
	if err != nil {
		t.Fatal(err)
	}
	h := devHandler(server.New(server.Config{}), proxy)

	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/", nil))
	if rec.Code != http.StatusBadGateway {
		t.Fatalf("status %d body %s", rec.Code, rec.Body.Bytes())
	}
	if !strings.Contains(rec.Body.String(), "pnpm --filter web dev") {
		t.Fatalf("body %q", rec.Body.String())
	}
}

func TestDevHandlerKeepsSnapshotViewerOnFiber(t *testing.T) {
	t.Parallel()
	vite := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		io.WriteString(w, "vite:"+r.URL.RequestURI())
	})
	h := devHandler(server.New(server.Config{}), vite)
	for _, path := range []string{"/s/unknown", "/s/", "/s/unknown/extra"} {
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, httptest.NewRequest("GET", path, nil))
		if !strings.Contains(rec.Body.String(), "Snapshot unavailable") || strings.Contains(rec.Body.String(), "vite:") || !strings.Contains(rec.Header().Get("Cache-Control"), "no-store") {
			t.Fatalf("viewer proxied: %s", rec.Body.String())
		}
	}
	for _, path := range []string{"/someuser", "/s", "/?lastfm-user=someuser"} {
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, httptest.NewRequest("GET", path, nil))
		if rec.Body.String() != "vite:"+path {
			t.Fatalf("editor route intercepted: %s", rec.Body.String())
		}
	}
}

func TestNewViteProxyRejectsInvalidOrigin(t *testing.T) {
	t.Parallel()

	_, err := newViteProxy("not-a-url")
	if err == nil {
		t.Fatal("expected error")
	}
}

func TestIsAPIPath(t *testing.T) {
	t.Parallel()

	cases := map[string]bool{
		"/api":          true,
		"/api/":         true,
		"/api/health":   true,
		"/apiculture":   false,
		"/":             false,
		"/someuser":     false,
		"/@vite/client": false,
	}
	for path, want := range cases {
		if got := isAPIPath(path); got != want {
			t.Errorf("%s: got %v want %v", path, got, want)
		}
	}
}

func TestDevHandlerHijacksWebSocket(t *testing.T) {
	t.Parallel()

	viteUpgraded := make(chan struct{}, 1)
	vite := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Upgrade") != "websocket" {
			http.Error(w, "expected websocket", http.StatusBadRequest)
			return
		}
		hj, ok := w.(http.Hijacker)
		if !ok {
			http.Error(w, "no hijack", http.StatusInternalServerError)
			return
		}
		conn, bufrw, err := hj.Hijack()
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		defer conn.Close()
		_, _ = bufrw.WriteString("HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n\r\n")
		_ = bufrw.Flush()
		viteUpgraded <- struct{}{}
		buf := make([]byte, 4)
		_, _ = bufrw.Read(buf)
		_, _ = bufrw.Write(buf)
		_ = bufrw.Flush()
	}))
	t.Cleanup(vite.Close)

	proxy, err := newViteProxy(vite.URL)
	if err != nil {
		t.Fatal(err)
	}
	srv := httptest.NewServer(devHandler(server.New(server.Config{}), proxy))
	t.Cleanup(srv.Close)

	req, err := http.NewRequest(http.MethodGet, srv.URL+"/@vite/ws", nil)
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Connection", "Upgrade")
	req.Header.Set("Upgrade", "websocket")
	req.Header.Set("Sec-WebSocket-Version", "13")
	req.Header.Set("Sec-WebSocket-Key", "dGhlIHNhbXBsZSBub25jZQ==")

	resp, err := http.DefaultTransport.RoundTrip(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusSwitchingProtocols {
		body, _ := io.ReadAll(resp.Body)
		t.Fatalf("status %d body %s", resp.StatusCode, body)
	}

	select {
	case <-viteUpgraded:
	case <-time.After(2 * time.Second):
		t.Fatal("vite did not receive websocket upgrade")
	}
}

func TestDevHandlerForwardsUpgradeHeader(t *testing.T) {
	t.Parallel()

	var gotUpgrade, gotConnection string
	vite := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotUpgrade = r.Header.Get("Upgrade")
		gotConnection = r.Header.Get("Connection")
		_, _ = w.Write([]byte("ok"))
	}))
	t.Cleanup(vite.Close)

	proxy, err := newViteProxy(vite.URL)
	if err != nil {
		t.Fatal(err)
	}
	h := devHandler(server.New(server.Config{}), proxy)

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("Connection", "Upgrade")
	req.Header.Set("Upgrade", "websocket")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if gotUpgrade != "websocket" {
		t.Fatalf("upgrade %q", gotUpgrade)
	}
	if !strings.Contains(strings.ToLower(gotConnection), "upgrade") {
		t.Fatalf("connection %q", gotConnection)
	}
}

func TestDevHandlerDoesNotRequireSPABuild(t *testing.T) {
	t.Parallel()

	vite := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = io.WriteString(w, "ok")
	}))
	t.Cleanup(vite.Close)

	proxy, err := newViteProxy(vite.URL)
	if err != nil {
		t.Fatal(err)
	}
	h := devHandler(server.New(server.Config{}), proxy)

	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/", nil))
	if rec.Code != http.StatusOK || rec.Body.String() != "ok" {
		t.Fatalf("status %d body %s", rec.Code, rec.Body.Bytes())
	}
}
