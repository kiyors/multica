package service

import (
	"bytes"
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
)

type ExpoPushMessage struct {
	To    string         `json:"to"`
	Title string         `json:"title"`
	Body  string         `json:"body"`
	Data  map[string]any `json:"data,omitempty"`
}

type PushService struct{}

func NewPushService() *PushService {
	return &PushService{}
}

func (s *PushService) SendPushNotifications(ctx context.Context, messages []ExpoPushMessage) error {
	if len(messages) == 0 {
		return nil
	}

	body, err := json.Marshal(messages)
	if err != nil {
		return err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", "https://exp.host/--/api/v2/push/send", bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Accept-Encoding", "gzip, deflate")
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		slog.Warn("failed to send expo push notifications", "status", resp.StatusCode)
	}

	return nil
}
