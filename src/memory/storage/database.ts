import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { Chunk, MemoryFile } from '../types';
import { schema, indexStatements } from './schema';

export class MemoryDatabase {
  private db: Database.Database;

  constructor(dbPath: string) {
    // Ensure directory exists
    const dir = dirname(dbPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.initializeSchema();
  }

  private initializeSchema(): void {
    this.db.exec(schema);

    // Create indexes
    for (const stmt of indexStatements) {
      this.db.exec(stmt);
    }
  }

  // File operations
  async addFile(file: MemoryFile): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO files (path, type, hash, mtime, indexed_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(file.path, file.type, file.hash, file.mtime, Date.now());
  }

  async getFile(path: string): Promise<MemoryFile | undefined> {
    const stmt = this.db.prepare('SELECT * FROM files WHERE path = ?');
    const row = stmt.get(path) as any;
    if (!row) return undefined;

    return {
      path: row.path,
      type: row.type,
      hash: row.hash,
      mtime: row.mtime
    };
  }

  // Chunk operations
  async addChunks(chunks: Chunk[]): Promise<void> {
    const insertStmt = this.db.prepare(`
      INSERT INTO chunks (id, path, type, start_line, end_line, text, embedding, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertFtsStmt = this.db.prepare(`
      INSERT INTO chunks_fts (text, id, path)
      VALUES (?, ?, ?)
    `);

    const insertMany = this.db.transaction((chunks: Chunk[]) => {
      for (const chunk of chunks) {
        // Convert Float32Array to buffer
        const buffer = Buffer.from(chunk.embedding.buffer);

        insertStmt.run(
          chunk.id,
          chunk.path,
          chunk.type,
          chunk.startLine,
          chunk.endLine,
          chunk.text,
          buffer,
          chunk.createdAt
        );

        insertFtsStmt.run(chunk.text, chunk.id, chunk.path);
      }
    });

    insertMany(chunks);
  }

  async getAllChunks(): Promise<Chunk[]> {
    const stmt = this.db.prepare('SELECT * FROM chunks');
    const rows = stmt.all() as any[];

    return rows.map(row => ({
      id: row.id,
      path: row.path,
      type: row.type,
      startLine: row.start_line,
      endLine: row.end_line,
      text: row.text,
      embedding: new Float32Array(row.embedding.buffer),
      createdAt: row.created_at
    }));
  }

  async clearPath(path: string): Promise<void> {
    const stmt1 = this.db.prepare('DELETE FROM chunks_fts WHERE id IN (SELECT id FROM chunks WHERE path = ?)');
    const stmt2 = this.db.prepare('DELETE FROM chunks WHERE path = ?');

    stmt1.run(path);
    stmt2.run(path);
  }

  close(): void {
    this.db.close();
  }
}
