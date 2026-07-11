package handler

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	"github.com/kiyors/multica/server/internal/analytics"
	"github.com/kiyors/multica/server/internal/auth"
	obsmetrics "github.com/kiyors/multica/server/internal/metrics"
	db "github.com/kiyors/multica/server/pkg/db/generated"
)

func getGoogleOAuthConfig() *oauth2.Config {
	return &oauth2.Config{
		ClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
		ClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
		RedirectURL:  os.Getenv("GOOGLE_REDIRECT_URI"), // This should match /api/auth/google/callback
		Scopes: []string{
			"https://www.googleapis.com/auth/userinfo.email",
			"https://www.googleapis.com/auth/userinfo.profile",
		},
		Endpoint: google.Endpoint,
	}
}

// GoogleOAuthLogin initiates the Google OAuth flow.
func (h *Handler) GoogleOAuthLogin(w http.ResponseWriter, r *http.Request) {
	conf := getGoogleOAuthConfig()
	if conf.ClientID == "" || conf.ClientSecret == "" {
		writeError(w, http.StatusServiceUnavailable, "Google login is not configured")
		return
	}

	b := make([]byte, 16)
	rand.Read(b)
	state := base64.URLEncoding.EncodeToString(b)
	
	http.SetCookie(w, &http.Cookie{
		Name:     "oauth_state",
		Value:    state,
		Path:     "/",
		HttpOnly: true,
		Secure:   strings.HasPrefix(conf.RedirectURL, "https://"),
		MaxAge:   300,
	})

	url := conf.AuthCodeURL(state, oauth2.AccessTypeOffline)
	http.Redirect(w, r, url, http.StatusFound)
}

// GoogleOAuthCallback handles the callback from Google.
func (h *Handler) GoogleOAuthCallback(w http.ResponseWriter, r *http.Request) {
	stateCookie, err := r.Cookie("oauth_state")
	if err != nil || stateCookie.Value != r.FormValue("state") {
		slog.Warn("invalid oauth state")
		http.Redirect(w, r, "/login?error=invalid_state", http.StatusFound)
		return
	}

	conf := getGoogleOAuthConfig()
	code := r.FormValue("code")
	tok, err := conf.Exchange(r.Context(), code)
	if err != nil {
		slog.Error("failed to exchange token", "error", err)
		http.Redirect(w, r, "/login?error=exchange_failed", http.StatusFound)
		return
	}

	client := conf.Client(r.Context(), tok)
	resp, err := client.Get("https://www.googleapis.com/oauth2/v2/userinfo")
	if err != nil {
		slog.Error("failed to get user info", "error", err)
		http.Redirect(w, r, "/login?error=userinfo_failed", http.StatusFound)
		return
	}
	defer resp.Body.Close()

	var gUser struct {
		Email   string `json:"email"`
		Name    string `json:"name"`
		Picture string `json:"picture"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&gUser); err != nil {
		slog.Error("failed to decode user info", "error", err)
		http.Redirect(w, r, "/login?error=decode_failed", http.StatusFound)
		return
	}

	if gUser.Email == "" {
		http.Redirect(w, r, "/login?error=no_email", http.StatusFound)
		return
	}

	email := strings.ToLower(strings.TrimSpace(gUser.Email))
	user, isNew, err := h.findOrCreateUser(r.Context(), email)
	if err != nil {
		http.Redirect(w, r, "/login?error=signup_failed", http.StatusFound)
		return
	}

	if isNew {
		evt := analytics.Signup(uuidToString(user.ID), user.Email, signupSourceFromRequest(r))
		evt.Properties["auth_method"] = "google_oauth"
		obsmetrics.RecordEvent(h.Analytics, h.Metrics, evt)
	}

	needsUpdate := false
	newName := user.Name
	newAvatar := user.AvatarUrl

	if gUser.Name != "" && user.Name == strings.Split(email, "@")[0] {
		newName = gUser.Name
		needsUpdate = true
	}
	if gUser.Picture != "" && !user.AvatarUrl.Valid {
		newAvatar = pgtype.Text{String: gUser.Picture, Valid: true}
		needsUpdate = true
	}

	if needsUpdate {
		updated, err := h.Queries.UpdateUser(r.Context(), db.UpdateUserParams{
			ID:        user.ID,
			Name:      newName,
			AvatarUrl: newAvatar,
		})
		if err == nil {
			user = updated
		}
	}

	tokenString, err := h.issueJWT(user)
	if err != nil {
		slog.Warn("google oauth login failed", "error", err, "email", email)
		http.Redirect(w, r, "/login?error=token_failed", http.StatusFound)
		return
	}

	if err := auth.SetAuthCookies(w, tokenString); err != nil {
		slog.Warn("failed to set auth cookies", "error", err)
	}

	if h.CFSigner != nil {
		for _, cookie := range h.CFSigner.SignedCookies(time.Now().Add(72 * time.Hour)) {
			http.SetCookie(w, cookie)
		}
	}

	slog.Info("user logged in via google oauth", "user_id", uuidToString(user.ID), "email", user.Email)
	http.Redirect(w, r, "/", http.StatusFound)
}
