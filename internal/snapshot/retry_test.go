package snapshot

import (
	"bytes"
	"crypto/rand"
	"encoding/base64"
	"encoding/binary"
	"errors"
	"os"
	"path/filepath"
	"sync"
	"testing"
	"time"
)

func testKey(t *testing.T, now time.Time) string {
	t.Helper()
	b := make([]byte, 40)
	binary.BigEndian.PutUint64(b, uint64(now.Unix()))
	if _, err := rand.Read(b[8:]); err != nil {
		t.Fatal(err)
	}
	return base64.RawURLEncoding.EncodeToString(b)
}

func TestKeyedPublicationRecoversAcrossRestartAndConcurrentRetries(t *testing.T) {
	dir, image := t.TempDir(), testPNG(t)
	key := testKey(t, time.Now())
	s := testOpen(t, dir, int64(len(image)))
	first, err := s.PutWithKey("<Title> & cover", image, key)
	if err != nil {
		t.Fatal(err)
	}
	s.Close()
	s = testOpen(t, dir, int64(len(image)))
	var wg sync.WaitGroup
	for range 12 {
		wg.Go(func() {
			got, err := s.PutWithKey(first.Title, image, key)
			if err != nil || got != first {
				t.Errorf("retry changed result: %+v %v", got, err)
			}
		})
	}
	wg.Wait()
	if s.used != int64(len(image)) || len(s.records) != 1 {
		t.Fatal("duplicate capacity charge")
	}
	if _, err := s.PutWithKey("changed title", image, key); !errors.Is(err, ErrConflict) {
		t.Fatalf("title conflict: %v", err)
	}
	if _, err := s.PutWithKey(first.Title, append(image, 0), key); !errors.Is(err, ErrConflict) {
		t.Fatalf("image conflict: %v", err)
	}
	data, _ := os.ReadFile(filepath.Join(dir, first.ID+".snapshot"))
	for _, secret := range []string{key, first.ManagementToken} {
		if bytes.Contains(data, []byte(secret)) {
			t.Fatal("persisted raw credential")
		}
	}
}

func TestRevocationReceiptPreventsResurrectionAndReclaimsImage(t *testing.T) {
	dir, image := t.TempDir(), testPNG(t)
	now := time.Now().UTC()
	key := testKey(t, now)
	s := testOpen(t, dir, int64(len(image)))
	s.now = func() time.Time { return now }
	p, err := s.PutWithKey("grid", image, key)
	if err != nil {
		t.Fatal(err)
	}
	if err := s.Revoke(p.ID, p.ID); !errors.Is(err, ErrUnauthorized) {
		t.Fatal(err)
	}
	if err := s.Revoke(p.ID, p.ManagementToken); err != nil {
		t.Fatal(err)
	}
	if s.used != 0 {
		t.Fatal("revocation retained image capacity")
	}
	assertMissing(t, s, p.ID)
	meta, status, err := s.Manage(p.ID, p.ManagementToken)
	if err != nil || status != "revoked" || meta != p.Metadata {
		t.Fatalf("management: %s %v", status, err)
	}
	s.Close()
	s = testOpen(t, dir, int64(len(image)))
	s.now = func() time.Time { return now }
	if _, err := s.PutWithKey("grid", image, key); !errors.Is(err, ErrGone) {
		t.Fatalf("resurrected: %v", err)
	}
	if err := s.Revoke(p.ID, p.ManagementToken); err != nil {
		t.Fatal(err)
	}
	replacement := testPut(t, s, image)
	now = time.Unix(s.records[p.ID].RetryUntil, 0)
	if err := s.Cleanup(); err != nil {
		t.Fatal(err)
	}
	if _, ok := s.records[p.ID]; ok {
		t.Fatal("receipt survived its window")
	}
	if _, err := s.PutWithKey("grid", image, key); !errors.Is(err, ErrGone) {
		t.Fatalf("recreated after receipt cleanup: %v", err)
	}
	if _, _, err := s.Get(replacement.ID); err != nil {
		t.Fatal(err)
	}
}

