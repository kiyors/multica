CREATE TABLE milestone_member (
  milestone_id UUID NOT NULL REFERENCES milestone(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES member(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (milestone_id, member_id)
);

CREATE INDEX milestone_member_member_id_idx ON milestone_member(member_id);

ALTER TABLE project_document
  ADD COLUMN document_type TEXT NOT NULL DEFAULT 'page'
  CHECK (document_type IN ('page', 'folder'));

ALTER TABLE project_document DROP CONSTRAINT project_document_parent_id_fkey;
ALTER TABLE project_document
  ADD CONSTRAINT project_document_parent_id_fkey
  FOREIGN KEY (parent_id) REFERENCES project_document(id) ON DELETE SET NULL;
