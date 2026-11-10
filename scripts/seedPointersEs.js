import 'dotenv/config';
import mongoose from 'mongoose';
import pointersEs from '../data/pointers.es.js';
import { connectDB } from '../src/storage/db.js';
import { PointerEs } from '../src/models/Pointer.js';
import { synchronizePointerCollection } from './synchronizePointerCollection.js';

await connectDB();
await synchronizePointerCollection(PointerEs, pointersEs, 'es');
await mongoose.disconnect();
