"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cosineSimilarity = cosineSimilarity;
exports.serializeEmbedding = serializeEmbedding;
exports.deserializeEmbedding = deserializeEmbedding;
function cosineSimilarity(a, b) {
    if (a.length !== b.length || a.length === 0)
        return 0;
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        magA += a[i] * a[i];
        magB += b[i] * b[i];
    }
    const denom = Math.sqrt(magA) * Math.sqrt(magB);
    return denom === 0 ? 0 : dot / denom;
}
function serializeEmbedding(embedding) {
    const float32 = new Float32Array(embedding);
    return Buffer.from(float32.buffer);
}
function deserializeEmbedding(buffer) {
    const float32 = new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4);
    return Array.from(float32);
}
//# sourceMappingURL=embeddings.js.map