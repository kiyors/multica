CREATE INDEX idx_channel_messages_channel_created ON channel_messages (channel_id, created_at DESC);
CREATE INDEX idx_channel_members_member ON channel_members (member_id);
