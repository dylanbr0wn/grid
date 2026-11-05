package main

import (
	"flag"
	"log"
	"net"
	"net/http"
	"os"
	"time"

	"github.com/dylanbr0wn/grid/internal/server"
	"github.com/joho/godotenv"
)

func main() {
	dev := flag.Bool("dev", false, "reverse-proxy non-API traffic to the Vite dev server")
	devHost := flag.String("dev-host", "127.0.0.1", "dev listener host (use 0.0.0.0 to allow LAN access)")
	viteOrigin := flag.String("vite", defaultViteOrigin, "Vite origin used with -dev")
	snapshotCheck := flag.Bool("snapshot-check", false, "recover and validate configured snapshot storage, then exit without serving HTTP")
	flag.Parse()

	_ = godotenv.Load()
	snapshots, err := openSnapshots(os.Getenv("SNAPSHOT_DIR"), os.Getenv("SNAPSHOT_CAPACITY_BYTES"))
	if err != nil {
		log.Fatal(err)
	}
	if snapshots != nil {
		defer snapshots.Close()
		usage, err := snapshots.Usage()
		if err != nil {
			log.Fatal(err)
		}
		log.Printf("snapshot storage ready: image_bytes=%d capacity_bytes=%d records=%d", usage.ImageBytes, usage.CapacityBytes, usage.Records)
		if *snapshotCheck {
			return
		}
		go func() {
			ticker := time.NewTicker(time.Hour)
			defer ticker.Stop()
			for range ticker.C {
				if err := snapshots.Cleanup(); err != nil {
					log.Printf("snapshot cleanup failed: %v", err)
				} else if usage, err := snapshots.Usage(); err == nil {
					log.Printf("snapshot cleanup complete: image_bytes=%d capacity_bytes=%d records=%d", usage.ImageBytes, usage.CapacityBytes, usage.Records)
				}
			}
		}()
	} else {
		if *snapshotCheck {
			log.Fatal("snapshot-check requires SNAPSHOT_DIR")
		}
		log.Print("snapshot storage disabled: SNAPSHOT_DIR is unset")
	}

	uploadConfig, err := snapshotHTTPConfig()
	if err != nil {
		log.Fatal(err)
	}
	uploadConfig.Snapshots = snapshots
	uploadConfig.LastFMAPIKey = os.Getenv("LAST_FM_API_KEY")
	app := server.New(uploadConfig)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	addr := ":" + port

	if *dev {
		addr = net.JoinHostPort(*devHost, port)
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
