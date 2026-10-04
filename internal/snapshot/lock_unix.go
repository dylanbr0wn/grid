//go:build linux || darwin

package snapshot

import (
	"golang.org/x/sys/unix"
	"os"
)

func lockDirectory(f *os.File) error {
	return unix.Flock(int(f.Fd()), unix.LOCK_EX|unix.LOCK_NB)
}
