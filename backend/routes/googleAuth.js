import express from 'express';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { ArtisanProfile } from '../models/ArtisanProfile.js';

const router = express.Router();

const getGoogleConfig = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const callbackUrl = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback';

  const isConfigured = Boolean(
    clientId && !clientId.includes('YOUR_GOOGLE') && clientId.trim() !== '' &&
    clientSecret && !clientSecret.includes('YOUR_GOOGLE') && clientSecret.trim() !== ''
  );

  return { clientId, clientSecret, callbackUrl, isConfigured };
};

/**
 * @route   GET /api/auth/google
 * @desc    Initiate Google OAuth 2.0 Login
 * @access  Public
 */
router.get('/google', (req, res) => {
  const { clientId, callbackUrl, isConfigured } = getGoogleConfig();

  console.log(`[GOOGLE] Request received for Google OAuth initiation.`);
  console.log(`[GOOGLE] Credentials configured: ${isConfigured}`);

  if (!isConfigured) {
    return res.status(400).json({
      success: false,
      message: 'Google login is not configured yet. Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in backend/.env'
    });
  }

  const scope = encodeURIComponent('openid profile email');
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(callbackUrl)}&scope=${scope}&prompt=select_account`;

  console.log(`[GOOGLE] Redirecting browser to Google OAuth page...`);
  return res.redirect(googleAuthUrl);
});

/**
 * @route   GET /api/auth/google/callback
 * @desc    Google OAuth Callback Handler
 * @access  Public
 */
router.get('/google/callback', async (req, res) => {
  const frontendOrigin = 'http://localhost:3000';
  const { code, error } = req.query;

  console.log(`[GOOGLE] Callback received.`);

  if (error) {
    console.error(`[GOOGLE Error] OAuth authorization denied or failed:`, error);
    return res.redirect(`${frontendOrigin}?error=${encodeURIComponent('Google login was cancelled or denied.')}`);
  }

  if (!code) {
    console.error(`[GOOGLE Error] No authorization code returned from Google.`);
    return res.redirect(`${frontendOrigin}?error=${encodeURIComponent('No authorization code received from Google.')}`);
  }

  const { clientId, clientSecret, callbackUrl, isConfigured } = getGoogleConfig();

  if (!isConfigured) {
    return res.redirect(`${frontendOrigin}?error=${encodeURIComponent('Google OAuth is missing backend credentials.')}`);
  }

  try {
    // 1. Exchange authorization code for tokens
    const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: callbackUrl,
      grant_type: 'authorization_code'
    });

    const { access_token } = tokenResponse.data;

    // 2. Fetch Google User Profile using access token
    const userinfoResponse = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const googleUser = userinfoResponse.data;
    const { sub, email, name, picture } = googleUser;

    console.log(`[GOOGLE] Google identity verified for email: ${email}`);

    const isMongoConnected = mongoose.connection.readyState === 1;
    let user = null;
    const cleanUserId = `google_${sub.substring(0, 10)}`;

    if (isMongoConnected) {
      // Find user by Google sub ID or Email
      user = await User.findOne({
        $or: [{ user_id: cleanUserId }, { email: email.toLowerCase() }]
      });

      if (!user) {
        console.log(`[GOOGLE] User not found. Creating new artisan User in MongoDB...`);
        user = new User({
          user_id: cleanUserId,
          email: email.toLowerCase(),
          password_hash: 'GOOGLE_OAUTH_AUTHENTICATED',
          email_verified: true, // Google verifies email ownership
          role: 'artisan'
        });
        await user.save();
      } else {
        console.log(`[GOOGLE] Existing user found: ${user.user_id}`);
        if (!user.email_verified) {
          user.email_verified = true;
          await user.save();
        }
      }

      // Check if ArtisanProfile exists
      let profile = await ArtisanProfile.findOne({ user_id: user.user_id });
      if (!profile) {
        console.log(`[GOOGLE] Creating ArtisanProfile in MongoDB for Google user...`);
        profile = new ArtisanProfile({
          profile_id: 'prof_g_' + Date.now(),
          user_id: user.user_id,
          name: name || 'Google Artisan',
          business_name: `${name || 'Google Artisan'} Creations`,
          craft_category: 'Handicrafts & Heritage',
          primary_craft: 'Handicrafts',
          location: 'India',
          language: 'en',
          experience: '1+ Years',
          bio: 'Verified Google Artisan on KalaSaathi',
          profile_image: picture || ''
        });
        await profile.save();
      }
    } else {
      console.warn('[GOOGLE] MongoDB disconnected during Google login. Cannot persist OAuth user.');
    }

    // 3. Issue application JWT token
    const jwtSecret = process.env.JWT_SECRET || 'YOUR_JWT_SECRET';
    const applicationToken = jwt.sign(
      {
        user_id: user ? user.user_id : cleanUserId,
        role: 'artisan'
      },
      jwtSecret,
      { expiresIn: '7d' }
    );

    console.log(`[GOOGLE] Application JWT generated successfully. Redirecting to React dashboard...`);
    return res.redirect(`${frontendOrigin}?token=${applicationToken}`);
  } catch (err) {
    console.error('[GOOGLE Error] Token exchange or identity verification failed:', err.response?.data || err.message);
    return res.redirect(`${frontendOrigin}?error=${encodeURIComponent('Google authentication failed during token verification.')}`);
  }
});

export default router;
