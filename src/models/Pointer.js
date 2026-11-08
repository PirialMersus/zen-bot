import mongoose from 'mongoose';

const pointerSchemaDefinition = {
  number: {
    type: Number,
    index: true
  },
  text: {
    type: String,
    required: true
  },
  source: {
    type: String,
    default: null
  },
  tags: {
    type: [String],
    default: []
  },
  isActive: {
    type: Boolean,
    default: true
  }
};

const russianPointerSchema = new mongoose.Schema(pointerSchemaDefinition, {
  timestamps: true,
  collection: 'pointers'
});

const englishPointerSchema = new mongoose.Schema(pointerSchemaDefinition, {
  timestamps: true,
  collection: 'pointers_en'
});

const ukrainianPointerSchema = new mongoose.Schema(pointerSchemaDefinition, {
  timestamps: true,
  collection: 'pointers_uk'
});

export const Pointer = mongoose.model('Pointer', russianPointerSchema);
export const PointerRu = Pointer;
export const PointerEn = mongoose.model('PointerEn', englishPointerSchema);
export const PointerUk = mongoose.model('PointerUk', ukrainianPointerSchema);
