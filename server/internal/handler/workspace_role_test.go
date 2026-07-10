package handler

import "testing"

func TestIsWorkspaceManagerRole(t *testing.T) {
	t.Parallel()
	for _, tc := range []struct {
		role string
		want bool
	}{
		{role: "owner", want: true},
		{role: "admin", want: true},
		{role: "member", want: false},
		{role: "", want: false},
	} {
		t.Run(tc.role, func(t *testing.T) {
			if got := isWorkspaceManagerRole(tc.role); got != tc.want {
				t.Fatalf("isWorkspaceManagerRole(%q) = %v, want %v", tc.role, got, tc.want)
			}
		})
	}
}
