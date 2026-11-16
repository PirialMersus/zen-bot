import mongoose from 'mongoose';
import Session from '../models/Session.js';

export class MongoSessionStore {
  constructor() {
    this.memoryFallbackStore = new Map();
  }

  isDatabaseConnected() {
    return mongoose.connection.readyState === 1;
  }

  async get(sessionKey) {
    if (!this.isDatabaseConnected()) {
      return this.memoryFallbackStore.get(sessionKey);
    }

    try {
      const persistedSessionRecord = await Session.findOne({ key: sessionKey }).lean();
      return persistedSessionRecord?.data;
    } catch {
      return this.memoryFallbackStore.get(sessionKey);
    }
  }

  async set(sessionKey, sessionData) {
    this.memoryFallbackStore.set(sessionKey, sessionData);

    if (!this.isDatabaseConnected()) {
      return;
    }

    try {
      await Session.updateOne(
        { key: sessionKey },
        {
          $set: {
            data: sessionData,
            updatedAt: new Date()
          }
        },
        { upsert: true }
      );
    } catch {
      return;
    }
  }

  async delete(sessionKey) {
    this.memoryFallbackStore.delete(sessionKey);

    if (!this.isDatabaseConnected()) {
      return;
    }

    try {
      await Session.deleteOne({ key: sessionKey });
    } catch {
      return;
    }
  }
}

export const createMongoSessionStore = () => new MongoSessionStore();
