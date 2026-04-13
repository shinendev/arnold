"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTwitterClient = getTwitterClient;
exports.getReadOnlyClient = getReadOnlyClient;
const twitter_api_v2_1 = require("twitter-api-v2");
const config_1 = require("../config");
let client = null;
function getTwitterClient() {
    if (!client) {
        client = new twitter_api_v2_1.TwitterApi({
            appKey: config_1.config.twitter.apiKey,
            appSecret: config_1.config.twitter.apiSecret,
            accessToken: config_1.config.twitter.accessToken,
            accessSecret: config_1.config.twitter.accessSecret,
        });
    }
    return client;
}
function getReadOnlyClient() {
    return new twitter_api_v2_1.TwitterApi(config_1.config.twitter.bearerToken);
}
//# sourceMappingURL=client.js.map