import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { afterAll, beforeAll, beforeEach } from 'vitest';

process.env.JWT_SECRET ||= 'test-environment-jwt-secret-key-32-chars-minimum';
process.env.BOT_TOKEN ||= 'mock-test-bot-token';
process.env.CREATOR_ID ||= '12345678';

let mongoMemoryServerInstance;

beforeAll(async () => {
  mongoMemoryServerInstance = await MongoMemoryServer.create();
  const mongoUriString = mongoMemoryServerInstance.getUri();
  await mongoose.connect(mongoUriString);
});

beforeEach(async () => {
  const databaseCollections = mongoose.connection.collections;
  for (const collectionName in databaseCollections) {
    await databaseCollections[collectionName].deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoMemoryServerInstance) {
    await mongoMemoryServerInstance.stop();
  }
});
