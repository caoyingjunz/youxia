package ws

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/gorilla/websocket"
	"github.com/youxia-platform/youxia/server/internal/auth"
	"github.com/youxia-platform/youxia/server/internal/match"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

type connClient struct {
	userID   string
	username string
	conn     *websocket.Conn
}

func (c *connClient) UserID() string   { return c.userID }
func (c *connClient) Username() string { return c.username }
func (c *connClient) Send(v any) error {
	return c.conn.WriteJSON(v)
}

func RegisterRoutes(mux *http.ServeMux, authSvc *auth.Service, hub *match.Hub) {
	mux.HandleFunc("GET /api/ws", func(w http.ResponseWriter, r *http.Request) {
		token := r.URL.Query().Get("token")
		if token == "" {
			h := r.Header.Get("Authorization")
			token = strings.TrimPrefix(h, "Bearer ")
		}
		uid, uname, err := authSvc.UserFromToken(token)
		if err != nil {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			return
		}
		client := &connClient{userID: uid, username: uname, conn: conn}
		hub.Register(client)
		defer func() {
			hub.Unregister(client)
			_ = conn.Close()
		}()
		for {
			_, data, err := conn.ReadMessage()
			if err != nil {
				return
			}
			var msg map[string]any
			if err := json.Unmarshal(data, &msg); err != nil {
				_ = client.Send(map[string]any{"type": "error", "error": "bad json"})
				continue
			}
			hub.Inbox(match.Envelope{From: client, Msg: msg})
		}
	})
}
