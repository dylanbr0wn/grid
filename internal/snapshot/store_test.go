package snapshot

import (
	"bufio"
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"image"
	"image/color"
	"image/png"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"
)

func testPNG(t *testing.T) []byte {
	t.Helper()
	img := image.NewNRGBA(image.Rect(0, 0, 8, 8))
	img.Set(2, 3, color.NRGBA{R: 123, G: 42, B: 15, A: 255})
	var b bytes.Buffer
	if err := png.Encode(&b, img); err != nil {
		t.Fatal(err)
	}
	return b.Bytes()
}
func testOpen(t *testing.T, dir string, capacity int64) *Store {
	t.Helper()
	s, err := Open(Config{Directory: dir, Capacity: capacity})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { s.Close() })
	return s
}
func testPut(t *testing.T, s *Store, data []byte) Publication {
	t.Helper()
	p, err := s.Put("A frozen grid", data)
	if err != nil {
		t.Fatal(err)
	}
	return p
}
func assertMissing(t *testing.T, s *Store, id string) {
	t.Helper()
	if _, _, err := s.Get(id); !errors.Is(err, ErrNotFound) {
		t.Fatalf("get: %v", err)
	}
}
func assertOnlyLock(t *testing.T, dir string) {
	t.Helper()
	entries, err := os.ReadDir(dir)
	if err != nil {
		t.Fatal(err)
	}
	if len(entries) != 1 || entries[0].Name() != ".lock" {
		t.Fatalf("unreclaimed entries: %v", entries)
	}
}

func TestRestartAndManagementSeparation(t *testing.T) {
	dir, data := t.TempDir(), testPNG(t)
	s := testOpen(t, dir, 0)
	p := testPut(t, s, data)
	if p.ID == p.ManagementToken || !validID(p.ID) || len(p.ManagementToken) != 43 {
		t.Fatalf("invalid credentials: %+v", p)
	}
	if p.ExpiresAt.Sub(p.CreatedAt) != Retention {
		t.Fatal("incorrect retention")
	}
	if err := s.Close(); err != nil {
		t.Fatal(err)
	}
	s = testOpen(t, dir, 0)
	meta, got, err := s.Get(p.ID)
	if err != nil || meta != p.Metadata || !bytes.Equal(got, data) {
		t.Fatalf("restart lost publication: %+v, %v", meta, err)
	}
	public, _ := json.Marshal(meta)
	onDisk, err := os.ReadFile(filepath.Join(dir, p.ID+".snapshot"))
	if err != nil {
		t.Fatal(err)
	}
	if bytes.Contains(onDisk, []byte(p.ManagementToken)) || bytes.Contains(public, []byte("management")) || bytes.Contains(public, []byte(digest([]byte(p.ManagementToken)))) {
		t.Fatal("credential exposed")
	}
	for _, token := range []string{"", p.ID, "bad"} {
		if err := s.Revoke(p.ID, token); !errors.Is(err, ErrUnauthorized) {
			t.Fatalf("accepted token %q: %v", token, err)
		}
	}
	if err := s.Revoke(p.ID, p.ManagementToken); err != nil {
		t.Fatal(err)
	}
	if err := s.Revoke(p.ID, p.ManagementToken); err != nil {
		t.Fatal(err)
	}
	assertMissing(t, s, p.ID)
	assertOnlyLock(t, dir)
	s.Close()
	s = testOpen(t, dir, 0)
	assertMissing(t, s, p.ID)
}

