package musicbrainz

import "strings"

var primaryTypeQuery = map[string]string{
	"album":  "Album",
	"ep":     "EP",
	"single": "Single",
}

func BuildReleaseGroupQuery(query, releaseType, field string) string {
	lucene := query
	switch field {
	case "title":
		lucene = `releasegroup:"` + escapeLucenePhrase(query) + `"`
	case "artist":
		lucene = `artist:"` + escapeLucenePhrase(query) + `"`
	}

	if releaseType != "all" {
		if primary, ok := primaryTypeQuery[releaseType]; ok {
			lucene = lucene + " AND primarytype:" + primary
		}
	}
	return lucene
}

func escapeLucenePhrase(term string) string {
	var b strings.Builder
	b.Grow(len(term) + 8)
	for _, r := range term {
		switch r {
		case '+', '-', '&', '|', '!', '(', ')', '{', '}', '[', ']', '^', '"', '~', '*', '?', ':', '\\', '/':
			b.WriteByte('\\')
		}
		b.WriteRune(r)
	}
	return b.String()
}
