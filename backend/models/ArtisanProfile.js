import mongoose from 'mongoose';

const artisanProfileSchema = new mongoose.Schema(
  {
    profile_id: {
      type: String,
      required: [true, 'profile_id is required'],
      unique: true,
      trim: true
    },
    user_id: {
      type: String,
      required: [true, 'user_id is required'],
      unique: true,
      ref: 'User',
      trim: true
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true
    },
    business_name: {
      type: String,
      trim: true,
      default: ''
    },
    craft_category: {
      type: String,
      trim: true,
      default: ''
    },
    primary_craft: {
      type: String,
      trim: true,
      default: ''
    },
    location: {
      type: String,
      trim: true,
      default: ''
    },
    language: {
      type: String,
      trim: true,
      default: 'en'
    },
    experience: {
      type: String,
      trim: true,
      default: ''
    },
    bio: {
      type: String,
      trim: true,
      default: ''
    },
    profile_image: {
      type: String,
      trim: true,
      default: ''
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

artisanProfileSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  }
});

export const ArtisanProfile = mongoose.model('ArtisanProfile', artisanProfileSchema);
