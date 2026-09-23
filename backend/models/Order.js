import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
  {
    order_id: {
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
    product_id: {
      type: String,
      trim: true
    },
    product_title: {
      type: String,
      default: ''
    },
    quantity: {
      type: Number,
      default: 1
    },
    unit_price: {
      type: Number,
      default: 0
    },
    total_amount: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['completed', 'pending', 'cancelled'],
      default: 'pending'
    },
    order_date: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: false }
);

orderSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  }
});

export const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);
