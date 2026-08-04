-- Recovered custom migration. Keep milestones ahead of the timestamped
-- milestone-member migration on fresh databases.
CREATE TABLE IF NOT EXISTS milestone (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL,
  title       TEXT NOT NULL,
  description TEXT,
  start_date  DATE,
  due_date    DATE,
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  sort_order  INT NOT NULL DEFAULT 0,
  created_by  UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE issue ADD COLUMN IF NOT EXISTS milestone_id UUID;
