package musicbrainz

import "testing"

func TestBuildReleaseGroupQuery(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name, query, releaseType, field, want string
	}{
		{name: "all fields all types", query: "in rainbows", releaseType: "all", field: "all", want: "in rainbows"},
		{name: "title field", query: "in rainbows", releaseType: "all", field: "title", want: `releasegroup:"in rainbows"`},
		{name: "artist field", query: "radiohead", releaseType: "all", field: "artist", want: `artist:"radiohead"`},
		{name: "type album", query: "in rainbows", releaseType: "album", field: "all", want: "in rainbows AND primarytype:Album"},
		{name: "title and ep", query: "ok computer", releaseType: "ep", field: "title", want: `releasegroup:"ok computer" AND primarytype:EP`},
		{name: "escapes lucene", query: `foo:bar "baz"`, releaseType: "all", field: "title", want: `releasegroup:"foo\:bar \"baz\""`},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got := BuildReleaseGroupQuery(tt.query, tt.releaseType, tt.field)
			if got != tt.want {
				t.Fatalf("got %q want %q", got, tt.want)
			}
		})
	}
}
