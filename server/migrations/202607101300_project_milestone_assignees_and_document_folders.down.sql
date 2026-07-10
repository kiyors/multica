ALTER TABLE project_document DROP CONSTRAINT project_document_parent_id_fkey;
ALTER TABLE project_document
  ADD CONSTRAINT project_document_parent_id_fkey
  FOREIGN KEY (parent_id) REFERENCES project_document(id);
ALTER TABLE project_document DROP COLUMN IF EXISTS document_type;
DROP TABLE IF EXISTS milestone_member;
