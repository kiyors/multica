package handler

import "testing"

func TestSupportedLanguagesIncludeEnglishWorkflowVariants(t *testing.T) {
	for _, language := range []string{"en-marketing", "en-creative"} {
		if _, ok := supportedLanguages[language]; !ok {
			t.Fatalf("expected %q to be accepted by PATCH /api/me", language)
		}
	}
}
