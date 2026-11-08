import 'dotenv/config';
import mongoose from 'mongoose';
import pointersUk from '../data/pointers.uk.js';
import { connectDB } from '../src/storage/db.js';
import { PointerUk } from '../src/models/Pointer.js';

await connectDB();

await PointerUk.deleteMany({});

const ukrainianDocuments = pointersUk.map((pointerItem, index) => ({
  number: pointerItem.number ?? (index + 1),
  text: pointerItem.text,
  source: pointerItem.source ?? null,
  tags: pointerItem.tags ?? [],
  isActive: true
}));

await PointerUk.insertMany(ukrainianDocuments);

await mongoose.disconnect();

console.log(`Seeded ${ukrainianDocuments.length} UK pointers into 'pointers_uk' collection`);
