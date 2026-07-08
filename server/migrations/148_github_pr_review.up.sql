CREATE TABLE github_pr_review (
    pr_id UUID NOT NULL REFERENCES github_pull_request(id) ON DELETE CASCADE,
    review_id BIGINT NOT NULL,
    reviewer_login TEXT NOT NULL,
    state TEXT NOT NULL,
    submitted_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (pr_id, review_id)
);
