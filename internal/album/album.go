package album

const PlaceholderImg = "/img/placeholder.png"

const CoverArtBase = "https://coverartarchive.org/release-group"

func CoverArtURL(releaseGroupID string, size string) string {
	if releaseGroupID == "" {
		return ""
	}
	px := "500"
	if size == "small" {
		px = "250"
	}
	return CoverArtBase + "/" + releaseGroupID + "/front-" + px
}

type LastFM struct {
	Type       string   `json:"type"`
	ID         string   `json:"id"`
	Album      string   `json:"album"`
	Artist     string   `json:"artist"`
	Img        string   `json:"img"`
	Imgs       []string `json:"imgs"`
	Plays      int      `json:"plays"`
	MBID       string   `json:"mbid,omitempty"`
	ArtistMBID string   `json:"artistMbid,omitempty"`
}

type Custom struct {
	Type       string   `json:"type"`
	ID         string   `json:"id"`
	MBID       string   `json:"mbid"`
	Album      string   `json:"album"`
	Artist     string   `json:"artist"`
	Img        string   `json:"img"`
	Imgs       []string `json:"imgs"`
	ArtistMBID string   `json:"artistMbid,omitempty"`
	Plays      int      `json:"plays,omitempty"`
}
