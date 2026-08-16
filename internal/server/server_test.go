package server

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"

	"github.com/dylanbr0wn/grid/internal/album"
	"github.com/gofiber/fiber/v3"
)

func TestGetUserAlbums(t *testing.T) {
	t.Parallel()

	t.Run("400 when user empty after trim", func(t *testing.T) {
		t.Parallel()
		app := New(Config{LastFMAPIKey: "key"})
		assertError(t, app, "/api/users/%20/albums", http.StatusBadRequest)
	})

	t.Run("400 when user longer than 255", func(t *testing.T) {
		t.Parallel()
		app := New(Config{LastFMAPIKey: "key"})
		user := strings.Repeat("a", 256)
		assertError(t, app, "/api/users/"+user+"/albums", http.StatusBadRequest)
	})

	t.Run("503 when api key missing", func(t *testing.T) {
		t.Parallel()
		app := New(Config{})
		assertError(t, app, "/api/users/rj/albums", http.StatusServiceUnavailable)
	})

	t.Run("404 when last.fm user not found", func(t *testing.T) {
		t.Parallel()
		upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusNotFound)
			_, _ = w.Write([]byte(`{"error":6,"message":"User not found"}`))
		}))
		t.Cleanup(upstream.Close)

		app := New(Config{LastFMAPIKey: "key", LastFMBaseURL: upstream.URL + "/", HTTPClient: upstream.Client()})
		assertError(t, app, "/api/users/missing/albums", http.StatusNotFound)
	})

	t.Run("502 when last.fm payload missing topalbums", func(t *testing.T) {
		t.Parallel()
		upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			_, _ = w.Write([]byte(`{"not":"topalbums"}`))
		}))
		t.Cleanup(upstream.Close)

		app := New(Config{LastFMAPIKey: "key", LastFMBaseURL: upstream.URL + "/", HTTPClient: upstream.Client()})
		assertError(t, app, "/api/users/rj/albums", http.StatusBadGateway)
	})

	t.Run("502 when last.fm returns invalid json", func(t *testing.T) {
		t.Parallel()
		upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			_, _ = w.Write([]byte(`not-json`))
		}))
		t.Cleanup(upstream.Close)

		app := New(Config{LastFMAPIKey: "key", LastFMBaseURL: upstream.URL + "/", HTTPClient: upstream.Client()})
		assertError(t, app, "/api/users/rj/albums", http.StatusBadGateway)
	})

	t.Run("502 when last.fm http 500", func(t *testing.T) {
		t.Parallel()
		upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusInternalServerError)
			_, _ = w.Write([]byte(`{"error":8,"message":"Operation failed"}`))
		}))
		t.Cleanup(upstream.Close)

		app := New(Config{LastFMAPIKey: "key", LastFMBaseURL: upstream.URL + "/", HTTPClient: upstream.Client()})
		assertError(t, app, "/api/users/rj/albums", http.StatusBadGateway)
	})

	t.Run("200 maps albums without sort or presentation fields", func(t *testing.T) {
		t.Parallel()
		var gotQuery url.Values
		upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			gotQuery = r.URL.Query()
			_, _ = w.Write([]byte(lastFMSample))
		}))
		t.Cleanup(upstream.Close)

		app := New(Config{LastFMAPIKey: "secret", LastFMBaseURL: upstream.URL + "/", HTTPClient: upstream.Client()})
		resp, body := do(t, app, "/api/users/%20rj%20/albums")
		if resp.StatusCode != http.StatusOK {
			t.Fatalf("status %d body %s", resp.StatusCode, body)
		}

		if gotQuery.Get("method") != "user.getTopAlbums" {
			t.Fatalf("method %q", gotQuery.Get("method"))
		}
		if gotQuery.Get("period") != "7day" {
			t.Fatalf("period %q", gotQuery.Get("period"))
		}
		if gotQuery.Get("limit") != "100" {
			t.Fatalf("limit %q", gotQuery.Get("limit"))
		}
		if gotQuery.Get("user") != "rj" {
			t.Fatalf("user %q", gotQuery.Get("user"))
		}
		if gotQuery.Get("api_key") != "secret" {
			t.Fatalf("api_key %q", gotQuery.Get("api_key"))
		}
		if gotQuery.Get("sort") != "" {
			t.Fatalf("unexpected sort %q", gotQuery.Get("sort"))
		}

		var albums []map[string]any
		if err := json.Unmarshal(body, &albums); err != nil {
			t.Fatal(err)
		}
		if len(albums) != 2 {
			t.Fatalf("len %d", len(albums))
		}

		first := albums[0]
		if first["type"] != "lastfm" {
			t.Fatalf("type %v", first["type"])
		}
		if first["id"] != "joy-division_the-best-of" {
			t.Fatalf("id %v", first["id"])
		}
		if _, ok := first["mbid"]; ok {
			t.Fatalf("empty mbid should be omitted")
		}
		if _, ok := first["textColor"]; ok {
			t.Fatalf("textColor should be omitted")
		}
		if _, ok := first["textBackground"]; ok {
			t.Fatalf("textBackground should be omitted")
		}
		if first["plays"] != float64(596) {
			t.Fatalf("plays %v", first["plays"])
		}

		second := albums[1]
		if second["id"] != "0c63d2e4-2a99-4cc4-8991-a88dba182bbd" {
			t.Fatalf("id %v", second["id"])
		}
		if second["mbid"] != "0c63d2e4-2a99-4cc4-8991-a88dba182bbd" {
			t.Fatalf("mbid %v", second["mbid"])
		}
		imgs, _ := second["imgs"].([]any)
		caa := album.CoverArtURL("0c63d2e4-2a99-4cc4-8991-a88dba182bbd", "large")
		if !contains(imgs, caa) {
			t.Fatalf("imgs missing CAA %v", imgs)
		}
		if !contains(imgs, album.PlaceholderImg) {
			t.Fatalf("imgs missing placeholder %v", imgs)
		}
	})
}

