package main

import (
	"log"
	"os"

	"github.com/gofiber/fiber/v3"
	"github.com/joho/godotenv"
)

func main() {
	// Load .env if present; missing file is fine (production can inject env).
	_ = godotenv.Load()

	_ = os.Getenv("LAST_FM_API_KEY")

	if err := requireSPA(spaDir); err != nil {
		log.Fatal(err)
	}

	app := newApp(spaDir)

	addr := ":8080"
	if port := os.Getenv("PORT"); port != "" {
		addr = ":" + port
	}

	log.Printf("listening on %s", addr)
	if err := app.Listen(addr); err != nil {
		log.Fatal(err)
	}
}

func newApp(dir string) *fiber.App {
	app := fiber.New()

	app.Get("/api/health", func(c fiber.Ctx) error {
		return c.JSON(fiber.Map{"ok": true})
	})

	registerSPA(app, dir)
	return app
}
