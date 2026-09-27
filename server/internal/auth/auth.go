package auth

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/youxia-platform/youxia/server/internal/store"
	"golang.org/x/crypto/bcrypt"
)

type Service struct {
	db     *store.DB
	secret []byte
}

func New(db *store.DB, secret string) *Service {
	return &Service{db: db, secret: []byte(secret)}
}

type claims struct {
	UserID   string `json:"uid"`
	Username string `json:"username"`
	jwt.RegisteredClaims
}

func (s *Service) RegisterRoutes(mux *http.ServeMux) {
	RegisterRoutes(mux, s)
}

func RegisterRoutes(mux *http.ServeMux, s *Service) {
	mux.HandleFunc("POST /api/auth/register", s.handleRegister)
	mux.HandleFunc("POST /api/auth/login", s.handleLogin)
	mux.HandleFunc("GET /api/auth/me", s.Require(s.handleMe))
}

type creds struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

func (s *Service) handleRegister(w http.ResponseWriter, r *http.Request) {
	var c creds
	if err := json.NewDecoder(r.Body).Decode(&c); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid json")
		return
	}
	c.Username = strings.TrimSpace(c.Username)
	if len(c.Username) < 3 || len(c.Password) < 6 {
		writeErr(w, http.StatusBadRequest, "username>=3 and password>=6 required")
		return
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(c.Password), bcrypt.DefaultCost)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "hash failed")
		return
	}
	u := &store.User{
		ID:           uuid.NewString(),
		Username:     c.Username,
		PasswordHash: string(hash),
		CreatedAt:    time.Now(),
	}
	if err := s.db.CreateUser(u); err != nil {
		writeErr(w, http.StatusConflict, "username taken")
		return
	}
	token, err := s.issue(u.ID, u.Username)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "token failed")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{
		"token": token,
		"user":  map[string]string{"id": u.ID, "username": u.Username},
	})
}

func (s *Service) handleLogin(w http.ResponseWriter, r *http.Request) {
	var c creds
	if err := json.NewDecoder(r.Body).Decode(&c); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid json")
		return
	}
	u, err := s.db.FindUserByUsername(strings.TrimSpace(c.Username))
	if err != nil {
		writeErr(w, http.StatusUnauthorized, "invalid credentials")
		return
	}
	if bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(c.Password)) != nil {
		writeErr(w, http.StatusUnauthorized, "invalid credentials")
		return
	}
	token, err := s.issue(u.ID, u.Username)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "token failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"token": token,
		"user":  map[string]string{"id": u.ID, "username": u.Username},
	})
}

func (s *Service) handleMe(w http.ResponseWriter, r *http.Request) {
	uid := UserID(r.Context())
	uname := Username(r.Context())
	writeJSON(w, http.StatusOK, map[string]string{"id": uid, "username": uname})
}

func (s *Service) issue(userID, username string) (string, error) {
	t := jwt.NewWithClaims(jwt.SigningMethodHS256, claims{
		UserID:   userID,
		Username: username,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(30 * 24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "youxia",
		},
	})
	return t.SignedString(s.secret)
}

func (s *Service) Parse(token string) (*claims, error) {
	parsed, err := jwt.ParseWithClaims(token, &claims{}, func(t *jwt.Token) (any, error) {
		if t.Method != jwt.SigningMethodHS256 {
			return nil, errors.New("unexpected alg")
		}
		return s.secret, nil
	})
	if err != nil {
		return nil, err
	}
	c, ok := parsed.Claims.(*claims)
	if !ok || !parsed.Valid {
		return nil, errors.New("invalid token")
	}
	return c, nil
}

func writeJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(v)
}

func writeErr(w http.ResponseWriter, code int, msg string) {
	writeJSON(w, code, map[string]string{"error": msg})
}
