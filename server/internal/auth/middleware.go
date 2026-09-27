package auth

import (
	"context"
	"net/http"
	"strings"
)

type ctxKey int

const (
	ctxUserID ctxKey = iota
	ctxUsername
)

func UserID(ctx context.Context) string {
	v, _ := ctx.Value(ctxUserID).(string)
	return v
}

func Username(ctx context.Context) string {
	v, _ := ctx.Value(ctxUsername).(string)
	return v
}

func (s *Service) Require(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		h := r.Header.Get("Authorization")
		if !strings.HasPrefix(h, "Bearer ") {
			writeErr(w, http.StatusUnauthorized, "missing token")
			return
		}
		c, err := s.Parse(strings.TrimPrefix(h, "Bearer "))
		if err != nil {
			writeErr(w, http.StatusUnauthorized, "invalid token")
			return
		}
		ctx := context.WithValue(r.Context(), ctxUserID, c.UserID)
		ctx = context.WithValue(ctx, ctxUsername, c.Username)
		next(w, r.WithContext(ctx))
	}
}

func (s *Service) UserFromToken(token string) (userID, username string, err error) {
	c, err := s.Parse(token)
	if err != nil {
		return "", "", err
	}
	return c.UserID, c.Username, nil
}
