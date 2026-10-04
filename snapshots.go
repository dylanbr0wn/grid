package main

import (
	"errors"
	"strconv"

	"github.com/dylanbr0wn/grid/internal/snapshot"
)

func openSnapshots(directory, capacity string) (*snapshot.Store, error) {
	if directory == "" {
		if capacity != "" {
			return nil, errors.New("SNAPSHOT_CAPACITY_BYTES requires SNAPSHOT_DIR")
		}
		return nil, nil
	}
	cfg := snapshot.Config{Directory: directory}
	if capacity != "" {
		n, err := strconv.ParseInt(capacity, 10, 64)
		if err != nil || n <= 0 {
			return nil, errors.New("SNAPSHOT_CAPACITY_BYTES must be a positive integer")
		}
		cfg.Capacity = n
	}
	return snapshot.Open(cfg)
}
