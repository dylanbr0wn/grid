package main

import (
	"log"
	"os"

	"github.com/dylanbr0wn/grid/internal/server"
	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load()

	app := server.New(server.Config{
		LastFMAPIKey: os.Getenv("LAST_FM_API_KEY"),
	})

	addr := ":8080"
	if port := os.Getenv("PORT"); port != "" {
		addr = ":" + port
	}

	log.Printf("listening on %s", addr)
	if err := app.Listen(addr); err != nil {
		log.Fatal(err)
	}
}
