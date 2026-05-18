package server

import (
	"encoding/json"
	"net/http"
	"os"
	"os/exec"
	"strconv"
	"strings"

	"github.com/nyokokarmanugroho/zero/gateway/internal/runs"
)

type createRunRequest struct {
	Query             string  `json:"query"`
	Type              string  `json:"type"`
	EstimatedValueUsd float64 `json:"estimatedValueUsd"`
}

var allowedJobTypes = map[string]struct{}{
	"ace-research": {},
	"ace-demo":     {},
}

// WorkerTrigger starts background job processing for a run. Production uses triggerWorker;
// tests inject a no-op to avoid spawning pnpm worker subprocesses.
type WorkerTrigger func(runID, jobType, query string, value float64, store *runs.Store)

func CreateRunHandler(store *runs.Store) http.HandlerFunc {
	return CreateRunHandlerWithTrigger(store, triggerWorker)
}

func CreateRunHandlerWithTrigger(store *runs.Store, trigger WorkerTrigger) http.HandlerFunc {
	if trigger == nil {
		trigger = triggerWorker
	}
	return func(w http.ResponseWriter, r *http.Request) {
		var req createRunRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "invalid json", http.StatusBadRequest)
			return
		}

		query, ok := sanitizeQuery(req.Query)
		if !ok {
			if strings.TrimSpace(req.Query) == "" {
				query = "Summarize Solana agent ecosystem"
			} else {
				http.Error(w, "query rejected by policy", http.StatusBadRequest)
				return
			}
		}

		jobType := strings.TrimSpace(req.Type)
		if jobType == "" {
			jobType = "ace-research"
		}
		if _, allowed := allowedJobTypes[jobType]; !allowed {
			http.Error(w, "invalid job type", http.StatusBadRequest)
			return
		}

		maxEscrow := 10.0
		if v := strings.TrimSpace(os.Getenv("MAX_ESCROW_USD")); v != "" {
			if parsed, err := strconv.ParseFloat(v, 64); err == nil && parsed > 0 {
				maxEscrow = parsed
			}
		}
		value := req.EstimatedValueUsd
		if value < 0 || value > maxEscrow {
			http.Error(w, "estimatedValueUsd out of range", http.StatusBadRequest)
			return
		}

		run := store.Create()
		store.Update(run.ID, func(rr *runs.Run) {
			rr.Status = runs.StatusRunning
			rr.Query = query
			rr.Type = jobType
		})

		go trigger(run.ID, jobType, query, value, store)

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusAccepted)
		_ = json.NewEncoder(w).Encode(run)
	}
}

func GetRunHandler(store *runs.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id := r.PathValue("id")
		run, ok := store.Get(id)
		if !ok {
			http.Error(w, "not found", http.StatusNotFound)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(run)
	}
}

func triggerWorker(runID, jobType, query string, value float64, store *runs.Store) {
	cmd := exec.Command("pnpm", "run", "worker")
	cmd.Dir = workerDir()
	cmd.Env = append(os.Environ(),
		"ZERO_RUN_ID="+runID,
		"ZERO_JOB_TYPE="+jobType,
		"ZERO_JOB_QUERY="+query,
		"ZERO_JOB_ESTIMATED_VALUE_USD="+strconv.FormatFloat(value, 'f', -1, 64),
	)
	out, err := cmd.CombinedOutput()
	if err != nil {
		store.Update(runID, func(rr *runs.Run) {
			rr.Status = runs.StatusFailed
			rr.Error = err.Error() + ": " + string(out)
		})
		return
	}
	store.Update(runID, func(rr *runs.Run) {
		rr.Status = runs.StatusSucceeded
		rr.Route = "x402"
	})
}

func workerDir() string {
	return "../orchestrator"
}
