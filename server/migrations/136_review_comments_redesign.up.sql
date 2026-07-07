ALTER TABLE review_comments RENAME COLUMN timestamp TO start_time;
ALTER TABLE review_comments ADD COLUMN end_time REAL;
