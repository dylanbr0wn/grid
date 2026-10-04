package main

import "testing"

func TestSnapshotConfiguration(t *testing.T) {
	store, err := openSnapshots("", "")
	if err != nil || store != nil {
		t.Fatalf("disabled: %v, %v", store, err)
	}
	for _, tt := range []struct{ dir, cap string }{
		{"", "250000000"}, {t.TempDir(), "no"}, {t.TempDir(), "0"}, {t.TempDir(), "-1"}, {t.TempDir(), "9223372036854775808"}, {t.TempDir() + "/missing", ""},
	} {
		if s, err := openSnapshots(tt.dir, tt.cap); err == nil {
			if s != nil {
				s.Close()
			}
			t.Fatalf("accepted invalid config %+v", tt)
		}
	}
	store, err = openSnapshots(t.TempDir(), "250000000")
	if err != nil {
		t.Fatal(err)
	}
	if err := store.Close(); err != nil {
		t.Fatal(err)
	}
}