func TestExpiryAndReclamation(t *testing.T) {
	dir, data := t.TempDir(), testPNG(t)
	s := testOpen(t, dir, int64(len(data)))
	now := time.Date(2026, 10, 3, 0, 0, 0, 0, time.UTC)
	s.now = func() time.Time { return now }
	p := testPut(t, s, data)
	now = p.ExpiresAt.Add(-time.Nanosecond)
	if _, _, err := s.Get(p.ID); err != nil {
		t.Fatal(err)
	}
	now = p.ExpiresAt
	assertMissing(t, s, p.ID) // no cleanup has run
	if _, err := os.Stat(filepath.Join(dir, p.ID+".snapshot")); err != nil {
		t.Fatal("test did not retain expired file")
	}
	next := testPut(t, s, data) // reclaims expired capacity before admitting a write
	assertMissing(t, s, p.ID)
	now = next.ExpiresAt
	if err := s.Cleanup(); err != nil {
		t.Fatal(err)
	}
	if err := s.Cleanup(); err != nil {
		t.Fatal(err)
	}
	assertOnlyLock(t, dir)
}

func TestRestartReclaimsExpiredRecords(t *testing.T) {
	dir, data := t.TempDir(), testPNG(t)
	s := testOpen(t, dir, 0)
	s.now = func() time.Time { return time.Now().Add(-Retention) }
	p := testPut(t, s, data)
	s.Close()
	s = testOpen(t, dir, 0)
	assertMissing(t, s, p.ID)
	assertOnlyLock(t, dir)
}

func TestCapacityRacesAndLoweredLimit(t *testing.T) {
	dir, data := t.TempDir(), testPNG(t)
	s := testOpen(t, dir, 3*int64(len(data)))
	var wg sync.WaitGroup
	results := make(chan Publication, 20)
	errs := make(chan error, 20)
	for range 20 {
		wg.Go(func() {
			p, err := s.Put("", data)
			if err != nil {
				errs <- err
			} else {
				results <- p
			}
		})
	}
	wg.Wait()
	close(results)
	close(errs)
	if len(results) != 3 || len(errs) != 17 {
		t.Fatalf("capacity race: %d successes, %d errors", len(results), len(errs))
	}
	for err := range errs {
		if !errors.Is(err, ErrCapacity) {
			t.Fatal(err)
		}
	}
	var ids []string
	for p := range results {
		ids = append(ids, p.ID)
		if _, _, err := s.Get(p.ID); err != nil {
			t.Fatal(err)
		}
	}
	s.Close()
	s = testOpen(t, dir, int64(len(data)))
	if _, err := s.Put("", data); !errors.Is(err, ErrCapacity) {
		t.Fatalf("lowered limit: %v", err)
	}
	for _, id := range ids {
		if _, _, err := s.Get(id); err != nil {
			t.Fatal(err)
		}
	}
	if s.used != 3*int64(len(data)) {
		t.Fatalf("incorrect restart accounting: %d", s.used)
	}
}

func TestPublicationFailuresRecoverWithoutUnaccountedBytes(t *testing.T) {
	for _, stage := range []string{"partial-write", "file-sync", "rename", "directory-sync"} {
		t.Run(stage, func(t *testing.T) {
			dir, data := t.TempDir(), testPNG(t)
			s := testOpen(t, dir, 2*int64(len(data)))
			existing := testPut(t, s, data)
			diskErr := errors.New("injected disk failure")
			switch stage {
			case "partial-write":
				s.persist = func(name string, _ record, _ []byte) error {
					if err := s.root.WriteFile(name, []byte("partial"), 0600); err != nil {
						t.Fatal(err)
					}
					return diskErr
				}
			case "file-sync":
				persist := s.persist
				s.persist = func(name string, r record, b []byte) error {
					if err := persist(name, r, b); err != nil {
						return err
					}
					return diskErr
				}
			case "rename":
				s.rename = func(string, string) error { return diskErr }
			case "directory-sync":
				s.syncDir = func() error { return diskErr }
			}
			if p, err := s.Put("", data); !errors.Is(err, ErrUnavailable) || p.ID != "" {
				t.Fatalf("failed write reported success: %+v %v", p, err)
			}
			if _, err := s.Put("", data); !errors.Is(err, ErrUnavailable) {
				t.Fatalf("failed store admitted write: %v", err)
			}
			s.Close()
			s = testOpen(t, dir, 2*int64(len(data)))
			if _, got, err := s.Get(existing.ID); err != nil || !bytes.Equal(got, data) {
				t.Fatalf("existing snapshot lost: %v", err)
			}
			if stage == "directory-sync" {
				// Rename may have committed even though durability acknowledgement failed.
				// Its complete record must count against capacity after reconciliation.
				if s.used != 2*int64(len(data)) {
					t.Fatal("committed record not accounted")
				}
				if _, err := s.Put("", data); !errors.Is(err, ErrCapacity) {
					t.Fatalf("unaccounted write: %v", err)
				}
			} else {
				if s.used != int64(len(data)) {
					t.Fatal("temporary bytes counted as live")
				}
				testPut(t, s, data)
			}
			entries, _ := os.ReadDir(dir)
			for _, e := range entries {
				if strings.HasPrefix(e.Name(), ".pending-") {
					t.Fatalf("orphan remains: %s", e.Name())
				}
			}
		})
	}
}

