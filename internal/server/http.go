package server

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"strings"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/adaptor"
)

// HTTPHandler preserves the snapshot error/cache contract in the net/http dev
// proxy. Fiber's adaptor otherwise rejects oversized bodies as plain text before
// Fiber middleware or its error handler can run.
func HTTPHandler(app *fiber.App) http.Handler {
	handler := adaptor.FiberApp(app)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/api/snapshots" || strings.HasPrefix(r.URL.Path, "/api/snapshots/") {
			for name, value := range snapshotResponseHeaders {
				w.Header().Set(name, value)
			}
			fail := func(code int, message string) {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(code)
				json.NewEncoder(w).Encode(map[string]string{"error": message})
			}
			if r.ContentLength > snapshotBodyLimit {
				fail(413, "Upload exceeds the request size limit")
				return
			}
			if r.Body != nil {
				body, err := io.ReadAll(io.LimitReader(r.Body, snapshotBodyLimit+1))
				r.Body.Close()
				if err != nil {
					fail(400, "Could not read upload body")
					return
				}
				if len(body) > snapshotBodyLimit {
					fail(413, "Upload exceeds the request size limit")
					return
				}
				r.Body = io.NopCloser(bytes.NewReader(body))
				r.ContentLength = int64(len(body))
			}
		}
		handler.ServeHTTP(w, r)
	})
}
