// Package snapshot stores immutable images in an exclusively owned directory.
package snapshot

import (
	"bytes"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/binary"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"image/png"
	"io"
	"os"
	"strings"
	"sync"
	"time"
	"unicode/utf8"
)

const (
	DefaultCapacity int64 = 250_000_000
	MaxImageBytes         = 10_000_000
	Retention             = 90 * 24 * time.Hour
	maxHeaderBytes        = 4096
)

var (
	ErrNotFound     = errors.New("snapshot not found")
	ErrUnauthorized = errors.New("invalid management credential")
	ErrCapacity     = errors.New("snapshot storage is full")
	ErrImage        = errors.New("invalid PNG or image exceeds limits")
	ErrTitle        = errors.New("title must be valid UTF-8 and at most 200 characters")
	ErrUnavailable  = errors.New("snapshot store unavailable; close and reopen to reconcile")
)

type Config struct {
	// Directory must already exist. Open never creates a fallback directory.
	Directory string
	// Capacity bounds image bytes, excluding record headers. Zero uses the default.
	Capacity int64
}

// Metadata is safe to expose to public readers. It contains no authorization data.
type Metadata struct {
	ID         string    `json:"id"`
	Title      string    `json:"title"`
	CreatedAt  time.Time `json:"createdAt"`
	ExpiresAt  time.Time `json:"expiresAt"`
	ImageBytes int64     `json:"imageBytes"`
}

type Publication struct {
	Metadata
	ManagementToken string `json:"managementToken"`
}

type record struct {
	Version int `json:"version"`
	Metadata
	ManagementHash string `json:"managementHash"`
	ImageHash      string `json:"imageHash"`
}

type Store struct {
	mu          sync.Mutex
	root        *os.Root
	lock        *os.File
	records     map[string]record
	used        int64
	capacity    int64
	now         func() time.Time
	unavailable bool
	// These operations are also fault-injection points for durability tests.
	persist func(string, record, []byte) error
	rename  func(string, string) error
	remove  func(string) error
	syncDir func() error
}

func Open(cfg Config) (*Store, error) {
	if cfg.Directory == "" || cfg.Capacity < 0 {
		return nil, errors.New("snapshot directory is required and capacity cannot be negative")
	}
	if cfg.Capacity == 0 {
		cfg.Capacity = DefaultCapacity
	}
	root, err := os.OpenRoot(cfg.Directory)
	if err != nil {
		return nil, fmt.Errorf("open snapshot directory: %w", err)
	}
	s := &Store{root: root, records: make(map[string]record), capacity: cfg.Capacity, now: time.Now}
	s.rename, s.remove = root.Rename, root.Remove
	s.persist, s.syncDir = s.writeRecord, s.syncDirectory
	// Never unlink the lock file: its inode must be shared by every opener.
	info, err := root.Lstat(".lock")
	if err == nil && !info.Mode().IsRegular() {
		root.Close()
		return nil, errors.New("snapshot lock is not a regular file")
	}
	if err != nil && !errors.Is(err, os.ErrNotExist) {
		root.Close()
		return nil, err
	}
	s.lock, err = root.OpenFile(".lock", os.O_CREATE|os.O_RDWR, 0600)
	if err == nil {
		err = lockDirectory(s.lock)
	}
	if err != nil {
		s.Close()
		return nil, fmt.Errorf("lock snapshot directory: %w", err)
	}
	if err := s.recover(); err != nil {
		s.Close()
		return nil, fmt.Errorf("recover snapshot directory: %w", err)
	}
	return s, nil
}

func (s *Store) Close() error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.unavailable = true
	var err error
	if s.lock != nil {
		err = s.lock.Close()
		s.lock = nil
	}
	if s.root != nil {
		err = errors.Join(err, s.root.Close())
		s.root = nil
	}
	return err
}

