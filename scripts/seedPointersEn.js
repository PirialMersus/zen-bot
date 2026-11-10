import 'dotenv/config';
import mongoose from 'mongoose';
import pointersEn from '../data/pointers.en.js';
import { connectDB } from '../src/storage/db.js';
import { PointerEn } from '../src/models/Pointer.js';
import { synchronizePointerCollection } from './synchronizePointerCollection.js';

await connectDB();
await synchronizePointerCollection(PointerEn, pointersEn, 'en');
await mongoose.disconnect();
