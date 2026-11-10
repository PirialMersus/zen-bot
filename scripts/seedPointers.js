import 'dotenv/config';
import mongoose from 'mongoose';
import pointersRu from '../data/pointers.ru.js';
import { connectDB } from '../src/storage/db.js';
import { Pointer } from '../src/models/Pointer.js';
import { synchronizePointerCollection } from './synchronizePointerCollection.js';

await connectDB();
await synchronizePointerCollection(Pointer, pointersRu, 'ru');
await mongoose.disconnect();
