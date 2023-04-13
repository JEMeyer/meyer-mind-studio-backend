CREATE TABLE IF NOT EXISTS videos (
    id SERIAL PRIMARY KEY,
    public_path VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    prompt VARCHAR(255),
    data JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS votes (
    user_id VARCHAR(50) NOT NULL,
    video_id INTEGER NOT NULL,
    value INTEGER NOT NULL,
    FOREIGN KEY (video_id) REFERENCES videos(id),
    PRIMARY KEY (user_id, video_id),
    last_modified TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_votes_video_id ON votes(video_id);