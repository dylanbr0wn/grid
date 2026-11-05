package snapshot

import (
	"bytes"
	"errors"
	"os"
	"path/filepath"
	"testing"
	"time"
)

// Exercise a cold copy, rather than reopening the original working directory.
// Reconciliation happens offline before any restored store can serve HTTP.
func TestColdBackupRestore(t *testing.T) {
	dir, restored := t.TempDir(), t.TempDir()
	s := testOpen(t, dir, DefaultCapacity)
	data := testPNG(t)
	s.now = func() time.Time { return time.Now().Add(-Retention - time.Hour) }
	expired := testPut(t, s, data)
	s.now = time.Now
	// Avoid a new Put's cleanup so the cold backup contains expired data.
	if err := s.Close(); err != nil {
		t.Fatal(err)
	}
	expiredBytes, err := os.ReadFile(filepath.Join(dir, expired.ID+".snapshot"))
	if err != nil {
		t.Fatal(err)
	}
	s = testOpen(t, dir, DefaultCapacity)
	live := testPut(t, s, data)
	revokedLater := testPut(t, s, data)
	if err := s.Close(); err != nil {
		t.Fatal(err)
	}
	for _, p := range []Publication{live, revokedLater} {
		b, err := os.ReadFile(filepath.Join(dir, p.ID+".snapshot"))
		if err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(filepath.Join(restored, p.ID+".snapshot"), b, 0600); err != nil {
			t.Fatal(err)
		}
	}
	if err := os.WriteFile(filepath.Join(restored, expired.ID+".snapshot"), expiredBytes, 0600); err != nil {
		t.Fatal(err)
	}
	// Revoke after the backup. The old backup still has its PNG. A restore
	// cannot infer this deletion; the operator must quarantine that record.
	s = testOpen(t, dir, DefaultCapacity)
	if err := s.Revoke(revokedLater.ID, revokedLater.ManagementToken); err != nil {
		t.Fatal(err)
	}
	if err := s.Close(); err != nil {
		t.Fatal(err)
	}
	if err := os.Remove(filepath.Join(restored, revokedLater.ID+".snapshot")); err != nil {
		t.Fatal(err)
	}
	r := testOpen(t, restored, int64(len(data)))
	meta, got, err := r.Get(live.ID)
	if err != nil || meta != live.Metadata || !bytes.Equal(got, data) {
		t.Fatalf("restored image: %v", err)
	}
	if _, status, err := r.Manage(live.ID, live.ManagementToken); err != nil || status != "active" {
		t.Fatalf("restored access: %s %v", status, err)
	}
	assertMissing(t, r, expired.ID)
	assertMissing(t, r, revokedLater.ID)
	if _, err := os.Stat(filepath.Join(restored, expired.ID+".snapshot")); !errors.Is(err, os.ErrNotExist) {
		t.Fatalf("expired file retained: %v", err)
	}
	u, err := r.Usage()
	if err != nil || u.ImageBytes != int64(len(data)) || u.Records != 1 {
		t.Fatalf("usage: %+v %v", u, err)
	}
	if _, err := r.Put("full", data); !errors.Is(err, ErrCapacity) {
		t.Fatalf("capacity after restore: %v", err)
	}
	if _, _, err := r.Get(live.ID); err != nil {
		t.Fatal(err)
	}
	if err := r.Close(); err != nil {
		t.Fatal(err)
	}
	if _, err := r.Usage(); !errors.Is(err, ErrUnavailable) {
		t.Fatalf("closed usage: %v", err)
	}
}
