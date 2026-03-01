export const schema = `
-- Files table - track indexed files
CREATE TABLE IF NOT EXISTS files (
  path TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  hash TEXT NOT NULL,
  mtime INTEGER NOT NULL,
  indexed_at INTEGER NOT NULL
);

-- Chunks table - searchable text chunks with embeddings
CREATE TABLE IF NOT EXISTS chunks (
  id TEXT PRIMARY KEY,
  path TEXT NOT NULL,
  type TEXT NOT NULL,
  start_line INTEGER NOT NULL,
  end_line INTEGER NOT NULL,
  text TEXT NOT NULL,
  embedding BLOB NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (path) REFERENCES files(path)
);

-- Full-text search table
CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5(
  text, id UNINDEXED, path UNINDEXED
);
`;

export const indexStatements = [
  'CREATE INDEX IF NOT EXISTS chunks_path_idx ON chunks(path);',
  'CREATE INDEX IF NOT EXISTS chunks_type_idx ON chunks(type);'
];
