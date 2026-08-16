package musicbrainz

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"

	"github.com/dylanbr0wn/grid/internal/album"
)

const (
	DefaultBaseURL   = "https://musicbrainz.org/ws/2"
	DefaultUserAgent = "grid-app/0.1 ( https://grid.dylanbrown.xyz )"
)

var ErrUpstream = errors.New("musicbrainz: upstream failure")

type Client struct {
	BaseURL   string
	UserAgent string
	HTTP      *http.Client
}

type SearchOptions struct {
	Query  string
	Type   string
	Field  string
	Limit  int
	Offset int
}

type artistCredit struct {
	Artist struct {
		ID   string `json:"id"`
		Name string `json:"name"`
	} `json:"artist"`
}

type releaseGroup struct {
	ID           string         `json:"id"`
	Title        string         `json:"title"`
	ArtistCredit []artistCredit `json:"artist-credit"`
}

type searchResponse struct {
	ReleaseGroups []releaseGroup `json:"release-groups"`
}

func (c *Client) SearchReleaseGroups(ctx context.Context, opts SearchOptions) ([]album.Custom, error) {
	if opts.Query == "" {
		return []album.Custom{}, nil
	}

	base := c.BaseURL
	if base == "" {
		base = DefaultBaseURL
	}
	u, err := url.Parse(strings.TrimRight(base, "/") + "/release-group")
	if err != nil {
		return nil, fmt.Errorf("%w: %s", ErrUpstream, err)
	}
	q := u.Query()
	q.Set("query", BuildReleaseGroupQuery(opts.Query, opts.Type, opts.Field))
	q.Set("limit", fmt.Sprintf("%d", opts.Limit))
	q.Set("offset", fmt.Sprintf("%d", opts.Offset))
	q.Set("fmt", "json")
	u.RawQuery = q.Encode()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), nil)
	if err != nil {
		return nil, fmt.Errorf("%w: %s", ErrUpstream, err)
	}
	ua := c.UserAgent
	if ua == "" {
		ua = DefaultUserAgent
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", ua)

	httpClient := c.HTTP
	if httpClient == nil {
		httpClient = http.DefaultClient
	}
	resp, err := httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("%w: %s", ErrUpstream, err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("%w: %s", ErrUpstream, err)
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("%w: HTTP %d", ErrUpstream, resp.StatusCode)
	}

	var parsed searchResponse
	if err := json.Unmarshal(body, &parsed); err != nil {
		return nil, fmt.Errorf("%w: invalid payload", ErrUpstream)
	}

	out := make([]album.Custom, 0, len(parsed.ReleaseGroups))
	for _, rg := range parsed.ReleaseGroups {
		mapped, err := mapReleaseGroup(rg)
		if err != nil {
			return nil, fmt.Errorf("%w: %s", ErrUpstream, err)
		}
		out = append(out, mapped)
	}
	return out, nil
}

func mapReleaseGroup(rg releaseGroup) (album.Custom, error) {
	if rg.ID == "" || rg.Title == "" {
		return album.Custom{}, errors.New("release group missing id or title")
	}

	names := make([]string, 0, len(rg.ArtistCredit))
	ids := make([]string, 0, len(rg.ArtistCredit))
	for _, ac := range rg.ArtistCredit {
		if ac.Artist.Name != "" {
			names = append(names, ac.Artist.Name)
		}
		if ac.Artist.ID != "" {
			ids = append(ids, ac.Artist.ID)
		}
	}

	caa := album.CoverArtURL(rg.ID, "large")
	img := caa
	if img == "" {
		img = album.PlaceholderImg
	}
	imgs := compact([]string{caa, album.PlaceholderImg})

	return album.Custom{
		Type:       "custom",
		ID:         "custom-" + rg.ID,
		MBID:       rg.ID,
		Album:      rg.Title,
		Artist:     strings.Join(names, ", "),
		Img:        img,
		Imgs:       imgs,
		ArtistMBID: strings.Join(ids, ", "),
	}, nil
}

func compact(urls []string) []string {
	out := make([]string, 0, len(urls))
	for _, u := range urls {
		if u != "" {
			out = append(out, u)
		}
	}
	return out
}
