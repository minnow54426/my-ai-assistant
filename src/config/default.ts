import type {Config} from "./types.js"

export const defaultConfig: Config = {
    agent: {
        provider: "anthropic",
        apiKey: "",
        model: "glm-4.6"
    },
    channels: [],
    logLevel: "info"
};