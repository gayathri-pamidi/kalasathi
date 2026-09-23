import express from 'express';
import { registerUser, loginUser, forgotPassword, resetPassword } from '../controllers/authController.js';
import { sendOTP, verifyOTP, resendOTP } from '../controllers/otpController.js';
import googleAuthRouter from './googleAuth.js';

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new artisan user and create profile
 * @access  Public
 */
router.post('/register', registerUser);

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user & get JWT token
 * @access  Public
 */
router.post('/login', loginUser);

/**
 * @route   POST /api/auth/send-otp
 * @desc    Generate & send OTP code to user
 * @access  Public
 */
router.post('/send-otp', sendOTP);

/**
 * @route   POST /api/auth/verify-otp
 * @desc    Verify 6-digit OTP code
 * @access  Public
 */
router.post('/verify-otp', verifyOTP);

/**
 * @route   POST /api/auth/resend-otp
 * @desc    Resend a fresh OTP code
 * @access  Public
 */
router.post('/resend-otp', resendOTP);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Initiate password reset (issues OTP)
 * @access  Public
 */
router.post('/forgot-password', forgotPassword);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Complete password reset with new password
 * @access  Public
 */
router.post('/reset-password', resetPassword);

/**
 * Google OAuth routes
 */
router.use('/', googleAuthRouter);

export default router;
