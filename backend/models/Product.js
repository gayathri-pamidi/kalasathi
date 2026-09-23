import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    product_id: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    user_id: {
      type: String,
      required: true,
      index: true,
      trim: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: ''
    },
    category: {
      type: String,
      default: ''
    },
    price: {
      type: Number,
      default: 0
    },
    stock: {
      type: Number,
      default: 0
    },
    images: {
      type: [String],
      default: []
    },
    status: {
      type: String,
      enum: ['active', 'draft', 'archived'],
      default: 'active'
    },
    created_at: {
      type: Date,
      default: Date.now
    },
    // Reference Dataset & Regional / Production Metadata
    state: {
      type: String,
      default: ''
    },
    district: {
      type: String,
      default: ''
    },
    sector: {
      type: String,
      default: ''
    },
    material: {
      type: String,
      default: ''
    },
    product_size: {
      type: String,
      default: ''
    },
    labour_hours: {
      type: Number,
      default: 0
    },
    material_cost: {
      type: Number,
      default: 0
    },
    product_cost: {
      type: Number,
      default: 0
    },
    dataset_quantity: {
      type: Number,
      default: 0
    },
    dataset_date: {
      type: Date,
      default: null
    },
    demand_level: {
      type: String,
      default: ''
    },
    season: {
      type: String,
      default: ''
    },
    source: {
      type: String,
      default: ''
    },
    dominant_colors: {
      type: [String],
      default: []
    },
    visual_features: {
      type: [String],
      default: []
    },
    image_source_type: {
      type: String,
      default: ''
    }
  },
  { timestamps: false }
);

productSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  }
});

export const Product = mongoose.models.Product || mongoose.model('Product', productSchema);
