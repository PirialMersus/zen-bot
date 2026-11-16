import { describe, expect, it } from 'vitest';
import { createMongoSessionStore } from '../../src/storage/sessionStore.js';
import Session from '../../src/models/Session.js';

describe('Хранилище сессий (MongoSessionStore)', () => {
  it('должен сохранять, читать и удалять данные сессии в базе данных', async () => {
    const store = createMongoSessionStore();
    const testSessionKey = 'test_user_session_123';
    const testSessionData = {
      reminderStep: 'TEXT',
      creatingReminder: { deleteAfterSeconds: null, text: 'Тестовое напоминание' }
    };

    await store.set(testSessionKey, testSessionData);

    const retrievedSessionData = await store.get(testSessionKey);
    expect(retrievedSessionData).toEqual(testSessionData);

    const persistedDatabaseRecord = await Session.findOne({ key: testSessionKey });
    expect(persistedDatabaseRecord).not.toBeNull();
    expect(persistedDatabaseRecord.data.reminderStep).toBe('TEXT');

    await store.delete(testSessionKey);

    const afterDeletionSessionData = await store.get(testSessionKey);
    expect(afterDeletionSessionData).toBeUndefined();

    const databaseRecordAfterDeletion = await Session.findOne({ key: testSessionKey });
    expect(databaseRecordAfterDeletion).toBeNull();
  });

  it('должен возвращать undefined для несуществующего ключа сессии', async () => {
    const store = createMongoSessionStore();
    const nonExistentKey = 'non_existent_key_999';

    const retrievedData = await store.get(nonExistentKey);
    expect(retrievedData).toBeUndefined();
  });
});
