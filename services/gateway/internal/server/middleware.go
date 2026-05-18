package server

import (
	"log"
	"net"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"
)

const maxJobQueryLen = 2000

type rateLimiter struct {
	mu      sync.Mutex
	window  time.Duration
	limit   int
	hits    map[string][]time.Time
}

func NewRateLimiterPublic(rpm int) *rateLimiter {
	return newRateLimiter(rpm)
}

func newRateLimiter(rpm int) *rateLimiter {
	if rpm <= 0 {
		return nil
	}
	return &rateLimiter{
		window: time.Minute,
		limit:  rpm,
		hits:   make(map[string][]time.Time),
	}
}

func (r *rateLimiter) allow(key string) bool {
	if r == nil {
		return true
	}
	now := time.Now()
	r.mu.Lock()
	defer r.mu.Unlock()
	cutoff := now.Add(-r.window)
	prev := r.hits[key]
	filtered := prev[:0]
	for _, t := range prev {
		if t.After(cutoff) {
			filtered = append(filtered, t)
		}
	}
	if len(filtered) >= r.limit {
		r.hits[key] = filtered
		return false
	}
	r.hits[key] = append(filtered, now)
	return true
}

func clientKey(r *http.Request) string {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	if fwd := r.Header.Get("X-Forwarded-For"); fwd != "" {
		return strings.TrimSpace(strings.Split(fwd, ",")[0])
	}
	return host
}

func WithAPIKey(next http.HandlerFunc) http.HandlerFunc {
	required := strings.TrimSpace(os.Getenv("GATEWAY_API_KEY"))
	return func(w http.ResponseWriter, r *http.Request) {
		if required == "" {
			next(w, r)
			return
		}
		got := strings.TrimSpace(r.Header.Get("X-API-Key"))
		if got == "" {
			auth := r.Header.Get("Authorization")
			if strings.HasPrefix(strings.ToLower(auth), "bearer ") {
				got = strings.TrimSpace(auth[7:])
			}
		}
		if got != required {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		next(w, r)
	}
}

func WithRateLimit(limiter *rateLimiter, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if limiter != nil && !limiter.allow(clientKey(r)) {
			http.Error(w, "rate limit exceeded", http.StatusTooManyRequests)
			return
		}
		next(w, r)
	}
}

func WarnIfGatewayInsecure() {
	if strings.TrimSpace(os.Getenv("GATEWAY_API_KEY")) == "" {
		log.Println("[gateway] WARNING: GATEWAY_API_KEY unset — POST /v1/runs is open (dev only)")
	}
}

func sanitizeQuery(q string) (string, bool) {
	q = strings.TrimSpace(q)
	if q == "" {
		return "", false
	}
	if len(q) > maxJobQueryLen {
		return "", false
	}
	lower := strings.ToLower(q)
	blocked := []string{
		"ignore previous instructions",
		"ignore all previous",
		"javascript:",
		"<script",
		"sk-or-v1-",
	}
	for _, b := range blocked {
		if strings.Contains(lower, b) {
			return "", false
		}
	}
	return q, true
}
