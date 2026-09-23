import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'email is required'],
      trim: true,
      lowercase: true
    },
    otp_hash: {
      type: String,
      required: [true, 'otp_hash is required']
    },
    purpose: {
      type: String,
      enum: ['email_verification', 'password_reset', 'registration', 'phone_verification', 'RESEND', 'SIGNUP', 'VERIFICATION'],
      default: 'email_verification'
    },
    attempts: {
      type: Number,
      default: 0,
      max: 3
    },
    expires_at: {
      type: Date,
      required: true,
      index: { expires: 0 } // TTL index automatically deletes document when expires_at is reached
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

export const Otp = mongoose.model('Otp', otpSchema);
