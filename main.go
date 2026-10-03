package main

import (
	"flag"
	"log"
	"net/http"
	"os"

	"github.com/dylanbr0wn/grid/internal/server"
	"github.com/joho/godotenv"
)

func main() {
	dev := flag.Bool("dev", false, "reverse-proxy non-API traffic to the Vite dev server")
	viteOrigin := flag.String("vite", defaultViteOrigin, "Vite origin used with -dev")
	flag.Parse()

	_ = godotenv.Load()

	app := server.New(server.Config{
		LastFMAPIKey: os.Getenv("LAST_FM_API_KEY"),
	})

	addr := ":8080"
	if port := os.Getenv("PORT"); port != "" {
		addr = ":" + port
	}

	if *dev {
		proxy, err := newViteProxy(*viteOrigin)
		if err != nil {
			log.Fatal(err)
		}
		log.Printf("dev mode: listening on %s, proxying non-API to %s", addr, *viteOrigin)
		if err := http.ListenAndServe(addr, devHandler(app, proxy)); err != nil {
			log.Fatal(err)
		}
		return
	}

	if err := requireSPA(spaDir); err != nil {
		log.Fatal(err)
	}
	registerSPA(app, spaDir)

	log.Printf("listening on %s", addr)
	if err := app.Listen(addr); err != nil {
		log.Fatal(err)
	}
}