func TestKeyedUnknownCommitRecoversManagementAccess(t *testing.T) {
	dir, image := t.TempDir(), testPNG(t)
	s := testOpen(t, dir, 0)
	key := testKey(t, time.Now())
	s.syncDir = func() error { return errors.New("injected post-rename failure") }
	if _, err := s.PutWithKey("grid", image, key); !errors.Is(err, ErrUnavailable) {
		t.Fatal(err)
	}
	s.Close()
	s = testOpen(t, dir, 0)
	p, err := s.PutWithKey("grid", image, key)
	if err != nil {
		t.Fatal(err)
	}
	if _, _, err := s.Manage(p.ID, p.ManagementToken); err != nil {
		t.Fatal(err)
	}
	if len(s.records) != 1 {
		t.Fatal("retry duplicated uncertain commit")
	}
}

func TestKeyedExpiryAndWindowBoundaries(t *testing.T) {
	now := time.Now().UTC()
	s := testOpen(t, t.TempDir(), 0)
	s.now = func() time.Time { return now }
	data := testPNG(t)
	for _, key := range []string{"", "bad", testKey(t, now.Add(ClockSkew+time.Second))} {
		if _, err := s.PutWithKey("", data, key); !errors.Is(err, ErrKey) {
			t.Fatalf("key validation: %v", err)
		}
	}
	key := testKey(t, now.Add(-RetryWindow))
	if _, err := s.PutWithKey("", data, key); !errors.Is(err, ErrGone) {
		t.Fatalf("creation window: %v", err)
	}
	key = testKey(t, now)
	p, err := s.PutWithKey("", data, key)
	if err != nil {
		t.Fatal(err)
	}
	now = now.Add(2 * RetryWindow)
	if got, err := s.PutWithKey("", data, key); err != nil || got != p {
		t.Fatalf("active recovery after creation window: %v", err)
	}
	now = p.ExpiresAt
	assertMissing(t, s, p.ID)
	if _, status, err := s.Manage(p.ID, p.ManagementToken); status != "expired" || err != nil {
		t.Fatalf("expiry status: %s %v", status, err)
	}
	if _, err := s.PutWithKey("", data, key); !errors.Is(err, ErrGone) {
		t.Fatalf("expiry retry: %v", err)
	}
	if err := s.Cleanup(); err != nil {
		t.Fatal(err)
	}
	if _, err := s.PutWithKey("", data, key); !errors.Is(err, ErrGone) {
		t.Fatalf("recreated expired: %v", err)
	}
}

func TestFailedReceiptCommitFencesUntilRecovery(t *testing.T) {
	for _, afterRename := range []bool{false, true} {
		t.Run(map[bool]string{false: "before rename", true: "after rename"}[afterRename], func(t *testing.T) {
			dir, image := t.TempDir(), testPNG(t)
			s := testOpen(t, dir, 0)
			key := testKey(t, time.Now())
			p, err := s.PutWithKey("", image, key)
			if err != nil {
				t.Fatal(err)
			}
			if afterRename {
				s.syncDir = func() error { return errors.New("sync failed") }
			} else {
				s.rename = func(string, string) error { return errors.New("rename failed") }
			}
			if err := s.Revoke(p.ID, p.ManagementToken); !errors.Is(err, ErrUnavailable) {
				t.Fatal(err)
			}
			if _, _, err := s.Get(p.ID); !errors.Is(err, ErrUnavailable) {
				t.Fatal("unfenced read")
			}
			s.Close()
			s = testOpen(t, dir, 0)
			if afterRename {
				assertMissing(t, s, p.ID)
			} else if _, _, err := s.Get(p.ID); err != nil {
				t.Fatal(err)
			}
			if err := s.Revoke(p.ID, p.ManagementToken); err != nil {
				t.Fatal(err)
			}
			if _, err := s.PutWithKey("", image, key); !errors.Is(err, ErrGone) {
				t.Fatal("retry resurrected failed revocation")
			}
		})
	}
}
