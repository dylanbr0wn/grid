package main

import (
	"fmt"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/adaptor"
)

const defaultViteOrigin = "http://127.0.0.1:5173"

func newViteProxy(target string) (*httputil.ReverseProxy, error) {
	u, err := url.Parse(target)
	if err != nil {
		return nil, err
	}
	if u.Scheme == "" || u.Host == "" {
		return nil, fmt.Errorf("invalid Vite origin %q (want e.g. %s)", target, defaultViteOrigin)
	}

	proxy := httputil.NewSingleHostReverseProxy(u)
	// Flush immediately so Vite HMR/event streams aren't buffered.
	proxy.FlushInterval = -1
	proxy.ErrorHandler = func(w http.ResponseWriter, _ *http.Request, _ error) {
		http.Error(w, "vite dev server unreachable at "+u.String()+" (run: pnpm --filter web dev)", http.StatusBadGateway)
	}
	return proxy, nil
}

// devHandler serves Fiber API routes and reverse-proxies everything else to
// Vite. ReverseProxy runs on net/http (not Fiber's fasthttp proxy middleware)
// so WebSocket upgrades for HMR can hijack. Incoming Host is left intact so
// Vite sees the browser origin (Go).
func devHandler(app *fiber.App, vite http.Handler) http.Handler {
	fiberHTTP := adaptor.FiberApp(app)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if isAPIPath(r.URL.Path) {
			fiberHTTP.ServeHTTP(w, r)
			return
		}
		vite.ServeHTTP(w, r)
	})
}

func isAPIPath(path string) bool {
	return path == "/api" || strings.HasPrefix(path, "/api/")
}
