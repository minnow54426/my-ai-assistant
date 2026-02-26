import * as fs from "fs/promises";
import * as path from "path";
import type { Tool } from "./tools";

/**
 * Echo tool - returns the message sent to it
 * Simple tool for testing
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

/**
 * Get-time tool - returns current time in Beijing timezone (UTC+8)
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

    // Add 8 hours to convert UTC to Beijing time
    const beijingTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));

    // Format: "2026-02-21T09:41:00.123 (Beijing Time, UTC+8)"
    return beijingTime.toISOString().replace("Z", "") + " (Beijing Time, UTC+8)";
  },
};

/**
 * File-list tool - lists files in a directory recursively with optional pattern matching
 */
export const fileListTool: Tool<
  { directory?: string; pattern?: string; recursive?: boolean },
  { directory: string; files: string[]; count: number }
> = {
  name: "file-list",
  description:
    "Lists files in a directory recursively, with optional pattern matching",
  parameters: {
    type: "object",
    properties: {
      directory: {
        type: "string",
        description: "Directory to list files from (defaults to current directory)",
      },
      pattern: {
        type: "string",
        description: "Glob pattern to filter files (e.g., '*.ts' for TypeScript files)",
      },
      recursive: {
        type: "boolean",
        description: "Whether to search recursively (defaults to true)",
      },
    },
    required: [],
  },
  execute: async (params) => {
    const targetDir = params.directory || ".";
    const recursive = params.recursive !== undefined ? params.recursive : true;
    const files: string[] = [];

    try {
      // Convert glob pattern to regex
      const pattern = params.pattern || "*";
      const regex = globToRegex(pattern);

      if (recursive) {
        // Recursive search
        await getAllFiles(targetDir, targetDir, files, regex);
      } else {
        // Non-recursive - only top-level files
        const entries = await fs.readdir(targetDir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isFile()) {
            if (regex.test(entry.name)) {
              files.push(entry.name);
            }
          }
        }
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

/**
 * Recursively get all files in a directory
 */
async function getAllFiles(
  dir: string,
  baseDir: string,
  files: string[],
  pattern: RegExp
): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath);

    if (entry.isDirectory()) {
      // Recurse into subdirectories
      await getAllFiles(fullPath, baseDir, files, pattern);
    } else if (entry.isFile()) {
      // Check if file matches pattern
      if (pattern.test(relativePath)) {
        files.push(relativePath);
      }
    }
  }
}

/**
 * Convert glob pattern to regex
 * Handles glob patterns for file matching
 */
function globToRegex(pattern: string): RegExp {
  // Escape special regex characters except * and .
  let regex = pattern
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&") // Escape special chars
    .replace(/\./g, "\\.") // Escape dots
    .replace(/^\*\*/g, ".*") // ** at start = match anything
    .replace(/^\*/g, "[^/]*") // * at start = no slashes
    .replace(/([^\\])\*/g, "$1[^/]*") // * in middle = no slashes
    .replace(/\/\*\*/g, "/.*") // /**/ = match any depth
    .replace(/\*\*/g, ".*"); // ** anywhere = match anything

  return new RegExp(`^${regex}$`);
}
