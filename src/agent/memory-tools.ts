import { Tool } from './tools';
import { MemorySystem } from '../memory/index';

export function memorySearchTool(memory: MemorySystem): Tool {
  return {
    name: 'memory_search',
    description: 'Search memory for relevant information using semantic search',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query'
        },
        limit: {
          type: 'number',
          description: 'Maximum results (default: 10)'
        }
      },
      required: ['query']
    },
    execute: async (params: any) => {
      const results = await memory.search(params.query);

      return {
        results: results.map(r => ({
          path: r.path,
          lines: `${r.startLine}-${r.endLine}`,
          score: r.score,
          snippet: r.text.slice(0, 700)
        })),
        count: results.length
      };
    }
  };
}

export function memoryGetTool(memory: MemorySystem): Tool {
  return {
    name: 'memory_get',
    description: 'Read a specific memory file',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'File path (e.g., "MEMORY.md" or "memory/2025-02-27.md")'
        }
      },
      required: ['path']
    },
    execute: async (params: any) => {
      const content = await memory.get(params.path);

      return {
        content
      };
    }
  };
}
