// backend/utils/redisClient.js
// ioredis로 클러스터 환경에서 replica 읽기 지원
const Redis = require('ioredis');

// .env 예시: REDIS_CLUSTER_NODES=host1,host2,host3,host4,host5,host6,host7,host8,host9
const clusterNodes = (process.env.REDIS_CLUSTER_NODES || '').split(',').filter(Boolean).map(host => ({ host, port: 6379 }));

let cluster = null;
if (clusterNodes.length > 0) {
  cluster = new Redis.Cluster(clusterNodes, {
    redisOptions: {
      readOnly: true // 읽기 replica(slave)에서 수행
    }
  });
}

class RedisClient {
  constructor() {
    this.client = cluster;
    this.isConnected = !!cluster;
    this.useMock = !cluster;
  }

  async connect() {
    // ioredis는 자동 연결, 별도 connect 불필요
    return this.client;
  }

  async set(key, value, options = {}) {
    if (!this.client) throw new Error('Redis 클러스터가 연결되어 있지 않습니다.');
    let stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
    if (options.ttl) {
      return await this.client.set(key, stringValue, 'EX', options.ttl);
    }
    return await this.client.set(key, stringValue);
  }

  async get(key) {
    if (!this.client) throw new Error('Redis 클러스터가 연결되어 있지 않습니다.');
    const value = await this.client.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  async setEx(key, seconds, value) {
    return this.set(key, value, { ttl: seconds });
  }

  async del(key) {
    if (!this.client) throw new Error('Redis 클러스터가 연결되어 있지 않습니다.');
    return await this.client.del(key);
  }

  async expire(key, seconds) {
    if (!this.client) throw new Error('Redis 클러스터가 연결되어 있지 않습니다.');
    return await this.client.expire(key, seconds);
  }

  async quit() {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.isConnected = false;
    }
  }
}

const redisClient = new RedisClient();
module.exports = redisClient;