func (s *Store) Put(title string, image []byte) (Publication, error) {
	if !utf8.ValidString(title) || utf8.RuneCountInString(title) > 200 {
		return Publication{}, ErrTitle
	}
	if len(image) == 0 || len(image) > MaxImageBytes {
		return Publication{}, ErrImage
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.unavailable {
		return Publication{}, ErrUnavailable
	}
	cfg, err := png.DecodeConfig(bytes.NewReader(image))
	if err != nil || cfg.Width > 2560 || cfg.Height > 2560 {
		return Publication{}, ErrImage
	}
	if _, err := png.Decode(bytes.NewReader(image)); err != nil {
		return Publication{}, ErrImage
	}
	if err := s.cleanup(); err != nil {
		return Publication{}, s.fail(err)
	}
	if int64(len(image)) > s.capacity-s.used {
		return Publication{}, ErrCapacity
	}
	id, err := randomString(24)
	if err != nil {
		return Publication{}, err
	}
	token, err := randomString(32)
	if err != nil {
		return Publication{}, err
	}
	// A collision must never overwrite an existing publication.
	if _, err := s.root.Lstat(id + ".snapshot"); !errors.Is(err, os.ErrNotExist) {
		return Publication{}, s.fail(errors.New("snapshot identity collision or inaccessible path"))
	}
	now := s.now().UTC()
	rec := record{
		Version: 1,
		Metadata: Metadata{
			ID: id, Title: title, CreatedAt: now,
			ExpiresAt: now.Add(Retention), ImageBytes: int64(len(image)),
		},
		ManagementHash: digest([]byte(token)),
		ImageHash:      digest(image),
	}
	pending := ".pending-" + id
	if err := s.persist(pending, rec, image); err != nil {
		return Publication{}, s.fail(err)
	}
	if err := s.rename(pending, id+".snapshot"); err != nil {
		return Publication{}, s.fail(err)
	}
	if err := s.syncDir(); err != nil {
		return Publication{}, s.fail(err)
	}
	s.records[id] = rec
	s.used += rec.ImageBytes
	return Publication{Metadata: rec.Metadata, ManagementToken: token}, nil
}

// Get checks expiry at access time and returns the exact stored bytes.
func (s *Store) Get(id string) (Metadata, []byte, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.unavailable {
		return Metadata{}, nil, ErrUnavailable
	}
	rec, ok := s.records[id]
	if !ok || !s.now().Before(rec.ExpiresAt) {
		return Metadata{}, nil, ErrNotFound
	}
	stored, image, err := s.readRecord(id + ".snapshot")
	if err != nil || stored != rec {
		return Metadata{}, nil, s.fail(errors.Join(errors.New("snapshot record changed or unreadable"), err))
	}
	return rec.Metadata, image, nil
}

// Revoke is idempotent for absent records. Live records require the separate token.
func (s *Store) Revoke(id, token string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.unavailable {
		return ErrUnavailable
	}
	rec, ok := s.records[id]
	if !ok {
		return nil
	}
	actual := digest([]byte(token))
	if subtle.ConstantTimeCompare([]byte(actual), []byte(rec.ManagementHash)) != 1 {
		return ErrUnauthorized
	}
	if err := s.delete(rec); err != nil {
		return s.fail(err)
	}
	return nil
}

func (s *Store) Cleanup() error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.unavailable {
		return ErrUnavailable
	}
	if err := s.cleanup(); err != nil {
		return s.fail(err)
	}
	return nil
}

func (s *Store) cleanup() error {
	now := s.now()
	for _, rec := range s.records {
		if !now.Before(rec.ExpiresAt) {
			if err := s.delete(rec); err != nil {
				return err
			}
		}
	}
	return nil
}

func (s *Store) delete(rec record) error {
	deleted := ".deleted-" + rec.ID
	// Persist the read barrier before unlinking the bytes. Restart never resurrects it.
	if err := s.rename(rec.ID+".snapshot", deleted); err != nil {
		return err
	}
	if err := s.syncDir(); err != nil {
		return err
	}
	if err := s.remove(deleted); err != nil {
		return err
	}
	if err := s.syncDir(); err != nil {
		return err
	}
	delete(s.records, rec.ID)
	s.used -= rec.ImageBytes
	return nil
}

func (s *Store) fail(err error) error {
	// An uncertain filesystem mutation must not admit further writes or reads.
	// Reopening reconciles disk state before service resumes.
	s.unavailable = true
	return errors.Join(ErrUnavailable, err)
}

func (s *Store) writeRecord(name string, rec record, image []byte) error {
	header, err := json.Marshal(rec)
	if err != nil {
		return err
	}
	f, err := s.root.OpenFile(name, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0600)
	if err != nil {
		return err
	}
	var prefix [4]byte
	binary.BigEndian.PutUint32(prefix[:], uint32(len(header)))
	_, err = f.Write(prefix[:])
	if err == nil {
		_, err = f.Write(header)
	}
	if err == nil {
		_, err = f.Write(image)
	}
	if err == nil {
		err = f.Sync()
	}
	return errors.Join(err, f.Close())
}

