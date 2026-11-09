import 'dotenv/config';
import mongoose from 'mongoose';
import pointersEs from '../data/pointers.es.js';
import { connectDB } from '../src/storage/db.js';
import { PointerEs } from '../src/models/Pointer.js';

await connectDB();

await PointerEs.deleteMany({});

const spanishDocuments = pointersEs.map((pointerItem, index) => ({
  number: pointerItem.number ?? (index + 1),
  text: pointerItem.text,
  source: pointerItem.source ?? null,
  tags: pointerItem.tags ?? [],
  isActive: true
}));

await PointerEs.insertMany(spanishDocuments);

await mongoose.disconnect();

console.log(`Seeded ${spanishDocuments.length} ES pointers into 'pointers_es' collection`);
