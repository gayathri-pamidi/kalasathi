import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    user_id: {
      type: String,
      required: [true, 'user_id is required'],
      unique: true,
      trim: true
    },
    email: {
      type: String,
      required: [true, 'email is required'],
      unique: true,
      lowercase: true,
      trim: true
    },
    phone: {
      type: String,
      unique: true,
      sparse: true,
      trim: true
    },
    password_hash: {
      type: String,
      required: [true, 'password_hash is required']
    },
    email_verified: {
      type: Boolean,
      default: false
    },
    role: {
      type: String,
      required: true,
      enum: ['artisan', 'customer', 'b2b_buyer'],
      default: 'artisan'
    },
    created_at: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: false
  }
);

// Prevent returning password_hash when converting document to JSON
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.password_hash;
    delete ret.__v;
    return ret;
  }
});

export const User = mongoose.model('User', userSchema);
