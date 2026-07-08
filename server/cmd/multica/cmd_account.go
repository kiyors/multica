package main

import (
	"context"
	"fmt"
	"time"

	"github.com/spf13/cobra"
	"github.com/multica-ai/multica/server/internal/cli"
)

var accountCmd = &cobra.Command{
	Use:   "account",
	Short: "Manage your user account connections",
}

var accountConnectCmd = &cobra.Command{
	Use:   "connect",
	Short: "Connect external accounts",
}

var accountConnectGitHubCmd = &cobra.Command{
	Use:   "github",
	Short: "Connect your GitHub account using Device Flow",
	RunE:  runAccountConnectGitHub,
}

func init() {
	accountCmd.AddCommand(accountConnectCmd)
	accountConnectCmd.AddCommand(accountConnectGitHubCmd)
}

func runAccountConnectGitHub(cmd *cobra.Command, _ []string) error {
	client, err := newAPIClient(cmd)
	if err != nil {
		return err
	}

	ctx, cancel := cli.APIContext(context.Background())
	defer cancel()

	fmt.Println("Initiating GitHub Device Flow...")

	var deviceResp struct {
		DeviceCode      string `json:"device_code"`
		UserCode        string `json:"user_code"`
		VerificationUri string `json:"verification_uri"`
		ExpiresIn       int    `json:"expires_in"`
		Interval        int    `json:"interval"`
	}

	if err := client.PostJSON(ctx, "/api/me/github/device-code", nil, &deviceResp); err != nil {
		return fmt.Errorf("failed to start device flow: %w", err)
	}

	fmt.Printf("\nPlease open: %s\n", deviceResp.VerificationUri)
	fmt.Printf("And enter the code: %s\n\n", deviceResp.UserCode)
	fmt.Println("Waiting for authorization...")

	interval := time.Duration(deviceResp.Interval) * time.Second
	if interval < 5*time.Second {
		interval = 5 * time.Second
	}

	expiresAt := time.Now().Add(time.Duration(deviceResp.ExpiresIn) * time.Second)

	for time.Now().Before(expiresAt) {
		time.Sleep(interval)

		var pollResp struct {
			ID          string `json:"id"`
			Name        string `json:"name"`
			GithubLogin string `json:"github_login"`
		}

		err := client.PostJSON(ctx, "/api/me/github/device-code/poll", map[string]string{
			"device_code": deviceResp.DeviceCode,
		}, &pollResp)

		if err != nil {
			// Check if it's authorization_pending
			if apiErr, ok := err.(*cli.HTTPError); ok && apiErr.StatusCode == 400 {
				// keep polling
				continue
			}
			return fmt.Errorf("failed during polling: %w", err)
		}

		fmt.Printf("\nSuccessfully connected GitHub account: %s!\n", pollResp.GithubLogin)
		return nil
	}

	return fmt.Errorf("device flow timed out")
}
