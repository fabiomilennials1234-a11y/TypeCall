package observability

import (
	"encoding/json"
	"net/http"
	"runtime"
	"sync/atomic"
	"time"
)

var (
	startTime      = time.Now()
	requestCount   atomic.Int64
	errorCount     atomic.Int64
	request5xxCount atomic.Int64
)

func IncrementRequests() { requestCount.Add(1) }
func IncrementErrors()   { errorCount.Add(1) }
func Increment5xx()      { request5xxCount.Add(1) }

type metricsPayload struct {
	Uptime       string  `json:"uptime"`
	GoVersion    string  `json:"go_version"`
	Goroutines   int     `json:"goroutines"`
	HeapAllocMB  float64 `json:"heap_alloc_mb"`
	HeapSysMB    float64 `json:"heap_sys_mb"`
	NumGC        uint32  `json:"num_gc"`
	Requests     int64   `json:"requests_total"`
	Errors       int64   `json:"errors_total"`
	Server5xx    int64   `json:"server_5xx_total"`
}

func MetricsHandler(w http.ResponseWriter, r *http.Request) {
	var m runtime.MemStats
	runtime.ReadMemStats(&m)

	payload := metricsPayload{
		Uptime:      time.Since(startTime).Round(time.Second).String(),
		GoVersion:   runtime.Version(),
		Goroutines:  runtime.NumGoroutine(),
		HeapAllocMB: float64(m.HeapAlloc) / 1024 / 1024,
		HeapSysMB:   float64(m.HeapSys) / 1024 / 1024,
		NumGC:       m.NumGC,
		Requests:    requestCount.Load(),
		Errors:      errorCount.Load(),
		Server5xx:   request5xxCount.Load(),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(payload)
}
