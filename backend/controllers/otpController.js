import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { Otp } from '../models/Otp.js';
import { User } from '../models/User.js';
import { sendOTPEmail } from '../services/emailService.js';

// In-memory OTP storage fallback when database is disconnected
const inMemoryOtps = new Map();

/**
 * Controller: Generate & Send Email OTP Code via Nodemailer SMTP
 * Endpoint: POST /api/auth/send-otp
 */
export const sendOTP = async (req, res) => {
  try {
    const { email, identifier, purpose } = req.body;
    const targetEmail = email || identifier;

    if (!targetEmail || !targetEmail.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required'
      });
    }

    const cleanEmail = targetEmail.trim().toLowerCase();
    const otpPurpose = purpose || 'email_verification';

    // Generate secure 6-digit numeric OTP using crypto module
    const rawOtp = crypto.randomInt(100000, 999999).toString();
    const otp_hash = await bcrypt.hash(rawOtp, 10);
    const expires_at = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry

    const isMongoConnected = mongoose.connection.readyState === 1;

    if (isMongoConnected) {
      // Invalidate existing active OTPs for this email and specific purpose
      await Otp.deleteMany({ email: cleanEmail, purpose: otpPurpose });

      const newOtp = new Otp({
        email: cleanEmail,
        otp_hash,
        purpose: otpPurpose,
        attempts: 0,
        expires_at
      });

      await newOtp.save();
    } else {
      inMemoryOtps.set(cleanEmail, {
        otp_hash,
        purpose: otpPurpose,
        attempts: 0,
        expires_at: expires_at.getTime()
      });
    }

    // Send real email through SMTP using Nodemailer
    try {
      await sendOTPEmail(cleanEmail, rawOtp, otpPurpose);
      return res.status(200).json({
        success: true,
        message: `OTP sent successfully to ${cleanEmail}. Please check your email inbox.`
      });
    } catch (emailErr) {
      console.error('[Email Dispatch Error]', emailErr.message);
      return res.status(400).json({
        success: false,
        message: `Failed to deliver email: ${emailErr.message}`
      });
    }
  } catch (error) {
    console.error('[Send OTP Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process send OTP request',
      error: error.message
    });
  }
};

/**
 * Controller: Verify Email OTP Code
 * Endpoint: POST /api/auth/verify-otp
 */
export const verifyOTP = async (req, res) => {
  try {
    const { email, identifier, otp, purpose } = req.body;
    const targetEmail = email || identifier;

    if (!targetEmail || !targetEmail.trim() || !otp || !otp.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Email address and 6-digit OTP code are required'
      });
    }

    const cleanEmail = targetEmail.trim().toLowerCase();
    const rawOtp = otp.trim();
    const isMongoConnected = mongoose.connection.readyState === 1;

    const targetPurpose = purpose || req.body.purpose || 'email_verification';

    let otpRecord = null;

    if (isMongoConnected) {
      otpRecord = await Otp.findOne({ email: cleanEmail, purpose: targetPurpose });
    } else {
      const stored = inMemoryOtps.get(cleanEmail);
      if (stored && stored.expires_at > Date.now() && stored.purpose === targetPurpose) {
        otpRecord = stored;
      }
    }

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'No active OTP found or code expired. Please request a new verification code.'
      });
    }

    // Enforce max 3 attempts limit
    if (otpRecord.attempts >= 3) {
      if (isMongoConnected) {
        await Otp.deleteOne({ _id: otpRecord._id });
      } else {
        inMemoryOtps.delete(cleanEmail);
      }
      return res.status(400).json({
        success: false,
        message: 'Too many failed attempts. OTP has been invalidated. Please request a new code.'
      });
    }

    // Compare OTP hash using bcrypt
    const isValid = await bcrypt.compare(rawOtp, otpRecord.otp_hash);

    if (!isValid) {
      if (isMongoConnected) {
        otpRecord.attempts += 1;
        await otpRecord.save();
      } else {
        otpRecord.attempts += 1;
      }
      return res.status(400).json({
        success: false,
        message: `Invalid OTP code. ${3 - otpRecord.attempts} attempt(s) remaining.`
      });
    }

    // Verification successful: Delete OTP record to prevent replay
    let updatedUser = null;
    if (isMongoConnected) {
      await Otp.deleteOne({ _id: otpRecord._id });
      // Update User email_verified = true
      updatedUser = await User.findOneAndUpdate(
        { $or: [{ email: cleanEmail }, { user_id: cleanEmail }] },
        { $set: { email_verified: true } },
        { new: true }
      );
    } else {
      inMemoryOtps.delete(cleanEmail);
      for (const u of inMemoryUsers.values()) {
        if (u.email === cleanEmail || u.user_id === cleanEmail) {
          u.email_verified = true;
          updatedUser = u;
          break;
        }
      }
    }

    let token = undefined;
    let userPayload = undefined;

    if (updatedUser && targetPurpose === 'email_verification') {
      const secret = process.env.JWT_SECRET || 'YOUR_JWT_SECRET';
      token = jwt.sign(
        {
          user_id: updatedUser.user_id,
          role: updatedUser.role || 'artisan'
        },
        secret,
        { expiresIn: '7d' }
      );

      userPayload = {
        user_id: updatedUser.user_id,
        email: updatedUser.email,
        role: updatedUser.role || 'artisan'
      };
    }

    return res.status(200).json({
      success: true,
      message: 'Email verified successfully',
      ...(token ? { token, user: userPayload } : {})
    });
  } catch (error) {
    console.error('[Verify OTP Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify OTP code',
      error: error.message
    });
  }
};

/**
 * Controller: Resend Email OTP Code with Cooldown Rate Limiting
 * Endpoint: POST /api/auth/resend-otp
 */
export const resendOTP = async (req, res) => {
  try {
    const { email, identifier, purpose } = req.body;
    const targetEmail = email || identifier;

    if (!targetEmail || !targetEmail.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required'
      });
    }

    const cleanEmail = targetEmail.trim().toLowerCase();
    const otpPurpose = purpose || 'email_verification';
    const isMongoConnected = mongoose.connection.readyState === 1;

    if (isMongoConnected) {
      const existingOtp = await Otp.findOne({ email: cleanEmail, purpose: otpPurpose });
      if (existingOtp) {
        const timeElapsed = (Date.now() - new Date(existingOtp.created_at).getTime()) / 1000;
        if (timeElapsed < 60) {
          const waitTime = Math.ceil(60 - timeElapsed);
          return res.status(429).json({
            success: false,
            message: `Please wait ${waitTime} second(s) before requesting a new OTP.`
          });
        }
      }
    }

    return sendOTP(req, res);
  } catch (error) {
    console.error('[Resend OTP Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to resend OTP',
      error: error.message
    });
  }
};
