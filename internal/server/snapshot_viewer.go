package server

import (
	"bytes"
	"errors"
	"html/template"
	"image/png"
	"strings"

	"github.com/dylanbr0wn/grid/internal/snapshot"
	"github.com/gofiber/fiber/v3"
)

type snapshotPage struct {
	Title, Message, PageURL, ImageURL, ViewImageURL, DownloadURL, Expiry string
	Width, Height, DisplayWidth                                          int
}

func (s *Server) viewSnapshot(c fiber.Ctx) error {
	if s.snapshots == nil {
		return unavailableSnapshotPage(c, 503)
	}
	id := c.Params("id")
	if !validPublicID(id) {
		return unavailableSnapshotPage(c, 404)
	}
	meta, image, err := s.snapshots.Get(id)
	if err != nil {
		if errors.Is(err, snapshot.ErrNotFound) {
			return unavailableSnapshotPage(c, 404)
		}
		return unavailableSnapshotPage(c, 503)
	}
	dimensions, err := png.DecodeConfig(bytes.NewReader(image))
	if err != nil {
		return unavailableSnapshotPage(c, 503)
	}
	title := meta.Title
	if strings.TrimSpace(title) == "" {
		title = "Shared album grid"
	}
	origin := s.snapshotPublicOrigin
	if origin == "" {
		// Direct-request fallback for local serving. Forwarded headers must never
		// choose crawler URLs. Set the canonical origin behind a TLS proxy.
		scheme := "http"
		if c.RequestCtx().IsTLS() || string(c.Request().URI().Scheme()) == "https" {
			scheme = "https"
		}
		origin = scheme + "://" + string(c.Request().Host())
	}
	return renderSnapshotPage(c, 200, snapshotPage{
		Title: title, PageURL: origin + "/s/" + id,
		ImageURL:     origin + "/api/snapshots/" + id + "/image",
		ViewImageURL: "/api/snapshots/" + id + "/image",
		DownloadURL:  "/api/snapshots/" + id + "/download",
		Expiry:       meta.ExpiresAt.UTC().Format("2 January 2006 at 15:04"),
		Width:        dimensions.Width, Height: dimensions.Height, DisplayWidth: dimensions.Width / 2,
	})
}

func unavailableSnapshotPage(c fiber.Ctx, status int) error {
	page := snapshotPage{Title: "Snapshot unavailable", Message: "This link may have expired, been revoked, or never existed."}
	if status == 503 {
		page.Message = "Snapshot sharing is temporarily unavailable. Please try again later."
	}
	return renderSnapshotPage(c, status, page)
}

func renderSnapshotPage(c fiber.Ctx, status int, page snapshotPage) error {
	snapshotHeaders(c)
	c.Set("Content-Security-Policy", "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'")
	var body bytes.Buffer
	if err := snapshotPageTemplate.Execute(&body, page); err != nil {
		return err
	}
	c.Set("Content-Type", "text/html; charset=utf-8")
	return c.Status(status).Send(body.Bytes())
}

var snapshotPageTemplate = template.Must(template.New("snapshot").Parse(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="dark">
  <meta name="robots" content="noindex, nofollow, noarchive">
  <title>{{.Title}} | Grid</title>
  {{if .ImageURL}}<meta name="description" content="A frozen album grid shared with Grid.">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Grid">
  <meta property="og:title" content="{{.Title}}">
  <meta property="og:description" content="A frozen album grid shared with Grid.">
  <meta property="og:url" content="{{.PageURL}}">
  <meta property="og:image" content="{{.ImageURL}}">
  <meta property="og:image:type" content="image/png">
  <meta property="og:image:width" content="{{.Width}}">
  <meta property="og:image:height" content="{{.Height}}">
  <meta property="og:image:alt" content="{{.Title}}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{{.Title}}">
  <meta name="twitter:description" content="A frozen album grid shared with Grid.">
  <meta name="twitter:image" content="{{.ImageURL}}">
  <meta name="twitter:image:alt" content="{{.Title}}">{{end}}
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; background: #0a0a0a; color: #ededed; font-family: ui-monospace, monospace; }
    header { border-bottom: 1px solid #303030; padding: 1rem 1.5rem; }
    a { color: inherit; text-underline-offset: .2em; }
    .brand { font-weight: 800; text-decoration: none; letter-spacing: .1em; }
    main { max-width: 84rem; margin: 0 auto; padding: 2rem 1.5rem 3rem; }
    h1 { font-size: clamp(1.25rem, 3vw, 1.75rem); line-height: 1.4; margin: 0 0 .75rem; overflow-wrap: anywhere; }
    p { color: #a3a3a3; line-height: 1.6; }
    .actions { display: flex; flex-wrap: wrap; align-items: center; gap: 1rem; margin: 0 0 1.5rem; }
    .actions p { margin: 0; font-size: .85rem; }
    .download { display: inline-block; padding: .75rem 1rem; background: #ededed; color: #171717; border-radius: .4rem; font-weight: 700; text-decoration: none; }
    a:focus-visible { outline: 2px solid #a3a3a3; outline-offset: 4px; }
    img { display: block; width: 100%; height: auto; }
    @media (max-width: 480px) { header { padding: 1rem; } main { padding: 1.5rem 1rem 2rem; } }
  </style>
</head>
<body>
  <header><a class="brand" href="/" aria-label="Grid home">GRID</a></header>
  <main>
    <h1>{{.Title}}</h1>
    {{if .ImageURL}}<div class="actions">
      <a class="download" href="{{.DownloadURL}}" download>Download PNG</a>
      <p>Available until {{.Expiry}} UTC</p>
    </div>
    <div style="max-width: {{.DisplayWidth}}px"><img src="{{.ViewImageURL}}" width="{{.Width}}" height="{{.Height}}" alt="{{.Title}}"></div>
    {{else}}<p>{{.Message}}</p>{{end}}
  </main>
</body>
</html>`))
