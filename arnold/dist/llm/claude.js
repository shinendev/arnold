"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClaudeAdapter = void 0;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const adapter_1 = require("./adapter");
class ClaudeAdapter extends adapter_1.BaseLLMAdapter {
    client;
    model;
    constructor(config) {
        super();
        this.client = new sdk_1.default({ apiKey: config.apiKey });
        this.model = config.model || 'claude-sonnet-4-20250514';
    }
    async generateText(prompt) {
        const response = await this.client.messages.create({
            model: this.model,
            max_tokens: 1024,
            messages: [{ role: 'user', content: prompt }],
        });
        const block = response.content[0];
        if (block.type === 'text')
            return block.text;
        return '';
    }
    async generateEmbedding(text) {
        // Anthropic doesn't have a native embedding API yet.
        // We use a simple deterministic hash-based embedding as fallback.
        // In production, swap this for OpenAI's text-embedding-3-small or a local model.
        return this.hashEmbedding(text, 256);
    }
    /**
     * Deterministic pseudo-embedding based on character n-gram hashing.
     * NOT a real semantic embedding — sufficient for prototyping similarity
     * when a proper embedding API is unavailable.
     */
    hashEmbedding(text, dims) {
        const vec = new Float32Array(dims);
        const normalized = text.toLowerCase().trim();
        for (let n = 1; n <= 3; n++) {
            for (let i = 0; i <= normalized.length - n; i++) {
                const gram = normalized.substring(i, i + n);
                let hash = 0;
                for (let j = 0; j < gram.length; j++) {
                    hash = ((hash << 5) - hash + gram.charCodeAt(j)) | 0;
                }
                const idx = Math.abs(hash) % dims;
                vec[idx] += 1.0 / (n * n);
            }
        }
        // L2 normalize
        let mag = 0;
        for (let i = 0; i < dims; i++)
            mag += vec[i] * vec[i];
        mag = Math.sqrt(mag);
        if (mag > 0) {
            for (let i = 0; i < dims; i++)
                vec[i] /= mag;
        }
        return Array.from(vec);
    }
}
exports.ClaudeAdapter = ClaudeAdapter;
//# sourceMappingURL=claude.js.map