import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB, getDBStatus } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import artisanRoutes from './routes/artisanRoutes.js';

// Load environment variables from .env file
dotenv.config();

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Connect to Database
connectDB();

// Health Check Route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Artisan AI backend is running',
    database: getDBStatus()
  });
});

// Request Audit Logger Middleware for product publishing debugging
app.use((req, res, next) => {
  if (req.path.includes('/products')) {
    console.log('[Express Server Audit]', req.method, req.path, {
      contentType: req.headers['content-type'],
      hasAuthHeader: Boolean(req.headers.authorization),
      contentLength: req.headers['content-length']
    });
  }
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/artisan', artisanRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Express Error]', {
    name: err.name,
    message: err.message,
    status: err.status || 500,
    stack: err.stack
  });
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    error: err.message
  });
});

// Start Server & Email OTP Service
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n==================================================`);
  console.log(`[Server] Artisan AI Backend running on http://localhost:${PORT}`);
  console.log(`[Startup Audit] Safe Environment Diagnostics:`);
  console.log(`- MONGODB_URI configured           : ${Boolean(process.env.MONGODB_URI && !process.env.MONGODB_URI.includes('YOUR_MONGODB'))}`);
  console.log(`- Google Client ID configured      : ${Boolean(process.env.GOOGLE_CLIENT_ID && !process.env.GOOGLE_CLIENT_ID.includes('YOUR_GOOGLE'))}`);
  console.log(`- Google Client Secret configured  : ${Boolean(process.env.GOOGLE_CLIENT_SECRET && !process.env.GOOGLE_CLIENT_SECRET.includes('YOUR_GOOGLE'))}`);
  console.log(`- Google Callback URL              : ${process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback'}`);
  console.log(`- SMTP Email Service Host          : ${process.env.EMAIL_HOST || 'smtp.gmail.com'}`);
  console.log(`- SMTP Email User Configured       : ${Boolean(process.env.EMAIL_USER && !process.env.EMAIL_USER.includes('your-email'))}`);
  console.log(`- SMTP App Password Configured     : ${Boolean(process.env.EMAIL_APP_PASSWORD && !process.env.EMAIL_APP_PASSWORD.includes('your-app-password'))}`);
  console.log(`==================================================\n`);
});
