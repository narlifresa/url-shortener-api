-- Create the notes table
CREATE TABLE IF NOT EXISTS notes (
  id         SERIAL PRIMARY KEY,
  title      VARCHAR(255) NOT NULL,
  content    TEXT         NOT NULL,
  created_at TIMESTAMP    DEFAULT NOW()
);
