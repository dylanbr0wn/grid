package main

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/static"
)

const spaDir = "web/dist"

func requireSPA(dir string) error {
	index := filepath.Join(dir, "index.html")
	if _, err := os.Stat(index); err != nil {
		return fmt.Errorf("SPA build missing at %s (run: pnpm --filter web build): %w", index, err)
	}
	return nil
}

// registerSPA serves a Vite production build from dir and falls back unknown
// non-API GET paths to index.html (client-side routing). Register API routes first.
func registerSPA(app *fiber.App, dir string) {
	index := filepath.Join(dir, "index.html")
	app.Get("/*", static.New(dir, static.Config{
		NotFoundHandler: func(c fiber.Ctx) error {
			if looksLikeStaticAsset(c.Path()) {
				return nil
			}
			// static.NotFoundHandler runs after a 404; SendFile would keep that
			// status unless we reset it. SPA fallback must be 200.
			c.Status(fiber.StatusOK)
			return c.SendFile(index)
		},
	}))
}

func looksLikeStaticAsset(path string) bool {
	base := path[strings.LastIndex(path, "/")+1:]
	return strings.Contains(base, ".")
}
