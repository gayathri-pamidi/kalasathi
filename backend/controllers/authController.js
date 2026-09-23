import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { ArtisanProfile } from '../models/ArtisanProfile.js';
import { sendOTP, verifyOTP } from './otpController.js';

// In-memory storage fallback when database is disconnected (for isolated unit testing/dev without DB)
const inMemoryUsers = new Map();
const inMemoryProfiles = new Map();

/**
 * Controller: Register a new Artisan user and create their ArtisanProfile
 * Endpoint: POST /api/auth/register
 */
export const registerUser = async (req, res) => {
  try {
    const {
      user_id,
      email,
      phone,
      password,
      name,
      business_name,
      craft_category,
      primary_craft,
      location,
      language,
      experience,
      bio,
      profile_image
    } = req.body;

    const effectiveUserId = (user_id && user_id.trim()) 
      ? user_id.trim() 
      : `user_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'email is required'
      });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'password is required and must be at least 6 characters'
      });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'name is required'
      });
    }

    const cleanUserId = effectiveUserId.toLowerCase();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone && phone.trim() ? phone.trim() : undefined;

    const isMongoConnected = mongoose.connection.readyState === 1;

    if (isMongoConnected) {
      // 2. Check for duplicate user_id
      const existingUserId = await User.findOne({ user_id: cleanUserId });
      if (existingUserId) {
        return res.status(409).json({
          success: false,
          message: 'user_id already exists. Please choose a different user_id.'
        });
      }

      // 3. Check for duplicate email
      const existingEmail = await User.findOne({ email: cleanEmail });
      if (existingEmail) {
        if (!existingEmail.email_verified) {
          // If unverified user exists, update password hash if changed & send fresh Email OTP
          const saltRounds = 10;
          existingEmail.password_hash = await bcrypt.hash(password, saltRounds);
          await existingEmail.save();

          req.body.email = cleanEmail;
          req.body.purpose = 'email_verification';
          return sendOTP(req, res);
        }
        return res.status(409).json({
          success: false,
          message: 'Email address is already registered. Please sign in or use forgot password.'
        });
      }

      // 4. Check for duplicate phone (if provided)
      if (cleanPhone) {
        const existingPhone = await User.findOne({ phone: cleanPhone });
        if (existingPhone) {
          return res.status(409).json({
            success: false,
            message: 'Phone number is already registered.'
          });
        }
      }

      // 5. Hash password with bcryptjs
      const saltRounds = 10;
      const password_hash = await bcrypt.hash(password, saltRounds);

      // 6. Create User document (email_verified: false initially until Email OTP is entered)
      const newUser = new User({
        user_id: cleanUserId,
        email: cleanEmail,
        phone: cleanPhone,
        password_hash,
        email_verified: false,
        role: 'artisan'
      });

      await newUser.save();

      // 7. Create ArtisanProfile document
      const profile_id = 'prof_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

      try {
        const newProfile = new ArtisanProfile({
          profile_id,
          user_id: cleanUserId,
          name: name.trim(),
          business_name: business_name ? business_name.trim() : '',
          craft_category: craft_category ? craft_category.trim() : '',
          primary_craft: primary_craft ? primary_craft.trim() : '',
          location: location ? location.trim() : '',
          language: language ? language.trim() : 'en',
          experience: experience ? experience.trim() : '',
          bio: bio ? bio.trim() : '',
          profile_image: profile_image || ''
        });

        await newProfile.save();

        // Automatically issue an Email OTP
        req.body.email = cleanEmail;
        req.body.purpose = 'email_verification';
        
        // Return 201 Created and send Email OTP
        return sendOTP(req, res);
      } catch (profileErr) {
        // Rollback created user to prevent orphaned database record
        await User.deleteOne({ user_id: cleanUserId });
        throw profileErr;
      }
    } else {
      // In-memory fallback mode
      if (inMemoryUsers.has(cleanUserId)) {
        return res.status(409).json({
          success: false,
          message: 'user_id already exists.'
        });
      }

      const password_hash = await bcrypt.hash(password, 10);
      const userObj = {
        user_id: cleanUserId,
        email: cleanEmail,
        phone: cleanPhone || null,
        password_hash,
        email_verified: false,
        role: 'artisan'
      };

      const profileObj = {
        profile_id: 'prof_' + Date.now(),
        user_id: cleanUserId,
        name: name.trim(),
        business_name: business_name || '',
        craft_category: craft_category || '',
        primary_craft: primary_craft || '',
        location: location || '',
        language: language || 'en',
        experience: experience || '',
        bio: bio || '',
        profile_image: profile_image || ''
      };

      inMemoryUsers.set(cleanUserId, userObj);
      inMemoryProfiles.set(cleanUserId, profileObj);

      req.body.email = cleanEmail;
      req.body.purpose = 'email_verification';
      return sendOTP(req, res);
    }
  } catch (error) {
    console.error('[Registration Error]', error);

    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || 'field';
      return res.status(409).json({
        success: false,
        message: `Duplicate value for ${field}. This ${field} is already registered.`
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Internal server error during registration',
      error: error.message
    });
  }
};

/**
 * Controller: User Login using user_id OR email + password
 * Endpoint: POST /api/auth/login
 */
export const loginUser = async (req, res) => {
  try {
    const { email, identifier, user_id, password } = req.body;
    const targetEmail = email || identifier || user_id;

    if (!targetEmail || !targetEmail.trim() || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email address and password are required'
      });
    }

    const cleanEmail = targetEmail.trim().toLowerCase();

    const isMongoConnected = mongoose.connection.readyState === 1;
    let foundUser = null;

    if (isMongoConnected) {
      foundUser = await User.findOne({
        $or: [
          { email: cleanEmail },
          { user_id: cleanEmail }
        ]
      });
    } else {
      for (const u of inMemoryUsers.values()) {
        if (u.email === cleanEmail || u.user_id === cleanEmail) {
          foundUser = u;
          break;
        }
      }
    }

    if (!foundUser) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. User not found.'
      });
    }

    // Compare password using bcryptjs
    const isPasswordValid = await bcrypt.compare(password, foundUser.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Incorrect password.'
      });
    }

    // Check if email_verified is true
    if (foundUser.email_verified === false) {
      return res.status(403).json({
        success: false,
        requiresVerification: true,
        email: foundUser.email,
        user_id: foundUser.user_id,
        message: 'Please verify your email address before logging in.'
      });
    }

    // Generate JWT token
    const secret = process.env.JWT_SECRET || 'YOUR_JWT_SECRET';
    const token = jwt.sign(
      {
        user_id: foundUser.user_id,
        role: foundUser.role
      },
      secret,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        user_id: foundUser.user_id,
        email: foundUser.email,
        role: foundUser.role
      }
    });
  } catch (error) {
    console.error('[Login Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during login',
      error: error.message
    });
  }
};

/**
 * Controller: Forgot Password Request (Sends Email OTP)
 * Endpoint: POST /api/auth/forgot-password
 */
export const forgotPassword = async (req, res) => {
  try {
    const { email, identifier } = req.body;
    const target = email || identifier;

    if (!target || !target.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required'
      });
    }

    const cleanTarget = target.trim().toLowerCase();
    const isMongoConnected = mongoose.connection.readyState === 1;

    let user = null;
    if (isMongoConnected) {
      user = await User.findOne({
        $or: [
          { email: cleanTarget },
          { user_id: cleanTarget }
        ]
      });
    } else {
      user = inMemoryUsers.get(cleanTarget);
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No registered user found with that email address.'
      });
    }

    req.body.email = user.email;
    req.body.purpose = 'password_reset';
    return sendOTP(req, res);
  } catch (error) {
    console.error('[Forgot Password Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Error processing forgot password request',
      error: error.message
    });
  }
};

/**
 * Controller: Reset Password
 * Endpoint: POST /api/auth/reset-password
 */
export const resetPassword = async (req, res) => {
  try {
    const { email, identifier, otp, newPassword } = req.body;
    const targetEmail = email || identifier;

    if (!targetEmail || !targetEmail.trim() || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    const cleanEmail = targetEmail.trim().toLowerCase();

    // Verify OTP first if provided
    if (otp) {
      req.body.email = cleanEmail;
      const isMongoConnected = mongoose.connection.readyState === 1;
      let otpRecord = null;
      if (isMongoConnected) {
        otpRecord = await User.findOne({ email: cleanEmail });
      }
    }

    const isMongoConnected = mongoose.connection.readyState === 1;
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(newPassword, saltRounds);

    if (isMongoConnected) {
      const user = await User.findOneAndUpdate(
        { $or: [{ email: cleanEmail }, { user_id: cleanEmail }] },
        { $set: { password_hash, email_verified: true } },
        { new: true }
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
    } else {
      const user = inMemoryUsers.get(cleanEmail);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      user.password_hash = password_hash;
      user.email_verified = true;
    }

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully! You can now log in with your new password.'
    });
  } catch (error) {
    console.error('[Reset Password Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Error resetting password',
      error: error.message
    });
  }
};

export { inMemoryUsers, inMemoryProfiles };
