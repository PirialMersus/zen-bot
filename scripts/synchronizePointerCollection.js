export const synchronizePointerCollection = async (targetPointerModel, pointerDataset, languageCode) => {
  const existingPointerDocuments = await targetPointerModel.find({});
  const existingPointerDocumentsByText = new Map();
  const existingPointerDocumentsByNumber = new Map();

  for (const existingDocument of existingPointerDocuments) {
    const normalizedExistingText = existingDocument.text.trim();
    existingPointerDocumentsByText.set(normalizedExistingText, existingDocument);
    existingPointerDocumentsByNumber.set(existingDocument.number, existingDocument);
  }

  const processedDocumentObjectIds = new Set();
  const bulkWriteOperations = [];
  let updatedPointersCount = 0;
  let insertedPointersCount = 0;

  for (let datasetIndex = 0; datasetIndex < pointerDataset.length; datasetIndex++) {
    const rawPointerItem = pointerDataset[datasetIndex];
    const sequentialPointerNumber = rawPointerItem.number ?? (datasetIndex + 1);
    const normalizedItemText = rawPointerItem.text.trim();
    const resolvedItemSource = rawPointerItem.source ?? null;
    const resolvedItemTags = rawPointerItem.tags ?? [];

    let matchedExistingDocument = existingPointerDocumentsByText.get(normalizedItemText);

    if (!matchedExistingDocument) {
      const candidateDocumentByNumber = existingPointerDocumentsByNumber.get(sequentialPointerNumber);
      if (candidateDocumentByNumber && !processedDocumentObjectIds.has(String(candidateDocumentByNumber._id))) {
        matchedExistingDocument = candidateDocumentByNumber;
      }
    }

    if (matchedExistingDocument) {
      processedDocumentObjectIds.add(String(matchedExistingDocument._id));
      bulkWriteOperations.push({
        updateOne: {
          filter: { _id: matchedExistingDocument._id },
          update: {
            $set: {
              number: sequentialPointerNumber,
              text: rawPointerItem.text,
              source: resolvedItemSource,
              tags: resolvedItemTags,
              isActive: true
            }
          }
        }
      });
      updatedPointersCount += 1;
    } else {
      bulkWriteOperations.push({
        insertOne: {
          document: {
            number: sequentialPointerNumber,
            text: rawPointerItem.text,
            source: resolvedItemSource,
            tags: resolvedItemTags,
            isActive: true
          }
        }
      });
      insertedPointersCount += 1;
    }
  }

  let deactivatedPointersCount = 0;
  for (const existingDocument of existingPointerDocuments) {
    if (!processedDocumentObjectIds.has(String(existingDocument._id))) {
      bulkWriteOperations.push({
        updateOne: {
          filter: { _id: existingDocument._id },
          update: {
            $set: {
              isActive: false
            }
          }
        }
      });
      deactivatedPointersCount += 1;
    }
  }

  if (bulkWriteOperations.length > 0) {
    await targetPointerModel.bulkWrite(bulkWriteOperations);
  }

  console.log(`[${languageCode.toUpperCase()}] Безопасная синхронизация завершена:`);
  console.log(`  - Сохранено и обновлено существующих (_id без изменений): ${updatedPointersCount}`);
  console.log(`  - Добавлено новых записей: ${insertedPointersCount}`);
  console.log(`  - Деактивировано отсутствующих: ${deactivatedPointersCount}`);
  console.log(`  - Актуальный объем активной базы: ${pointerDataset.length}`);

  return {
    updatedPointersCount,
    insertedPointersCount,
    deactivatedPointersCount,
    totalActivePointersCount: pointerDataset.length
  };
};
