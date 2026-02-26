import fs from "fs"
import path from "path"
import dotenv from "dotenv"
import type { Config } from "./types.js"

// Load environment variables from .env file
dotenv.config();

export function loadConfig(configPath: string): Config {
    if (!fs.existsSync(configPath)) {
        throw new Error(`Config file not found: ${configPath}`);
    }
    const content = fs.readFileSync(configPath, "utf-8");
    const config = JSON.parse(content) as Config;

    // Override with environment variables if present
    if (config.agent.provider === "glm") {
        if (process.env.GLM_API_KEY) {
            config.agent.apiKey = process.env.GLM_API_KEY;
        }
        if (process.env.GLM_URL) {
            config.agent.baseURL = process.env.GLM_URL;
        }
    }

    return config;
}

export function getDefaultConfigPath(): string {
    const homeDir = process.env.HOME || process.env.USERPROFILE || ".";
    return path.join(homeDir, ".my-assistant", "config.json");
}