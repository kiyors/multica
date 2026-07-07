ALTER TABLE review_comments DROP COLUMN end_time;
ALTER TABLE review_comments RENAME COLUMN start_time TO timestamp;
