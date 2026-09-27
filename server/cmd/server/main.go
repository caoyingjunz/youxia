package main

import (
	"log"
	"net/http"
	"os"
	"path/filepath"

	"github.com/youxia-platform/youxia/server/internal/auth"
	"github.com/youxia-platform/youxia/server/internal/catalog"
	"github.com/youxia-platform/youxia/server/internal/match"
	"github.com/youxia-platform/youxia/server/internal/store"
	"github.com/youxia-platform/youxia/server/internal/ws"
)

func main() {
	addr := env("YOUXIA_ADDR", ":8080")
	jwtSecret := env("YOUXIA_JWT_SECRET", "youxia-dev-secret-change-me")
	dataDir := env("YOUXIA_DATA", "./data")

	if err := os.MkdirAll(dataDir, 0o755); err != nil {
		log.Fatal(err)
	}

	db, err := store.Open(filepath.Join(dataDir, "youxia.db"))
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	if err := catalog.Seed(db); err != nil {
		log.Fatal(err)
	}

	authSvc := auth.New(db, jwtSecret)
	hub := match.NewHub()
	go hub.Run()

	mux := http.NewServeMux()
	auth.RegisterRoutes(mux, authSvc)
	catalog.RegisterRoutes(mux, db, authSvc)
	ws.RegisterRoutes(mux, authSvc, hub)

	mux.HandleFunc("GET /api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"ok":true,"service":"youxia"}`))
	})
	mux.HandleFunc("GET /api/announcements", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`[
		  {"id":"1","title":"欢迎来到游侠","body":"登录后即可匹配街机对战。请自备合法 ROM，并安装 RetroArch。","createdAt":"2026-09-26"},
		  {"id":"2","title":"USB 手柄","body":"支持常见 USB 街机摇杆（XInput/DInput）。插入后在客户端「手柄」页测试。","createdAt":"2026-09-26"}
		]`))
	})

	handler := withCORS(mux)
	log.Printf("游侠 API listening on %s", addr)
	log.Fatal(http.ListenAndServe(addr, handler))
}

func env(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
