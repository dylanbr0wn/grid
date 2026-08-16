package lastfm

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"

	"github.com/dylanbr0wn/grid/internal/album"
)

const DefaultBaseURL = "https://ws.audioscrobbler.com/2.0/"

var (
	ErrUserNotFound = errors.New("lastfm: user not found")
	ErrUpstream     = errors.New("lastfm: upstream failure")
)

type Client struct {
	APIKey  string
	BaseURL string
	HTTP    *http.Client
}

type apiError struct {
	Error   int    `json:"error"`
	Message string `json:"message"`
}

type image struct {
	Size string `json:"size"`
	Text string `json:"#text"`
}

type artist struct {
	Name string `json:"name"`
	MBID string `json:"mbid"`
}

type rawAlbum struct {
	Name      string  `json:"name"`
	MBID      string  `json:"mbid"`
	Playcount string  `json:"playcount"`
	Artist    artist  `json:"artist"`
	Image     []image `json:"image"`
}

type albumsField []rawAlbum

func (a *albumsField) UnmarshalJSON(b []byte) error {
	s := strings.TrimSpace(string(b))
	if s == "null" || s == `""` || s == "[]" {
		*a = []rawAlbum{}
		return nil
	}
	var arr []rawAlbum
	if err := json.Unmarshal(b, &arr); err == nil {
		*a = arr
		return nil
	}
	var one rawAlbum
	if err := json.Unmarshal(b, &one); err != nil {
		return err
	}
	*a = []rawAlbum{one}
	return nil
}

type topAlbumsResponse struct {
	TopAlbums *struct {
		Album albumsField `json:"album"`
	} `json:"topalbums"`
}

func (c *Client) TopAlbums(ctx context.Context, user string) ([]album.LastFM, error) {
	base := c.BaseURL
	if base == "" {
		base = DefaultBaseURL
	}
	u, err := url.Parse(base)
	if err != nil {
		return nil, fmt.Errorf("%w: %s", ErrUpstream, err)
	}
	q := u.Query()
	q.Set("method", "user.getTopAlbums")
	q.Set("user", user)
	q.Set("api_key", c.APIKey)
	q.Set("format", "json")
	q.Set("period", "7day")
	q.Set("limit", "100")
	u.RawQuery = q.Encode()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), nil)
	if err != nil {
		return nil, fmt.Errorf("%w: %s", ErrUpstream, err)
	}
	req.Header.Set("Accept", "application/json")

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

	var apiErr apiError
	if json.Unmarshal(body, &apiErr) == nil && apiErr.Error != 0 {
		if isUserNotFound(resp.StatusCode, apiErr) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("%w: %s", ErrUpstream, apiErr.Message)
	}
	if resp.StatusCode == http.StatusNotFound {
		return nil, ErrUserNotFound
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("%w: HTTP %d", ErrUpstream, resp.StatusCode)
	}

	var parsed topAlbumsResponse
	if err := json.Unmarshal(body, &parsed); err != nil {
		return nil, fmt.Errorf("%w: invalid payload", ErrUpstream)
	}
	if parsed.TopAlbums == nil {
		return nil, fmt.Errorf("%w: invalid payload", ErrUpstream)
	}

	out := make([]album.LastFM, 0, len(parsed.TopAlbums.Album))
	for _, raw := range parsed.TopAlbums.Album {
		mapped, err := mapAlbum(raw)
		if err != nil {
			return nil, fmt.Errorf("%w: %s", ErrUpstream, err)
		}
		out = append(out, mapped)
	}
	return out, nil
}

func isUserNotFound(status int, apiErr apiError) bool {
	if strings.Contains(strings.ToLower(apiErr.Message), "user not found") {
		return true
	}
	return status == http.StatusNotFound || apiErr.Error == 6
}

func mapAlbum(raw rawAlbum) (album.LastFM, error) {
	if raw.Name == "" || raw.Artist.Name == "" {
		return album.LastFM{}, errors.New("album missing name or artist")
	}
	plays, err := strconv.Atoi(raw.Playcount)
	if err != nil {
		return album.LastFM{}, fmt.Errorf("invalid playcount %q", raw.Playcount)
	}

	large := imageText(raw.Image, "large")
	small := imageText(raw.Image, "small")
	fallback := imageText(raw.Image, "")
	caa := album.CoverArtURL(raw.MBID, "large")

	imgs := compact([]string{
		large,
		caa,
		small,
		fallback,
		album.PlaceholderImg,
	})
	img := firstNonEmpty(large, caa, small, fallback, album.PlaceholderImg)

	idSource := raw.MBID
	if idSource == "" {
		idSource = raw.Artist.Name + "_" + raw.Name
	}
	id := strings.ToLower(strings.ReplaceAll(idSource, " ", "-"))

	return album.LastFM{
		Type:       "lastfm",
		ID:         id,
		Album:      raw.Name,
		Artist:     raw.Artist.Name,
		Img:        img,
		Imgs:       imgs,
		Plays:      plays,
		MBID:       raw.MBID,
		ArtistMBID: raw.Artist.MBID,
	}, nil
}

func imageText(images []image, size string) string {
	for _, img := range images {
		if img.Size == size {
			return img.Text
		}
	}
	return ""
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

func firstNonEmpty(urls ...string) string {
	for _, u := range urls {
		if u != "" {
			return u
		}
	}
	return album.PlaceholderImg
}
