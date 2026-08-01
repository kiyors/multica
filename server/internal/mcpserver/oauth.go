package mcpserver

import (
	"encoding/json"
	"fmt"
	"html"
	"net/http"
	"net/url"
	"strings"
)

// HandleOAuthAuthorize implements a dummy OAuth2 authorization endpoint.
// It prevents open-redirects by rendering an explicit approval page.
// This allows platforms like Google Gemini, which strictly require OAuth2 flows,
// to connect to Multica MCP using a standard Multica Personal Access Token.
func HandleOAuthAuthorize(w http.ResponseWriter, r *http.Request) {
	redirectURI := r.URL.Query().Get("redirect_uri")
	state := r.URL.Query().Get("state")
	clientID := r.URL.Query().Get("client_id")

	if redirectURI == "" {
		http.Error(w, "missing redirect_uri", http.StatusBadRequest)
		return
	}

	// Basic sanity check to ensure it's a URL
	if !strings.HasPrefix(redirectURI, "http://") && !strings.HasPrefix(redirectURI, "https://") {
		http.Error(w, "invalid redirect_uri", http.StatusBadRequest)
		return
	}

	if clientID == "" {
		clientID = "External App"
	}

	// We append our dummy code and pass back the state
	separator := "?"
	if strings.Contains(redirectURI, "?") {
		separator = "&"
	}
	finalURI := fmt.Sprintf("%s%scode=mcp_dummy_auth_code&state=%s", redirectURI, separator, url.QueryEscape(state))

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	fmt.Fprintf(w, `<!DOCTYPE html>
<html>
<head>
<title>Authorize Connection</title>
<style>
	body { font-family: system-ui, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #f9fafb; color: #111827; }
	.card { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); text-align: center; max-width: 400px; }
	.btn { display: inline-block; background-color: #000; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: 500; margin-top: 20px; }
	.btn:hover { background-color: #374151; }
</style>
</head>
<body>
<div class="card">
	<h2>Authorize %s</h2>
	<p>You are connecting an external application to your Multica workspace via MCP.</p>
	<p><strong>Note:</strong> You must have provided your Personal Access Token in the "Client Secret" field of the application.</p>
	<a href="%s" class="btn">Authorize and Return</a>
</div>
</body>
</html>`, html.EscapeString(clientID), html.EscapeString(finalURI))
}

// HandleOAuthToken implements a dummy OAuth2 token endpoint.
// It reads the `client_secret` parameter (which the user sets as their PAT in the external app)
// and echoes it back as the `access_token`. This brilliant workaround tricks strictly-OAuth2 clients
// into using standard PATs as bearer tokens!
func HandleOAuthToken(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		http.Error(w, "invalid form data", http.StatusBadRequest)
		return
	}

	clientSecret := r.FormValue("client_secret")
	if clientSecret == "" {
		http.Error(w, "missing client_secret (must be your Multica PAT)", http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{
		"access_token": clientSecret,
		"token_type":   "Bearer",
		"expires_in":   31536000, // 1 year (dummy value, the PAT has its own expiry)
	})
}
