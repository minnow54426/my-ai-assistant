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
  { directory?: string; pattern?: string },
  { directory: string; files: string[] }
> = {
  name: "file-list",
  description: "Lists files in a directory. Optionally filter by pattern.",
  parameters: {
    type: "object",
    properties: {
      directory: {
        type: "string",
        description: "Directory path (defaults to current directory)",
      },
      pattern: {
        type: "string",
        description: "Optional glob pattern to filter files (e.g., '*.ts')",
      },
    },
    required: [],
  },
  execute: async (params) => {
    const targetDir = params.directory || process.cwd();

    try {
      const entries = await fs.readdir(targetDir, { withFileTypes: true });
      let files = entries
        .filter((entry) => entry.isFile())
        .map((entry) => entry.name);

      // Apply pattern filter if provided
      if (params.pattern) {
        const regex = new RegExp(
          params.pattern.replace("*", ".*").replace("?", ".")
        );
        files = files.filter((file) => regex.test(file));
      }

      return {
        directory: targetDir,
        files,
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