func TestGetReleaseGroups(t *testing.T) {
	t.Parallel()

	t.Run("empty query returns empty array without upstream", func(t *testing.T) {
		t.Parallel()
		called := false
		upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			called = true
		}))
		t.Cleanup(upstream.Close)

		app := New(Config{MusicBrainzBaseURL: upstream.URL, HTTPClient: upstream.Client()})
		resp, body := do(t, app, "/api/release-groups")
		if resp.StatusCode != http.StatusOK {
			t.Fatalf("status %d body %s", resp.StatusCode, body)
		}
		if string(body) != "[]" {
			t.Fatalf("body %s", body)
		}
		if called {
			t.Fatal("MusicBrainz should not be called for empty query")
		}
	})

	t.Run("400 on invalid type field limit offset", func(t *testing.T) {
		t.Parallel()
		app := New(Config{})
		assertError(t, app, "/api/release-groups?query=x&type=lp", http.StatusBadRequest)
		assertError(t, app, "/api/release-groups?query=x&field=year", http.StatusBadRequest)
		assertError(t, app, "/api/release-groups?query=x&limit=0", http.StatusBadRequest)
		assertError(t, app, "/api/release-groups?query=x&limit=101", http.StatusBadRequest)
		assertError(t, app, "/api/release-groups?query=x&offset=-1", http.StatusBadRequest)
	})

	t.Run("502 on musicbrainz failure", func(t *testing.T) {
		t.Parallel()
		upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusInternalServerError)
		}))
		t.Cleanup(upstream.Close)

		app := New(Config{MusicBrainzBaseURL: upstream.URL, HTTPClient: upstream.Client()})
		assertError(t, app, "/api/release-groups?query=in+rainbows", http.StatusBadGateway)
	})

	t.Run("200 maps custom albums with stable ids and user-agent", func(t *testing.T) {
		t.Parallel()
		var gotUA, gotQuery, gotLimit, gotOffset string
		upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			gotUA = r.Header.Get("User-Agent")
			gotQuery = r.URL.Query().Get("query")
			gotLimit = r.URL.Query().Get("limit")
			gotOffset = r.URL.Query().Get("offset")
			_, _ = w.Write([]byte(musicBrainzSample))
		}))
		t.Cleanup(upstream.Close)

		app := New(Config{
			MusicBrainzBaseURL: upstream.URL,
			MusicBrainzUA:      "grid-app/0.1 ( https://grid.dylanbrown.xyz )",
			HTTPClient:         upstream.Client(),
		})
		resp, body := do(t, app, "/api/release-groups?query=in+rainbows&type=album&field=title&limit=10&offset=5")
		if resp.StatusCode != http.StatusOK {
			t.Fatalf("status %d body %s", resp.StatusCode, body)
		}
		if gotUA != "grid-app/0.1 ( https://grid.dylanbrown.xyz )" {
			t.Fatalf("user-agent %q", gotUA)
		}
		if gotQuery != `releasegroup:"in rainbows" AND primarytype:Album` {
			t.Fatalf("lucene %q", gotQuery)
		}
		if gotLimit != "10" || gotOffset != "5" {
			t.Fatalf("limit %s offset %s", gotLimit, gotOffset)
		}

		var albums []map[string]any
		if err := json.Unmarshal(body, &albums); err != nil {
			t.Fatal(err)
		}
		if len(albums) != 1 {
			t.Fatalf("len %d", len(albums))
		}
		got := albums[0]
		if got["type"] != "custom" {
			t.Fatalf("type %v", got["type"])
		}
		if got["id"] != "custom-6b9ac4e8-8a76-3fc6-8d40-8e6e7c4c4b2a" {
			t.Fatalf("id %v", got["id"])
		}
		if got["mbid"] != "6b9ac4e8-8a76-3fc6-8d40-8e6e7c4c4b2a" {
			t.Fatalf("mbid %v", got["mbid"])
		}
		if got["album"] != "In Rainbows" {
			t.Fatalf("album %v", got["album"])
		}
		if got["artist"] != "Radiohead" {
			t.Fatalf("artist %v", got["artist"])
		}
		caa := album.CoverArtURL("6b9ac4e8-8a76-3fc6-8d40-8e6e7c4c4b2a", "large")
		if got["img"] != caa {
			t.Fatalf("img %v", got["img"])
		}
		imgs, _ := got["imgs"].([]any)
		if !contains(imgs, caa) || !contains(imgs, album.PlaceholderImg) {
			t.Fatalf("imgs %v", imgs)
		}
	})
}

