import 'dotenv/config';
import mongoose from 'mongoose';
import pointersUk from '../data/pointers.uk.js';
import { connectDB } from '../src/storage/db.js';
import { PointerUk } from '../src/models/Pointer.js';
import { synchronizePointerCollection } from './synchronizePointerCollection.js';

await connectDB();
await synchronizePointerCollection(PointerUk, pointersUk, 'uk');
await mongoose.disconnect();
