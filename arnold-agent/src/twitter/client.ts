import { TwitterApi } from 'twitter-api-v2';
import { config } from '../config';

let client: TwitterApi | null = null;

export function getTwitterClient(): TwitterApi {
  if (!client) {
    client = new TwitterApi({
      appKey: config.twitter.apiKey,
      appSecret: config.twitter.apiSecret,
      accessToken: config.twitter.accessToken,
      accessSecret: config.twitter.accessSecret,
    });
  }
  return client;
}

export function getReadOnlyClient(): TwitterApi {
  return new TwitterApi(config.twitter.bearerToken);
}
