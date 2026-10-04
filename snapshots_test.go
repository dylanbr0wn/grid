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

func TestSnapshotHTTPConfiguration(t *testing.T) {
	for _, name := range []string{"SNAPSHOT_UPLOADS_PER_IP", "SNAPSHOT_UPLOADS_GLOBAL", "SNAPSHOT_TRUSTED_PROXIES", "SNAPSHOT_PUBLIC_ORIGIN"} {
		t.Setenv(name, "")
	}
	cfg, err := snapshotHTTPConfig()
	if err != nil || cfg.SnapshotUploadsPerIP != 0 || cfg.SnapshotUploadsGlobal != 0 || len(cfg.SnapshotTrustedProxies) != 0 {
		t.Fatal("default configuration")
	}
	t.Setenv("SNAPSHOT_UPLOADS_PER_IP", "5")
	t.Setenv("SNAPSHOT_UPLOADS_GLOBAL", "50")
	t.Setenv("SNAPSHOT_TRUSTED_PROXIES", "192.0.2.1, 2001:db8::/32")
	cfg, err = snapshotHTTPConfig()
	if err != nil || cfg.SnapshotUploadsPerIP != 5 || cfg.SnapshotUploadsGlobal != 50 || len(cfg.SnapshotTrustedProxies) != 2 {
		t.Fatal("configured limits/proxies", err)
	}
	for _, name := range []string{"SNAPSHOT_UPLOADS_PER_IP", "SNAPSHOT_UPLOADS_GLOBAL"} {
		for _, value := range []string{"0", "-1", "text"} {
			t.Setenv(name, value)
			if _, err := snapshotHTTPConfig(); err == nil {
				t.Fatal("accepted invalid limit")
			}
		}
		t.Setenv(name, "5")
	}
	for _, value := range []string{"*", "railway.internal", "192.0.2.1,"} {
		t.Setenv("SNAPSHOT_TRUSTED_PROXIES", value)
		if _, err := snapshotHTTPConfig(); err == nil {
			t.Fatal("accepted invalid proxy")
		}
	}
}

func TestSnapshotPublicOriginConfiguration(t *testing.T) {
	for _, name := range []string{"SNAPSHOT_UPLOADS_PER_IP", "SNAPSHOT_UPLOADS_GLOBAL", "SNAPSHOT_TRUSTED_PROXIES"} {
		t.Setenv(name, "")
	}
	for _, value := range []string{"https://grid.example", "https://grid.example/", "http://localhost:8080"} {
		t.Setenv("SNAPSHOT_PUBLIC_ORIGIN", value)
		cfg, err := snapshotHTTPConfig()
		if err != nil || cfg.SnapshotPublicOrigin == "" {
			t.Fatalf("origin %q: %v", value, err)
		}
	}
	for _, value := range []string{"grid.example", "//grid.example", "javascript:alert(1)", "https://", "https://user:secret@grid.example", "https://grid.example/path", "https://grid.example?x=1", "https://grid.example?", "https://grid.example#token"} {
		t.Setenv("SNAPSHOT_PUBLIC_ORIGIN", value)
		if _, err := snapshotHTTPConfig(); err == nil {
			t.Fatalf("accepted origin %q", value)
		}
	}
}
