const mongoose = require('mongoose');

const priceRangeSchema = new mongoose.Schema({
  minQuantity: {
    type: Number,
    required: true,
  },
  maxQuantity: {
    type: Number,
    default: null,
  },
  price: {
    type: Number,
    required: true,
  },
}, { _id: false });

const productVariationSchema = new mongoose.Schema({
  color: {
    type: String,
    trim: true,
  },
  size: {
    type: String,
    trim: true,
  },
  sku: {
    type: String,
    trim: true,
  },
  stock: {
    type: Number,
    default: 0,
    min: 0,
  },
  price: {
    type: Number,
    min: 0,
  },
}, { _id: true });

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: ['scarves', 'bandanas', 'capor', 'kosinka'],
    },
    subcategory: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    image: {
      type: String,
      required: true,
    },
    images: [{
      type: String,
    }],
    priceRanges: [priceRangeSchema],
    colors: [{
      type: String,
      trim: true,
    }],
    sizes: [{
      type: String,
      trim: true,
    }],
    material: {
      type: String,
      required: true,
      trim: true,
    },
    sku: {
      type: String,
      trim: true,
      sparse: true, // Разрешает null/undefined, но требует уникальности если есть
    },
    stock: {
      type: Number,
      default: 0,
      min: 0,
    },
    variations: [productVariationSchema],
    discount: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    discountPrice: {
      type: Number,
      min: 0,
    },
    inStock: {
      type: Boolean,
      default: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
    },
  },
  {
    timestamps: true,
  }
);

// Индексы для быстрого поиска
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ category: 1 });
productSchema.index({ subcategory: 1 });
productSchema.index({ inStock: 1 });
productSchema.index({ sku: 1 });
productSchema.index({ stock: 1 });
productSchema.index({ categoryId: 1 });

// Метод для расчета общего остатка
productSchema.methods.getTotalStock = function () {
  if (this.variations && this.variations.length > 0) {
    return this.variations.reduce((sum, v) => sum + (v.stock || 0), 0);
  }
  return this.stock || 0;
};

module.exports = mongoose.model('Product', productSchema);


