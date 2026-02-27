import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { createHash } from 'crypto';
import { MemoryFile } from '../types';

export class FileStore {
  constructor(private workspaceDir: string) {}

  async ensureDirectories(): Promise<void> {
    await fs.mkdir(this.workspaceDir, { recursive: true });
    await fs.mkdir(join(this.workspaceDir, 'memory'), { recursive: true });
  }

  async listFiles(): Promise<MemoryFile[]> {
    const files: MemoryFile[] = [];

    // Check for MEMORY.md
    const memoryPath = join(this.workspaceDir, 'MEMORY.md');
    try {
      const stat = await fs.stat(memoryPath);
      const content = await fs.readFile(memoryPath, 'utf-8');
      files.push({
        path: 'MEMORY.md',
        type: 'long-term',
        hash: this.hashContent(content),
        mtime: stat.mtimeMs
      });
    } catch {
      // File doesn't exist, skip
    }

    // Check memory directory
    const memoryDir = join(this.workspaceDir, 'memory');
    try {
      const entries = await fs.readdir(memoryDir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.md')) {
          const filePath = join(memoryDir, entry.name);
          const stat = await fs.stat(filePath);
          const content = await fs.readFile(filePath, 'utf-8');

          files.push({
            path: `memory/${entry.name}`,
            type: 'daily',
            hash: this.hashContent(content),
            mtime: stat.mtimeMs
          });
        }
      }
    } catch {
      // Directory doesn't exist, skip
    }

    return files;
  }

  async readFile(path: string): Promise<string> {
    const fullPath = join(this.workspaceDir, path);
    return await fs.readFile(fullPath, 'utf-8');
  }

  async writeFile(path: string, content: string): Promise<void> {
    const fullPath = join(this.workspaceDir, path);

    // Ensure directory exists
    await fs.mkdir(dirname(fullPath), { recursive: true });

    await fs.writeFile(fullPath, content, 'utf-8');
  }

  private hashContent(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }
}
