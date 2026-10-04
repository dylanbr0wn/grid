//go:build !linux && !darwin

package snapshot

import (
	"errors"
	"os"
)

func lockDirectory(*os.File) error {
	return errors.New("durable snapshot storage requires Linux or macOS")
}
