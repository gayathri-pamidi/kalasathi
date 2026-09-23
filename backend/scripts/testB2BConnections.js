import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { connectDB } from '../config/db.js';
import { Product } from '../models/Product.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const ARTISAN_BACKEND = 'http://localhost:5000';
const B2B_BACKEND = 'http://localhost:5001';

const JWT_SECRET = process.env.JWT_SECRET || 'kalasaathi_jwt_super_secret_key_2026';
const B2B_JWT_SECRET = process.env.B2B_JWT_SECRET || 'kalasaathi_b2b_buyer_secret_key_2026_secure_jwt';

// Test JWT Tokens
const tokenChitranshi = jwt.sign({ user_id: 'chitranshi_rahi', role: 'artisan' }, JWT_SECRET, { expiresIn: '1h' });
const tokenRuchita = jwt.sign({ user_id: 'ruchita', role: 'artisan' }, JWT_SECRET, { expiresIn: '1h' });
const tokenBuyerB = jwt.sign({ buyer_id: 'BYR0097', role: 'b2b_buyer' }, B2B_JWT_SECRET, { expiresIn: '1h' });
const tokenBuyerC = jwt.sign({ buyer_id: 'BYR0084', role: 'b2b_buyer' }, B2B_JWT_SECRET, { expiresIn: '1h' });

async function runConnectionTests() {
  console.log('==================================================');
  console.log('ARTISAN → B2B BUYER CONNECTION WORKFLOW TEST SUITE');
  console.log('==================================================\n');

  await connectDB();

  // Find a product for chitranshi_rahi
  const testProduct = await Product.findOne({ user_id: 'chitranshi_rahi' }).lean();

  // 1. Artisan A (chitranshi_rahi) connects to Buyer B (BYR0097) via Proxy
  console.log('1. Artisan chitranshi_rahi initiates Connection to Buyer BYR0097 via Proxy...');
  const connectRes = await fetch(`${ARTISAN_BACKEND}/api/artisan/b2b/connect`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${tokenChitranshi}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ buyer_id: 'BYR0097', product_id: testProduct?.product_id || '' })
  });

  const connectData = await connectRes.json();
  console.log(`   Response Message: "${connectData.message}"`);
  const connection = connectData.connection;
  console.log(`   ✅ Connection ID: ${connection.connection_id} (Status: ${connection.status})\n`);

  // 2. Repeat Connect Call to Test Idempotency / Already Pending check
  console.log('2. Testing duplicate connection request handling...');
  const repeatRes = await fetch(`${ARTISAN_BACKEND}/api/artisan/b2b/connect`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${tokenChitranshi}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ buyer_id: 'BYR0097', product_id: testProduct?.product_id || '' })
  });
  const repeatData = await repeatRes.json();
  console.log(`   Response Message: "${repeatData.message}"`);
  console.log(`   Duplicate Prevention Status: ${repeatData.alreadyExists ? '✅ SUCCESS (Duplicate blocked)' : '❌ FAILURE'}\n`);

  // 3. Buyer B fetches "My Connections" on B2B server
  console.log('3. Buyer BYR0097 fetching "My Connections" on B2B server...');
  const buyerBRes = await fetch(`${B2B_BACKEND}/api/b2b/connections/my-connections`, {
    headers: { 'Authorization': `Bearer ${tokenBuyerB}` }
  });
  const buyerBData = await buyerBRes.json();
  console.log(`   ✅ Buyer BYR0097 sees ${buyerBData.count} connections.`);
  const foundConnForB = buyerBData.connections.find(c => c.connection_id === connection.connection_id);
  console.log(`   Buyer B sees connection request from chitranshi_rahi: ${foundConnForB ? 'YES' : 'NO'}\n`);

  // 4. Security Check: Buyer C (BYR0084) fetches "My Connections"
  console.log('4. Security Check: Buyer BYR0084 fetching "My Connections"...');
  const buyerCRes = await fetch(`${B2B_BACKEND}/api/b2b/connections/my-connections`, {
    headers: { 'Authorization': `Bearer ${tokenBuyerC}` }
  });
  const buyerCData = await buyerCRes.json();
  const leakedToC = buyerCData.connections.some(c => c.connection_id === connection.connection_id);
  console.log(`   Security Status: ${!leakedToC ? '✅ SECURE (Buyer C cannot see Buyer B connection)' : '❌ INSECURE'}\n`);

  // 5. Buyer B Accepts the Connection
  console.log('5. Buyer BYR0097 accepting the connection request...');
  const acceptRes = await fetch(`${B2B_BACKEND}/api/b2b/connections/${connection.connection_id}/status`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${tokenBuyerB}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ status: 'accepted' })
  });
  const acceptData = await acceptRes.json();
  console.log(`   ✅ Connection status updated to: ${acceptData.connection.status}\n`);

  // 6. Artisan A fetches connections via Proxy to verify "Connected" status
  console.log('6. Artisan chitranshi_rahi checking connection status via Proxy...');
  const artisanConnsRes = await fetch(`${ARTISAN_BACKEND}/api/artisan/b2b/connections`, {
    headers: { 'Authorization': `Bearer ${tokenChitranshi}` }
  });
  const artisanConnsData = await artisanConnsRes.json();
  const acceptedConn = artisanConnsData.connections.find(c => c.connection_id === connection.connection_id);
  console.log(`   Artisan A sees status: '${acceptedConn?.status}'`);
  console.log(`   Connection Status: ${acceptedConn?.status === 'accepted' ? '✅ CONNECTED' : '❌ NOT CONNECTED'}\n`);

  // 7. Security Check: Artisan B (ruchita) checking connections
  console.log('7. Security Check: Artisan ruchita checking connections...');
  const ruchitaConnsRes = await fetch(`${ARTISAN_BACKEND}/api/artisan/b2b/connections`, {
    headers: { 'Authorization': `Bearer ${tokenRuchita}` }
  });
  const ruchitaConnsData = await ruchitaConnsRes.json();
  const leakedToRuchita = ruchitaConnsData.connections.some(c => c.connection_id === connection.connection_id);
  console.log(`   Security Status: ${!leakedToRuchita ? '✅ SECURE (Artisan B cannot see Artisan A connection)' : '❌ INSECURE'}\n`);

  await mongoose.disconnect();
  console.log('Disconnected from MongoDB.');
}

runConnectionTests().catch(err => {
  console.error('❌ Connection Test Error:', err);
  process.exit(1);
});
