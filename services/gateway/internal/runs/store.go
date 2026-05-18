package runs

import (
	"sync"
	"time"

	"github.com/google/uuid"
)

type Status string

const (
	StatusPending   Status = "pending"
	StatusRunning   Status = "running"
	StatusSucceeded Status = "succeeded"
	StatusFailed    Status = "failed"
)

type Run struct {
	ID        string    `json:"id"`
	Status    Status    `json:"status"`
	Type      string    `json:"type,omitempty"`
	Query     string    `json:"query,omitempty"`
	Route     string    `json:"route,omitempty"`
	Txs       []string  `json:"txSignatures,omitempty"`
	Services  []string  `json:"aceServiceIds,omitempty"`
	Error     string    `json:"errorMessage,omitempty"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type Store struct {
	mu   sync.RWMutex
	data map[string]*Run
}

func NewStore() *Store {
	return &Store{data: make(map[string]*Run)}
}

func (s *Store) Create() *Run {
	s.mu.Lock()
	defer s.mu.Unlock()
	id := generateID()
	now := time.Now().UTC()
	r := &Run{ID: id, Status: StatusPending, CreatedAt: now, UpdatedAt: now}
	s.data[id] = r
	return r
}

func (s *Store) Get(id string) (*Run, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	r, ok := s.data[id]
	return r, ok
}

func (s *Store) Update(id string, fn func(*Run)) (*Run, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	r, ok := s.data[id]
	if !ok {
		return nil, false
	}
	fn(r)
	r.UpdatedAt = time.Now().UTC()
	return r, true
}

func generateID() string {
	return uuid.NewString()
}
