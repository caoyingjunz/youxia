package match

import (
	"encoding/json"
	"sync"
	"time"

	"github.com/google/uuid"
)

type Client interface {
	UserID() string
	Username() string
	Send(v any) error
}

type Hub struct {
	register   chan Client
	unregister chan Client
	inbox      chan Envelope

	mu      sync.Mutex
	clients map[string]Client
	queues  map[string][]string // gameID -> userIDs waiting
	rooms   map[string]*Room
}

type Envelope struct {
	From Client
	Msg  map[string]any
}

type Room struct {
	ID        string         `json:"id"`
	GameID    string         `json:"gameId"`
	HostID    string         `json:"hostId"`
	HostName  string         `json:"hostName"`
	GuestID   string         `json:"guestId"`
	GuestName string         `json:"guestName"`
	HostAddr  string         `json:"hostAddr,omitempty"`
	HostPort  int            `json:"hostPort,omitempty"`
	Status    string         `json:"status"`
	CreatedAt time.Time      `json:"createdAt"`
	Members   map[string]bool `json:"-"`
}

func NewHub() *Hub {
	return &Hub{
		register:   make(chan Client),
		unregister: make(chan Client),
		inbox:      make(chan Envelope, 128),
		clients:    map[string]Client{},
		queues:     map[string][]string{},
		rooms:      map[string]*Room{},
	}
}

func (h *Hub) Run() {
	for {
		select {
		case c := <-h.register:
			h.mu.Lock()
			h.clients[c.UserID()] = c
			h.mu.Unlock()
			_ = c.Send(map[string]any{"type": "welcome", "userId": c.UserID(), "username": c.Username()})
		case c := <-h.unregister:
			h.mu.Lock()
			delete(h.clients, c.UserID())
			for gid, q := range h.queues {
				h.queues[gid] = filterOut(q, c.UserID())
			}
			h.mu.Unlock()
		case env := <-h.inbox:
			h.handle(env)
		}
	}
}

func (h *Hub) Register(c Client)   { h.register <- c }
func (h *Hub) Unregister(c Client) { h.unregister <- c }
func (h *Hub) Inbox(env Envelope)  { h.inbox <- env }

func (h *Hub) handle(env Envelope) {
	typ, _ := env.Msg["type"].(string)
	switch typ {
	case "queue":
		gameID, _ := env.Msg["gameId"].(string)
		if gameID == "" {
			_ = env.From.Send(map[string]any{"type": "error", "error": "gameId required"})
			return
		}
		h.enqueue(env.From, gameID)
	case "cancel_queue":
		h.mu.Lock()
		for gid, q := range h.queues {
			h.queues[gid] = filterOut(q, env.From.UserID())
		}
		h.mu.Unlock()
		_ = env.From.Send(map[string]any{"type": "queue_cancelled"})
	case "netplay_host":
		roomID, _ := env.Msg["roomId"].(string)
		addr, _ := env.Msg["addr"].(string)
		port := intFrom(env.Msg["port"])
		h.setHost(roomID, env.From.UserID(), addr, port)
	case "leave_room":
		roomID, _ := env.Msg["roomId"].(string)
		h.leaveRoom(roomID, env.From.UserID())
	default:
		_ = env.From.Send(map[string]any{"type": "error", "error": "unknown type"})
	}
}

func (h *Hub) enqueue(c Client, gameID string) {
	h.mu.Lock()
	defer h.mu.Unlock()

	q := h.queues[gameID]
	for _, id := range q {
		if id == c.UserID() {
			_ = c.Send(map[string]any{"type": "queued", "gameId": gameID, "position": indexOf(q, c.UserID()) + 1})
			return
		}
	}
	q = append(q, c.UserID())
	h.queues[gameID] = q
	_ = c.Send(map[string]any{"type": "queued", "gameId": gameID, "position": len(q)})

	if len(q) >= 2 {
		hostID, guestID := q[0], q[1]
		h.queues[gameID] = q[2:]
		host := h.clients[hostID]
		guest := h.clients[guestID]
		if host == nil || guest == nil {
			return
		}
		room := &Room{
			ID:        uuid.NewString(),
			GameID:    gameID,
			HostID:    hostID,
			HostName:  host.Username(),
			GuestID:   guestID,
			GuestName: guest.Username(),
			Status:    "ready",
			CreatedAt: time.Now(),
			Members:   map[string]bool{hostID: true, guestID: true},
		}
		h.rooms[room.ID] = room
		payload, _ := json.Marshal(room)
		var roomMap map[string]any
		_ = json.Unmarshal(payload, &roomMap)
		msg := map[string]any{"type": "matched", "room": roomMap, "role": "host"}
		_ = host.Send(msg)
		msgGuest := map[string]any{"type": "matched", "room": roomMap, "role": "guest"}
		_ = guest.Send(msgGuest)
	}
}

func (h *Hub) setHost(roomID, userID, addr string, port int) {
	h.mu.Lock()
	defer h.mu.Unlock()
	room := h.rooms[roomID]
	if room == nil || room.HostID != userID {
		return
	}
	room.HostAddr = addr
	room.HostPort = port
	room.Status = "hosting"
	guest := h.clients[room.GuestID]
	if guest != nil {
		_ = guest.Send(map[string]any{
			"type":     "netplay_ready",
			"roomId":   room.ID,
			"hostAddr": addr,
			"hostPort": port,
			"gameId":   room.GameID,
		})
	}
	host := h.clients[room.HostID]
	if host != nil {
		_ = host.Send(map[string]any{"type": "netplay_host_ack", "roomId": room.ID})
	}
}

func (h *Hub) leaveRoom(roomID, userID string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	room := h.rooms[roomID]
	if room == nil {
		return
	}
	delete(room.Members, userID)
	for id := range room.Members {
		if c := h.clients[id]; c != nil {
			_ = c.Send(map[string]any{"type": "opponent_left", "roomId": roomID})
		}
	}
	delete(h.rooms, roomID)
}

func filterOut(ids []string, id string) []string {
	out := ids[:0]
	for _, x := range ids {
		if x != id {
			out = append(out, x)
		}
	}
	return append([]string{}, out...)
}

func indexOf(ids []string, id string) int {
	for i, x := range ids {
		if x == id {
			return i
		}
	}
	return -1
}

func intFrom(v any) int {
	switch t := v.(type) {
	case float64:
		return int(t)
	case int:
		return t
	case json.Number:
		i, _ := t.Int64()
		return int(i)
	default:
		return 0
	}
}
