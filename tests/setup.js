import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { afterAll, beforeAll, beforeEach } from 'vitest';

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
