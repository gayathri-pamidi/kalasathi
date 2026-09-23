import mongoose from 'mongoose';
import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);
/**
 * Connect to MongoDB database using Mongoose
 */
export const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri || uri.includes('YOUR_MONGODB') || uri.trim() === '') {
    console.log('[Database] MONGODB_URI is not set or using placeholder. Database is disconnected.');
    return;
  }

  try {
    const conn = await mongoose.connect(uri);
    console.log(`[Database] MongoDB Connected Successfully: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[Database Error] Failed to connect to MongoDB: ${error.message}`);
  }
};

/**
 * Helper to get current database connection status
 */
export const getDBStatus = () => {
  return mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
};

