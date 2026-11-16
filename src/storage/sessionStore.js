import mongoose from 'mongoose';
import Session from '../models/Session.js';
import { logError } from '../utils/logger.js';

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
    } catch (databaseError) {
      logError(databaseError, { context: 'SESSION_STORE_GET', sessionKey });
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
    } catch (databaseError) {
      logError(databaseError, { context: 'SESSION_STORE_SET', sessionKey });
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
    } catch (databaseError) {
      logError(databaseError, { context: 'SESSION_STORE_DELETE', sessionKey });
      return;
    }
  }
}

export const createMongoSessionStore = () => new MongoSessionStore();
