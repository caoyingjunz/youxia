package catalog

import (
	"encoding/json"
	"net/http"

	"github.com/youxia-platform/youxia/server/internal/auth"
	"github.com/youxia-platform/youxia/server/internal/store"
)

func RegisterRoutes(mux *http.ServeMux, db *store.DB, authSvc *auth.Service) {
	mux.HandleFunc("GET /api/games", func(w http.ResponseWriter, r *http.Request) {
		games, err := db.ListGames()
		if err != nil {
			http.Error(w, `{"error":"list failed"}`, http.StatusInternalServerError)
			return
		}
		if games == nil {
			games = []store.Game{}
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(games)
	})
	_ = authSvc // reserved for admin routes
}

func Seed(db *store.DB) error {
	games := []store.Game{
		{ID: "kof97", Title: "拳皇 97", Platform: "Arcade", Core: "fbneo_libretro", RomHint: "kof97.zip", CoverColor: "#c0392b", Players: 2, SortOrder: 1},
		{ID: "kof98", Title: "拳皇 98", Platform: "Arcade", Core: "fbneo_libretro", RomHint: "kof98.zip", CoverColor: "#8e44ad", Players: 2, SortOrder: 2},
		{ID: "mvsc", Title: "漫威 vs 街霸", Platform: "Arcade", Core: "fbneo_libretro", RomHint: "mvsc.zip", CoverColor: "#2980b9", Players: 2, SortOrder: 3},
		{ID: "sf2ce", Title: "街霸 2 冠军版", Platform: "Arcade", Core: "fbneo_libretro", RomHint: "sf2ce.zip", CoverColor: "#d35400", Players: 2, SortOrder: 4},
		{ID: "sfa3", Title: "街霸 Alpha 3", Platform: "Arcade", Core: "fbneo_libretro", RomHint: "sfa3.zip", CoverColor: "#16a085", Players: 2, SortOrder: 5},
		{ID: "mslug", Title: "合金弹头", Platform: "Arcade", Core: "fbneo_libretro", RomHint: "mslug.zip", CoverColor: "#27ae60", Players: 2, SortOrder: 6},
		{ID: "kovsh", Title: "三国战纪 风云再起", Platform: "Arcade", Core: "fbneo_libretro", RomHint: "kovsh.zip", CoverColor: "#2c3e50", Players: 2, SortOrder: 7},
		{ID: "orlegend", Title: "西游释厄传", Platform: "Arcade", Core: "fbneo_libretro", RomHint: "orlegend.zip", CoverColor: "#f39c12", Players: 2, SortOrder: 8},
		{ID: "dino", Title: "恐龙快打", Platform: "Arcade", Core: "fbneo_libretro", RomHint: "dino.zip", CoverColor: "#1abc9c", Players: 3, SortOrder: 9},
		{ID: "punisher", Title: "惩罚者", Platform: "Arcade", Core: "fbneo_libretro", RomHint: "punisher.zip", CoverColor: "#7f8c8d", Players: 2, SortOrder: 10},
	}
	for _, g := range games {
		if err := db.UpsertGame(g); err != nil {
			return err
		}
	}
	return nil
}
