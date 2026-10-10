CREATE TABLE IF NOT EXISTS saves (
  id TEXT PRIMARY KEY NOT NULL,
  state TEXT NOT NULL CHECK (json_valid(state)),
  revision INTEGER NOT NULL CHECK (revision > 0),
  updated_at TEXT NOT NULL
);
