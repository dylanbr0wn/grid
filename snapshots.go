package main

import (
	"errors"
	"fmt"
	"net"
	"net/url"
	"os"
	"strconv"
	"strings"

	"github.com/dylanbr0wn/grid/internal/server"
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

func snapshotHTTPConfig() (server.Config, error) {
	var cfg server.Config
	if raw := os.Getenv("SNAPSHOT_PUBLIC_ORIGIN"); raw != "" {
		u, err := url.Parse(raw)
		if err != nil || (u.Scheme != "http" && u.Scheme != "https") || u.Hostname() == "" || u.User != nil || (u.Path != "" && u.Path != "/") || u.RawQuery != "" || u.ForceQuery || u.Fragment != "" || u.Opaque != "" {
			return cfg, errors.New("SNAPSHOT_PUBLIC_ORIGIN must be an http(s) origin without credentials, path, query, or fragment")
		}
		cfg.SnapshotPublicOrigin = u.Scheme + "://" + u.Host
	}
	for name, dest := range map[string]*int{
		"SNAPSHOT_UPLOADS_PER_IP": &cfg.SnapshotUploadsPerIP,
		"SNAPSHOT_UPLOADS_GLOBAL": &cfg.SnapshotUploadsGlobal,
	} {
		if raw := os.Getenv(name); raw != "" {
			n, err := strconv.Atoi(raw)
			if err != nil || n <= 0 {
				return cfg, fmt.Errorf("%s must be a positive integer", name)
			}
			*dest = n
		}
	}
	if raw := os.Getenv("SNAPSHOT_TRUSTED_PROXIES"); raw != "" {
		for _, value := range strings.Split(raw, ",") {
			value = strings.TrimSpace(value)
			if net.ParseIP(value) == nil {
				if _, _, err := net.ParseCIDR(value); err != nil {
					return cfg, errors.New("SNAPSHOT_TRUSTED_PROXIES must contain IP addresses or CIDR ranges")
				}
			}
			cfg.SnapshotTrustedProxies = append(cfg.SnapshotTrustedProxies, value)
		}
	}
	return cfg, nil
}
