import type {Config} from "./types.js"

export const defaultConfig: Config = {
    agent: {
        provider: "anthropic",
        apiKey: "",
        model: "claude-3-5-sonnet-20241022"
    },
    channels: [],
    logLevel: "info"
};