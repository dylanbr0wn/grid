package main

import (
	"io"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/dylanbr0wn/grid/internal/server"
)

func TestSPAServesAssetsRoutesAndKeepsAPIResponses(t *testing.T) {
	t.Parallel()
	dir := t.TempDir()
	for name, body := range map[string]string{
		"index.html":    "<!doctype html><div id=\"root\">Grid</div>",
		"assets/app.js": "console.log('grid')",
	} {
		path := filepath.Join(dir, name)
		if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(path, []byte(body), 0644); err != nil {
			t.Fatal(err)
		}
	}
	if err := requireSPA(dir); err != nil {
		t.Fatal(err)
	}
	app := server.New(server.Config{})
	registerSPA(app, dir)
	for _, tc := range []struct {
		path   string
		status int
		body   string
	}{
		{"/", 200, "<div id=\"root\">Grid</div>"},
		{"/someuser", 200, "<div id=\"root\">Grid</div>"},
		{"/nested/route", 200, "<div id=\"root\">Grid</div>"},
		{"/assets/app.js", 200, "console.log('grid')"},
		{"/assets/missing.js", 404, ""},
		{"/api", 404, `"error"`},
		{"/api/unknown", 404, `"error"`},
		{"/api/lastfm", 404, `"error"`},
		{"/api/search", 404, `"error"`},
		{"/api/health", 200, `"ok":true`},
		{"/api/release-groups", 200, "[]"},
		{"/api/users/rj/albums", 503, `LAST_FM_API_KEY is not set`},
	} {
		t.Run(tc.path, func(t *testing.T) {
			resp, err := app.Test(httptest.NewRequest("GET", tc.path, nil))
			if err != nil {
				t.Fatal(err)
			}
			defer resp.Body.Close()
			body, err := io.ReadAll(resp.Body)
			if err != nil {
				t.Fatal(err)
			}
			if resp.StatusCode != tc.status || !strings.Contains(string(body), tc.body) {
				t.Fatalf("status %d body %s; want status %d containing %q", resp.StatusCode, body, tc.status, tc.body)
			}
			if tc.status >= 400 && strings.Contains(string(body), "id=\"root\"") {
				t.Fatalf("error response returned SPA: %s", body)
			}
		})
	}
}

func TestRequireSPAReportsMissingBuild(t *testing.T) {
	t.Parallel()
	err := requireSPA(t.TempDir())
	if err == nil || !strings.Contains(err.Error(), "pnpm --filter web build") {
		t.Fatalf("expected missing-build instruction, got %v", err)
	}
}
