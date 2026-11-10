import 'dotenv/config';
import mongoose from 'mongoose';
import pointersRu from '../data/pointers.ru.js';
import pointersEn from '../data/pointers.en.js';
import pointersUk from '../data/pointers.uk.js';
import pointersEs from '../data/pointers.es.js';
import { connectDB } from '../src/storage/db.js';
import { Pointer, PointerEn, PointerUk, PointerEs } from '../src/models/Pointer.js';
import { synchronizePointerCollection } from './synchronizePointerCollection.js';

await connectDB();
await synchronizePointerCollection(Pointer, pointersRu, 'ru');
await synchronizePointerCollection(PointerEn, pointersEn, 'en');
await synchronizePointerCollection(PointerUk, pointersUk, 'uk');
await synchronizePointerCollection(PointerEs, pointersEs, 'es');
await mongoose.disconnect();

console.log('Синхронизация всех языковых коллекций успешно завершена.');