func TestInterruptedDeletionNeverResurrects(t *testing.T) {
	for _, stage := range []string{"rename", "barrier-sync", "unlink", "unlink-sync"} {
		t.Run(stage, func(t *testing.T) {
			dir, data := t.TempDir(), testPNG(t)
			s := testOpen(t, dir, int64(len(data)))
			p := testPut(t, s, data)
			diskErr := errors.New("injected cleanup failure")
			switch stage {
			case "rename":
				s.rename = func(string, string) error { return diskErr }
			case "barrier-sync":
				s.syncDir = func() error { return diskErr }
			case "unlink":
				s.remove = func(string) error { return diskErr }
			case "unlink-sync":
				syncDir := s.syncDir
				calls := 0
				s.syncDir = func() error {
					calls++
					if calls == 2 {
						return diskErr
					}
					return syncDir()
				}
			}
			if err := s.Revoke(p.ID, p.ManagementToken); !errors.Is(err, ErrUnavailable) {
				t.Fatalf("failed deletion: %v", err)
			}
			if _, _, err := s.Get(p.ID); !errors.Is(err, ErrUnavailable) {
				t.Fatalf("uncertain store served read: %v", err)
			}
			s.Close()
			s = testOpen(t, dir, int64(len(data)))
			if stage == "rename" { // No read barrier committed; credential can safely retry.
				if err := s.Revoke(p.ID, p.ManagementToken); err != nil {
					t.Fatal(err)
				}
			}
			assertMissing(t, s, p.ID)
			assertOnlyLock(t, dir)
			testPut(t, s, data)
		})
	}
}

func TestRejectInvalidInputAndCorruptRecords(t *testing.T) {
	dir := t.TempDir()
	s := testOpen(t, dir, 0)
	data := testPNG(t)
	for _, b := range [][]byte{nil, []byte("not png"), data[:len(data)-1], make([]byte, MaxImageBytes+1)} {
		if _, err := s.Put("", b); !errors.Is(err, ErrImage) {
			t.Fatalf("invalid PNG accepted: %v", err)
		}
	}
	if _, err := s.Put(strings.Repeat("x", 201), data); !errors.Is(err, ErrTitle) {
		t.Fatal(err)
	}
	if _, err := s.Put(string([]byte{255}), data); !errors.Is(err, ErrTitle) {
		t.Fatal(err)
	}
	assertOnlyLock(t, dir)
	p := testPut(t, s, data)
	s.Close()
	path := filepath.Join(dir, p.ID+".snapshot")
	b, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	b[len(b)-1] ^= 1
	if err := os.WriteFile(path, b, 0600); err != nil {
		t.Fatal(err)
	}
	if bad, err := Open(Config{Directory: dir}); err == nil {
		bad.Close()
		t.Fatal("corrupt record accepted")
	}
	if _, err := os.Stat(path); err != nil {
		t.Fatal("corrupt data was silently discarded")
	}
}

