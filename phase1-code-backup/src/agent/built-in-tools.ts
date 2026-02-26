/**
 * Built-in Tools for the Agent
 *
 * Simple tools to demonstrate the tool system:
 * - echo: Returns what you send (for testing)
 * - get-time: Returns current time
 * - file-list: Lists files in a directory
 */

import * as fs from "fs/promises";
import * as path from "path";
import { Tool } from "./tools";

// ============================================================================
// Echo Tool
// ============================================================================

/**
 * Echo tool - returns the message sent to it
 * Useful for testing the tool system
 */
export const echoTool: Tool<{ message: string }, string> = {
  name: "echo",
  description: "Echoes back the message you send. Useful for testing.",
  parameters: {
    type: "object",
    properties: {
      message: {
        type: "string",
        description: "The message to echo back",
      },
    },
    required: ["message"],
  },
  execute: async (params) => {
    return `Echo: ${params.message}`;
  },
};

// ============================================================================
// Get Time Tool
// ============================================================================

/**
 * Get time tool - returns the current date and time
 */
export const getTimeTool: Tool<{}, string> = {
  name: "get-time",
  description: "Returns the current date and time in Beijing timezone (UTC+8)",
  parameters: {
    type: "object",
    properties: {},
    required: [],
  },
  execute: async () => {
    const now = new Date();
    // Convert to Beijing time (UTC+8)
    const beijingTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    return beijingTime.toISOString().replace('Z', '') + ' (Beijing Time, UTC+8)';
  },
};

// ============================================================================
// File List Tool
// ============================================================================

/**
 * File list tool - lists files in a directory
 */
export const fileListTool: Tool<
  { directory?: string; pattern?: string; recursive?: boolean },
  { directory: string; files: string[]; count: number }
> = {
  name: "file-list",
  description: "Lists files in a directory. Recursively searches subdirectories by default. Optionally filter by pattern.",
  parameters: {
    type: "object",
    properties: {
      directory: {
        type: "string",
        description: "Directory path (defaults to current directory)",
      },
      pattern: {
        type: "string",
        description: "Optional glob pattern to filter files (e.g., '*.ts', '**/*.js')",
      },
      recursive: {
        type: "boolean",
        description: "Search recursively in subdirectories (default: true)",
      },
    },
    required: [],
  },
  execute: async (params) => {
    const targetDir = params.directory || process.cwd();
    const recursive = params.recursive !== false; // Default to true

    try {
      let files: string[] = [];

      if (recursive) {
        // Recursively find all files
        const getAllFiles = async (dir: string, baseDir: string): Promise<void> => {
          const entries = await fs.readdir(dir, { withFileTypes: true });

          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            const relativePath = path.relative(baseDir, fullPath);

            if (entry.isDirectory()) {
              // Recurse into subdirectories
              await getAllFiles(fullPath, baseDir);
            } else if (entry.isFile()) {
              files.push(relativePath);
            }
          }
        };

        await getAllFiles(targetDir, targetDir);
      } else {
        // Only top-level files
        const entries = await fs.readdir(targetDir, { withFileTypes: true });
        files = entries
          .filter((entry) => entry.isFile())
          .map((entry) => entry.name);
      }

      // Apply pattern filter if provided
      if (params.pattern) {
        // Convert glob pattern to regex
        // Support patterns: *.ts, **/*.ts, **/*.js, etc.
        let regexPattern = params.pattern

          // Handle **/* (match any path)
          .replace(/\*\*\/\*/g, '.*')

          // Handle ** (match any directories)
          .replace(/\*\*/g, '.*')

          // Escape special regex characters except * and ?
          .replace(/[.+^${}()|[\]\\]/g, '\\$&')

          // * (in middle) -> match any chars except slash (one directory level)
          // * (at start) -> match any chars including slashes (recursive)
          .replace(/^\*/g, '.*')
          .replace(/([^\\])\*/g, '$1[^/]*')

          // ? -> match any single char except slash
          .replace(/\?/g, '[^/]');

        const regex = new RegExp(regexPattern);
        files = files.filter((file) => regex.test(file));
      }

      return {
        directory: targetDir,
        files,
        count: files.length,
      };
    } catch (error) {
      throw new Error(
        `Failed to list directory: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  },
};

// ============================================================================
// Tool Export
// ============================================================================

/**
 * All built-in tools
 */
export const builtInTools = [echoTool, getTimeTool, fileListTool] as const;