func (s *Store) readRecord(name string) (record, []byte, error) {
	var rec record
	info, err := s.root.Lstat(name)
	if err != nil {
		return rec, nil, err
	}
	if !info.Mode().IsRegular() || info.Size() > MaxImageBytes+maxHeaderBytes+4 {
		return rec, nil, errors.New("invalid snapshot file")
	}
	f, err := s.root.Open(name)
	if err != nil {
		return rec, nil, err
	}
	defer f.Close()
	var prefix [4]byte
	if _, err := io.ReadFull(f, prefix[:]); err != nil {
		return rec, nil, err
	}
	size := binary.BigEndian.Uint32(prefix[:])
	if size == 0 || size > maxHeaderBytes {
		return rec, nil, errors.New("invalid snapshot header size")
	}
	header := make([]byte, size)
	if _, err := io.ReadFull(f, header); err != nil {
		return rec, nil, err
	}
	decoder := json.NewDecoder(bytes.NewReader(header))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&rec); err != nil {
		return rec, nil, err
	}
	if err := decoder.Decode(new(any)); err != io.EOF {
		return rec, nil, errors.New("trailing snapshot metadata")
	}
	if rec.Version != 1 || !validID(rec.ID) || name != rec.ID+".snapshot" ||
		rec.ImageBytes <= 0 || rec.ImageBytes > MaxImageBytes ||
		!validDigest(rec.ManagementHash) || !validDigest(rec.ImageHash) ||
		rec.CreatedAt.IsZero() || !rec.ExpiresAt.Equal(rec.CreatedAt.Add(Retention)) ||
		!utf8.ValidString(rec.Title) || utf8.RuneCountInString(rec.Title) > 200 {
		return rec, nil, errors.New("invalid snapshot metadata")
	}
	if info.Size() != 4+int64(size)+rec.ImageBytes {
		return rec, nil, errors.New("snapshot size mismatch")
	}
	image, err := io.ReadAll(io.LimitReader(f, rec.ImageBytes+1))
	if err != nil {
		return rec, nil, err
	}
	if int64(len(image)) != rec.ImageBytes || digest(image) != rec.ImageHash {
		return rec, nil, errors.New("snapshot image checksum mismatch")
	}
	return rec, image, nil
}

func (s *Store) recover() error {
	dir, err := s.root.Open(".")
	if err != nil {
		return err
	}
	entries, err := dir.ReadDir(-1)
	err = errors.Join(err, dir.Close())
	if err != nil {
		return err
	}
	for _, entry := range entries {
		name := entry.Name()
		if name == ".lock" {
			continue
		}
		if strings.HasPrefix(name, ".pending-") || strings.HasPrefix(name, ".deleted-") {
			prefix := ".pending-"
			if strings.HasPrefix(name, ".deleted-") {
				prefix = ".deleted-"
			}
			if !validID(strings.TrimPrefix(name, prefix)) || !entry.Type().IsRegular() {
				return fmt.Errorf("unexpected recovery entry %q", name)
			}
			if err := s.remove(name); err != nil {
				return err
			}
			continue
		}
		rec, _, err := s.readRecord(name)
		if err != nil {
			return fmt.Errorf("%s: %w", name, err)
		}
		s.records[rec.ID] = rec
		s.used += rec.ImageBytes
	}
	if err := s.syncDir(); err != nil {
		return err
	}
	return s.cleanup()
}

func (s *Store) syncDirectory() error {
	dir, err := s.root.Open(".")
	if err != nil {
		return err
	}
	return errors.Join(dir.Sync(), dir.Close())
}

func randomString(size int) (string, error) {
	b := make([]byte, size)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}
func digest(b []byte) string { h := sha256.Sum256(b); return hex.EncodeToString(h[:]) }
func validDigest(s string) bool {
	b, err := hex.DecodeString(s)
	return err == nil && len(b) == sha256.Size
}
func validID(id string) bool {
	b, err := base64.RawURLEncoding.DecodeString(id)
	return err == nil && len(b) == 24 && base64.RawURLEncoding.EncodeToString(b) == id
}
