// scripts/seedPointers.js
import 'dotenv/config';
import mongoose from 'mongoose';
import pointers from '../data/pointers.js';
import { connectDB } from '../src/storage/db.js';
import { Pointer } from '../src/models/Pointer.js';

await connectDB();

await Pointer.deleteMany({});

const docs = pointers.map(p => ({
  text: p.text,
  source: p.source ?? null,
  tags: p.tags ?? [],
  isActive: true
}));

await Pointer.insertMany(docs);

await mongoose.disconnect();

console.log(`Seeded ${docs.length} pointers`);