func TestExclusiveOwnershipAndDirectoryRequirements(t *testing.T) {
	dir := t.TempDir()
	s := testOpen(t, dir, 0)
	if other, err := Open(Config{Directory: dir}); err == nil {
		other.Close()
		t.Fatal("concurrent owner accepted")
	}
	s.Close()
	testOpen(t, dir, 0)
	for _, cfg := range []Config{{}, {Directory: dir + "/missing"}, {Directory: dir, Capacity: -1}} {
		if other, err := Open(cfg); err == nil {
			other.Close()
			t.Fatalf("invalid config accepted: %+v", cfg)
		}
	}
	assertMissing(t, testOpen(t, t.TempDir(), 0), "../../etc/passwd")
}

func TestUnknownEntriesAndSymlinksFailClosed(t *testing.T) {
	for _, kind := range []string{"unknown", "symlink", "directory"} {
		t.Run(kind, func(t *testing.T) {
			dir := t.TempDir()
			id, _ := randomString(24)
			switch kind {
			case "unknown":
				if err := os.WriteFile(filepath.Join(dir, "unknown"), []byte("data"), 0600); err != nil {
					t.Fatal(err)
				}
			case "symlink":
				if err := os.Symlink(filepath.Join(t.TempDir(), "outside"), filepath.Join(dir, id+".snapshot")); err != nil {
					t.Fatal(err)
				}
			case "directory":
				if err := os.Mkdir(filepath.Join(dir, ".pending-"+id), 0700); err != nil {
					t.Fatal(err)
				}
			}
			if s, err := Open(Config{Directory: dir}); err == nil {
				s.Close()
				t.Fatal("unexpected entry accepted")
			}
		})
	}
}

func TestProcessRestart(t *testing.T) {
	if os.Getenv("GRID_SNAPSHOT_TEST_CHILD") == "1" {
		s, err := Open(Config{Directory: os.Getenv("GRID_SNAPSHOT_TEST_DIR")})
		if err != nil {
			t.Fatal(err)
		}
		p := testPut(t, s, testPNG(t))
		b, _ := json.Marshal(p)
		fmt.Println(string(b))
		time.Sleep(time.Hour)
		return
	}
	dir := t.TempDir()
	cmd := exec.Command(os.Args[0], "-test.run=^TestProcessRestart$")
	cmd.Env = append(os.Environ(), "GRID_SNAPSHOT_TEST_CHILD=1", "GRID_SNAPSHOT_TEST_DIR="+dir)
	out, err := cmd.StdoutPipe()
	if err != nil {
		t.Fatal(err)
	}
	cmd.Stderr = os.Stderr
	if err := cmd.Start(); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { cmd.Process.Kill(); cmd.Wait() })
	lines := make(chan string, 1)
	go func() {
		scanner := bufio.NewScanner(out)
		if scanner.Scan() {
			lines <- scanner.Text()
		} else {
			lines <- ""
		}
	}()
	var p Publication
	select {
	case line := <-lines:
		if err := json.Unmarshal([]byte(line), &p); err != nil {
			t.Fatal(err)
		}
	case <-time.After(10 * time.Second):
		t.Fatal("child did not publish")
	}
	if s, err := Open(Config{Directory: dir}); err == nil {
		s.Close()
		t.Fatal("child lock not held")
	}
	if err := cmd.Process.Kill(); err != nil {
		t.Fatal(err)
	}
	_ = cmd.Wait()
	s := testOpen(t, dir, 0)
	if meta, b, err := s.Get(p.ID); err != nil || meta != p.Metadata || !bytes.Equal(b, testPNG(t)) {
		t.Fatalf("process restart lost committed image: %v", err)
	}
	if err := s.Revoke(p.ID, p.ManagementToken); err != nil {
		t.Fatal(err)
	}
}