func do(t *testing.T, app *fiber.App, path string) (*http.Response, []byte) {
	t.Helper()
	req := httptest.NewRequest(http.MethodGet, path, nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = resp.Body.Close() })
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatal(err)
	}
	return resp, body
}

func assertError(t *testing.T, app *fiber.App, path string, status int) {
	t.Helper()
	resp, body := do(t, app, path)
	if resp.StatusCode != status {
		t.Fatalf("%s: status %d want %d body %s", path, resp.StatusCode, status, body)
	}
	var payload map[string]any
	if err := json.Unmarshal(body, &payload); err != nil {
		t.Fatalf("error json: %s", body)
	}
	if _, ok := payload["error"].(string); !ok {
		t.Fatalf("missing error string: %s", body)
	}
}

func contains(items []any, want string) bool {
	for _, item := range items {
		if item == want {
			return true
		}
	}
	return false
}

const lastFMSample = `{
  "topalbums": {
    "album": [
      {
        "artist": {"name": "Joy Division", "mbid": "9a58fda3-f4ed-4080-a3a5-f457aac9fcdd"},
        "image": [
          {"size": "small", "#text": "https://lastfm.test/small.jpg"},
          {"size": "large", "#text": "https://lastfm.test/large.jpg"}
        ],
        "playcount": "596",
        "name": "The Best Of",
        "mbid": ""
      },
      {
        "artist": {"name": "System of a Down", "mbid": "cc0b7089-c08d-4c10-b6b0-873582c17fd6"},
        "image": [
          {"size": "small", "#text": "https://lastfm.test/soad-small.png"},
          {"size": "large", "#text": "https://lastfm.test/soad-large.png"}
        ],
        "playcount": "482",
        "name": "Hypnotize",
        "mbid": "0c63d2e4-2a99-4cc4-8991-a88dba182bbd"
      }
    ]
  }
}`

const musicBrainzSample = `{
  "created": "2026-01-01T00:00:00.000Z",
  "count": 1,
  "offset": 5,
  "release-groups": [
    {
      "id": "6b9ac4e8-8a76-3fc6-8d40-8e6e7c4c4b2a",
      "title": "In Rainbows",
      "primary-type": "Album",
      "artist-credit": [
        {"artist": {"id": "a74b1b7f-71a5-4011-9441-d0b5e4122711", "name": "Radiohead", "sort-name": "Radiohead"}}
      ]
    }
  ]
}`
