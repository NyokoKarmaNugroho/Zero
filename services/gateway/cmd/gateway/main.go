package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/nyokokarmanugroho/zero/gateway/internal/runs"
	"github.com/nyokokarmanugroho/zero/gateway/internal/server"
)

func main() {
	addr := os.Getenv("GATEWAY_HTTP_ADDR")
	if addr == "" {
		addr = ":8080"
	}

	server.WarnIfGatewayInsecure()

	rpm := 30
	if v := os.Getenv("GATEWAY_RATE_LIMIT_RPM"); v != "" {
		if parsed, err := strconv.Atoi(v); err == nil {
			rpm = parsed
		}
	}
	limiter := server.NewRateLimiterPublic(rpm)

	store := runs.NewStore()
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]string{"status": "ok", "service": "zero-gateway"})
	})

	createRun := server.CreateRunHandler(store)
	createRun = server.WithAPIKey(createRun)
	createRun = server.WithRateLimit(limiter, createRun)
	mux.HandleFunc("POST /v1/runs", createRun)
	mux.HandleFunc("GET /v1/runs/{id}", server.GetRunHandler(store))

	srv := &http.Server{
		Addr:              addr,
		Handler:           loggingMiddleware(mux),
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      120 * time.Second,
		MaxHeaderBytes:    1 << 20,
	}

	log.Printf("zero-gateway listening on %s", addr)
	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatal(err)
	}
}

func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		log.Printf("%s %s %s", r.Method, r.URL.Path, time.Since(start))
	})
}
