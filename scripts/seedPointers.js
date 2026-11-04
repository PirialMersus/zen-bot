import 'dotenv/config';
import mongoose from 'mongoose';
import pointersRu from '../data/pointers.js';
import { connectDB } from '../src/storage/db.js';
import { Pointer } from '../src/models/Pointer.js';

await connectDB();

await Pointer.deleteMany({});

const russianDocuments = pointersRu.map((pointerItem, index) => ({
  number: pointerItem.number ?? (index + 1),
  text: pointerItem.text,
  source: pointerItem.source ?? null,
  tags: pointerItem.tags ?? [],
  isActive: true
}));

await Pointer.insertMany(russianDocuments);

await mongoose.disconnect();

console.log(`Seeded ${russianDocuments.length} RU pointers into 'pointers' collection`);
