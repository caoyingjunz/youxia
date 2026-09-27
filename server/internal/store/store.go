package store

import (
	"database/sql"
	"fmt"
	"time"

	_ "modernc.org/sqlite"
)

type DB struct {
	*sql.DB
}

func Open(path string) (*DB, error) {
	sqlDB, err := sql.Open("sqlite", path)
	if err != nil {
		return nil, err
	}
	sqlDB.SetMaxOpenConns(1)
	db := &DB{sqlDB}
	if err := db.migrate(); err != nil {
		_ = sqlDB.Close()
		return nil, err
	}
	return db, nil
}

func (db *DB) migrate() error {
	_, err := db.Exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  platform TEXT NOT NULL,
  core TEXT NOT NULL,
  rom_hint TEXT NOT NULL,
  cover_color TEXT NOT NULL,
  players INTEGER NOT NULL DEFAULT 2,
  sort_order INTEGER NOT NULL DEFAULT 0
);
`)
	return err
}

type User struct {
	ID           string
	Username     string
	PasswordHash string
	CreatedAt    time.Time
}

func (db *DB) CreateUser(u *User) error {
	_, err := db.Exec(
		`INSERT INTO users (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)`,
		u.ID, u.Username, u.PasswordHash, u.CreatedAt.Unix(),
	)
	return err
}

func (db *DB) FindUserByUsername(username string) (*User, error) {
	row := db.QueryRow(`SELECT id, username, password_hash, created_at FROM users WHERE username = ?`, username)
	var u User
	var ts int64
	if err := row.Scan(&u.ID, &u.Username, &u.PasswordHash, &ts); err != nil {
		return nil, err
	}
	u.CreatedAt = time.Unix(ts, 0)
	return &u, nil
}

type Game struct {
	ID         string `json:"id"`
	Title      string `json:"title"`
	Platform   string `json:"platform"`
	Core       string `json:"core"`
	RomHint    string `json:"romHint"`
	CoverColor string `json:"coverColor"`
	Players    int    `json:"players"`
	SortOrder  int    `json:"sortOrder"`
}

func (db *DB) ListGames() ([]Game, error) {
	rows, err := db.Query(`SELECT id, title, platform, core, rom_hint, cover_color, players, sort_order FROM games ORDER BY sort_order, title`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Game
	for rows.Next() {
		var g Game
		if err := rows.Scan(&g.ID, &g.Title, &g.Platform, &g.Core, &g.RomHint, &g.CoverColor, &g.Players, &g.SortOrder); err != nil {
			return nil, err
		}
		out = append(out, g)
	}
	return out, rows.Err()
}

func (db *DB) UpsertGame(g Game) error {
	_, err := db.Exec(`
INSERT INTO games (id, title, platform, core, rom_hint, cover_color, players, sort_order)
VALUES (?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(id) DO UPDATE SET
  title=excluded.title, platform=excluded.platform, core=excluded.core,
  rom_hint=excluded.rom_hint, cover_color=excluded.cover_color,
  players=excluded.players, sort_order=excluded.sort_order
`, g.ID, g.Title, g.Platform, g.Core, g.RomHint, g.CoverColor, g.Players, g.SortOrder)
	if err != nil {
		return fmt.Errorf("upsert game: %w", err)
	}
	return nil
}
