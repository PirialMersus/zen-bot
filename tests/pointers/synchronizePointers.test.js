import { describe, expect, it } from 'vitest';
import { Pointer } from '../../src/models/Pointer.js';
import User from '../../src/models/User.js';
import { synchronizePointerCollection } from '../../scripts/synchronizePointerCollection.js';
import { getNextFavoritePointerForUser } from '../../src/services/pointers.js';

describe('Безопасная синхронизация указателей', () => {
  it('должна сохранять _id существующих документов при перенумерации и сохранять избранное пользователей', async () => {
    await Pointer.deleteMany({});
    await User.deleteMany({});

    const initialDataset = [
      { number: 1, text: 'Первый указатель', source: 'Автор 1', tags: ['тишина'] },
      { number: 2, text: 'Второй указатель (дубликат)', source: 'Автор 2', tags: ['тишина'] },
      { number: 3, text: 'Третий указатель', source: 'Автор 3', tags: ['тишина'] }
    ];

    await synchronizePointerCollection(Pointer, initialDataset, 'ru');

    const firstPointerDocument = await Pointer.findOne({ text: 'Первый указатель' });
    const duplicatePointerDocument = await Pointer.findOne({ text: 'Второй указатель (дубликат)' });
    const thirdPointerDocument = await Pointer.findOne({ text: 'Третий указатель' });

    expect(firstPointerDocument).not.toBeNull();
    expect(duplicatePointerDocument).not.toBeNull();
    expect(thirdPointerDocument).not.toBeNull();

    const originalFirstPointerObjectIdString = String(firstPointerDocument._id);
    const originalThirdPointerObjectIdString = String(thirdPointerDocument._id);

    const testTelegramUserId = 888123;
    await User.create({
      telegramId: testTelegramUserId,
      language: 'ru',
      favoritePointers: [
        { pointerId: firstPointerDocument._id },
        { pointerId: thirdPointerDocument._id }
      ]
    });

    const updatedDatasetWithoutDuplicate = [
      { number: 1, text: 'Первый указатель', source: 'Автор 1', tags: ['тишина'] },
      { number: 2, text: 'Третий указатель', source: 'Автор 3', tags: ['тишина'] }
    ];

    await synchronizePointerCollection(Pointer, updatedDatasetWithoutDuplicate, 'ru');

    const refetchedFirstPointerDocument = await Pointer.findOne({ text: 'Первый указатель' });
    const refetchedThirdPointerDocument = await Pointer.findOne({ text: 'Третий указатель' });
    const refetchedDuplicatePointerDocument = await Pointer.findOne({ text: 'Второй указатель (дубликат)' });

    expect(String(refetchedFirstPointerDocument._id)).toBe(originalFirstPointerObjectIdString);
    expect(String(refetchedThirdPointerDocument._id)).toBe(originalThirdPointerObjectIdString);

    expect(refetchedThirdPointerDocument.number).toBe(2);

    expect(refetchedDuplicatePointerDocument.isActive).toBe(false);

    const favoritePointerForUser = await getNextFavoritePointerForUser(testTelegramUserId);
    expect(favoritePointerForUser).not.toBeNull();
    expect(['Первый указатель', 'Третий указатель']).toContain(favoritePointerForUser.text);

    const userInDatabase = await User.findOne({ telegramId: testTelegramUserId });
    expect(userInDatabase.favoritePointers).toHaveLength(2);
  });

  it('должна добавлять новые указатели в конец без сброса существующих', async () => {
    await Pointer.deleteMany({});

    const initialDataset = [
      { number: 1, text: 'Существующий указатель', source: null, tags: [] }
    ];

    await synchronizePointerCollection(Pointer, initialDataset, 'ru');
    const existingPointerBeforeExpansion = await Pointer.findOne({ text: 'Существующий указатель' });
    const existingPointerIdString = String(existingPointerBeforeExpansion._id);

    const expandedDataset = [
      { number: 1, text: 'Существующий указатель', source: null, tags: [] },
      { number: 2, text: 'Совершенно новый указатель', source: 'Новый автор', tags: ['новое'] }
    ];

    await synchronizePointerCollection(Pointer, expandedDataset, 'ru');

    const existingPointerAfterExpansion = await Pointer.findOne({ text: 'Существующий указатель' });
    const newlyAddedPointer = await Pointer.findOne({ text: 'Совершенно новый указатель' });

    expect(String(existingPointerAfterExpansion._id)).toBe(existingPointerIdString);
    expect(newlyAddedPointer).not.toBeNull();
    expect(newlyAddedPointer.number).toBe(2);
    expect(newlyAddedPointer.isActive).toBe(true);

    const totalActiveDocumentsCount = await Pointer.countDocuments({ isActive: true });
    expect(totalActiveDocumentsCount).toBe(2);
  });
});
