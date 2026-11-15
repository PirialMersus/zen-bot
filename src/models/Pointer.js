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
russianPointerSchema.index({ isActive: 1, tags: 1, number: 1 });
russianPointerSchema.index({ isActive: 1, number: 1 });

const englishPointerSchema = new mongoose.Schema(pointerSchemaDefinition, {
  timestamps: true,
  collection: 'pointers_en'
});
englishPointerSchema.index({ isActive: 1, tags: 1, number: 1 });
englishPointerSchema.index({ isActive: 1, number: 1 });

const ukrainianPointerSchema = new mongoose.Schema(pointerSchemaDefinition, {
  timestamps: true,
  collection: 'pointers_uk'
});
ukrainianPointerSchema.index({ isActive: 1, tags: 1, number: 1 });
ukrainianPointerSchema.index({ isActive: 1, number: 1 });

const spanishPointerSchema = new mongoose.Schema(pointerSchemaDefinition, {
  timestamps: true,
  collection: 'pointers_es'
});
spanishPointerSchema.index({ isActive: 1, tags: 1, number: 1 });
spanishPointerSchema.index({ isActive: 1, number: 1 });

export const Pointer = mongoose.model('Pointer', russianPointerSchema);
export const PointerRu = Pointer;
export const PointerEn = mongoose.model('PointerEn', englishPointerSchema);
export const PointerUk = mongoose.model('PointerUk', ukrainianPointerSchema);
export const PointerEs = mongoose.model('PointerEs', spanishPointerSchema);
