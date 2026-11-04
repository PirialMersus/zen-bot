import 'dotenv/config';
import mongoose from 'mongoose';
import pointersEn from '../data/pointers.en.js';
import { connectDB } from '../src/storage/db.js';
import { PointerEn } from '../src/models/Pointer.js';

await connectDB();

await PointerEn.deleteMany({});

const englishDocuments = pointersEn.map((pointerItem, index) => ({
  number: pointerItem.number ?? (index + 1),
  text: pointerItem.text,
  source: pointerItem.source ?? null,
  tags: pointerItem.tags ?? [],
  isActive: true
}));

await PointerEn.insertMany(englishDocuments);

await mongoose.disconnect();

console.log(`Seeded ${englishDocuments.length} EN pointers into 'pointers_en' collection`);
