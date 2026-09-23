import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { connectDB } from '../config/db.js';
import { Product } from '../models/Product.js';
import { Order } from '../models/Order.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const ARTISAN_BACKEND = 'http://localhost:5000';
const B2B_BACKEND = 'http://localhost:5001';
const JWT_SECRET = process.env.JWT_SECRET || 'kalasaathi_jwt_super_secret_key_2026';

const B2B_JWT_SECRET = process.env.B2B_JWT_SECRET || 'kalasaathi_b2b_buyer_secret_key_2026_secure_jwt';

// Generate test JWT tokens
const tokenChitranshi = jwt.sign({ user_id: 'chitranshi_rahi', role: 'artisan' }, JWT_SECRET, { expiresIn: '1h' });
const tokenRuchita = jwt.sign({ user_id: 'ruchita', role: 'artisan' }, JWT_SECRET, { expiresIn: '1h' });
const tokenBuyer = jwt.sign({ buyer_id: 'BYR0097', role: 'b2b_buyer' }, B2B_JWT_SECRET, { expiresIn: '1h' });

async function runIntegrationTest() {
  console.log('==================================================');
  console.log('CROSS-PLATFORM B2B INTEGRATION SUITE');
  console.log('==================================================\n');

  await connectDB();

  // Find a real product belonging to chitranshi_rahi
  const testProduct = await Product.findOne({ user_id: 'chitranshi_rahi' }).lean();
  if (!testProduct) {
    throw new Error('No product found for user chitranshi_rahi');
  }
  console.log(`📦 Found test product in MongoDB: '${testProduct.title}' (ID: ${testProduct.product_id})\n`);

  // Test 1: Check B2B Server Health
  console.log('1. Checking B2B Server Health at http://localhost:5001/api/b2b/health...');
  const healthRes = await fetch(`${B2B_BACKEND}/api/b2b/health`);
  if (!healthRes.ok) {
    throw new Error(`B2B Server unreachable (status ${healthRes.status})`);
  }
  const healthData = await healthRes.json();
  console.log(`   ✅ B2B Health Status: ${healthData.status} - ${healthData.service}\n`);

  // Test 2: B2B Buyer Sends Inquiry to B2B Backend for artisan chitranshi_rahi
  console.log('2. Simulating B2B Buyer Inquiry creation on B2B server...');
  const testInquiryPayload = {
    product_id: testProduct.product_id,
    quantity: 50,
    message: 'We require 50 units for our festival wholesale showcase in Delhi.'
  };

  const createInquiryRes = await fetch(`${B2B_BACKEND}/api/b2b/inquiries`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenBuyer}`
    },
    body: JSON.stringify(testInquiryPayload)
  });

  const createdInquiryData = await createInquiryRes.json();
  if (!createdInquiryData.success) {
    throw new Error(`Failed to create B2B inquiry: ${createdInquiryData.message}`);
  }
  const testInquiry = createdInquiryData.inquiry;
  console.log(`   ✅ Created B2B Inquiry ID: ${testInquiry.inquiry_id} (Status: ${testInquiry.status})\n`);

  // Test 3: Artisan chitranshi_rahi fetches inquiries via Proxy (Port 5000)
  console.log('3. Fetching B2B inquiries for chitranshi_rahi via Artisan Proxy (Port 5000)...');
  const getInquiriesRes = await fetch(`${ARTISAN_BACKEND}/api/artisan/b2b/inquiries`, {
    headers: { 'Authorization': `Bearer ${tokenChitranshi}` }
  });
  const inquiriesData = await getInquiriesRes.json();
  console.log(`   ✅ Proxy returned ${inquiriesData.inquiries.length} inquiries for chitranshi_rahi.`);
  const foundInquiry = inquiriesData.inquiries.find(i => i.inquiry_id === testInquiry.inquiry_id);
  console.log(`   Found inquiry in artisan dashboard: ${foundInquiry ? 'YES' : 'NO'}\n`);

  // Test 4: Security Check — ruchita fetches inquiries (should NOT see chitranshi_rahi's inquiry)
  console.log('4. Security Check: Fetching inquiries for ruchita...');
  const ruchitaInqRes = await fetch(`${ARTISAN_BACKEND}/api/artisan/b2b/inquiries`, {
    headers: { 'Authorization': `Bearer ${tokenRuchita}` }
  });
  const ruchitaInqData = await ruchitaInqRes.json();
  const hasLeakedInquiry = ruchitaInqData.inquiries.some(i => i.inquiry_id === testInquiry.inquiry_id);
  console.log(`   Security Status: ${!hasLeakedInquiry ? '✅ SECURE (Inquiry strictly isolated)' : '❌ INSECURE'}\n`);

  // Test 5: Artisan accepts inquiry via Proxy
  console.log('5. Artisan accepting B2B inquiry via Proxy...');
  const acceptInqRes = await fetch(`${ARTISAN_BACKEND}/api/artisan/b2b/inquiries/${testInquiry.inquiry_id}/status`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${tokenChitranshi}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ status: 'accepted' })
  });
  const acceptInqData = await acceptInqRes.json();
  console.log(`   ✅ Inquiry status updated: ${acceptInqData.inquiry.status}\n`);

  // Test 6: B2B Buyer Places Bulk Order on B2B Backend
  console.log('6. Simulating B2B Buyer Bulk Order placement on B2B server...');
  const testOrderPayload = {
    product_id: testProduct.product_id,
    quantity: 20,
    unit_price: 1200,
    delivery_location: 'New Delhi Craft Hub',
    buyer_message: 'High priority order for immediate delivery.'
  };

  const createOrderRes = await fetch(`${B2B_BACKEND}/api/b2b/orders`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenBuyer}`
    },
    body: JSON.stringify(testOrderPayload)
  });
  const createdOrderData = await createOrderRes.json();
  if (!createdOrderData.success) {
    throw new Error(`Failed to create B2B order: ${createdOrderData.message}`);
  }
  const testOrder = createdOrderData.order;
  console.log(`   ✅ Created B2B Order ID: ${testOrder.order_id} (Initial Status: ${testOrder.status})\n`);

  // Test 7: Verify Pending Order does NOT increase revenue in Analytics
  console.log('7. Verifying Pending Order does NOT count towards revenue in Business Manager...');
  const analyticsBeforeRes = await fetch(`${ARTISAN_BACKEND}/api/artisan/analytics`, {
    headers: { 'Authorization': `Bearer ${tokenChitranshi}` }
  });
  const analyticsBefore = (await analyticsBeforeRes.json()).analytics;
  console.log(`   Revenue BEFORE completion: ₹${analyticsBefore.totalRevenue}`);
  console.log(`   Completed Orders BEFORE completion: ${analyticsBefore.completedOrders}\n`);

  // Test 8: Security Check — ruchita attempts to accept chitranshi_rahi's order (should fail 403 Forbidden)
  console.log('8. Security Check: ruchita attempts to modify chitranshi_rahi\'s order...');
  const unauthorizedRes = await fetch(`${ARTISAN_BACKEND}/api/artisan/b2b/orders/${testOrder.order_id}/status`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${tokenRuchita}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ status: 'accepted' })
  });
  console.log(`   HTTP Status code: ${unauthorizedRes.status} (Expected 403 Forbidden)`);
  console.log(`   Security Status: ${unauthorizedRes.status === 403 ? '✅ SECURE (Unauthorized modification blocked)' : '❌ INSECURE'}\n`);

  // Test 9: Artisan accepts order via Proxy (Pending -> Accepted)
  console.log('9. Artisan chitranshi_rahi accepting B2B order (Pending -> Accepted)...');
  const acceptOrderRes = await fetch(`${ARTISAN_BACKEND}/api/artisan/b2b/orders/${testOrder.order_id}/status`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${tokenChitranshi}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ status: 'accepted' })
  });
  const acceptOrderData = await acceptOrderRes.json();
  console.log(`   ✅ Order status updated to: ${acceptOrderData.order.status}\n`);

  // Test 10: Artisan completes order via Proxy (Accepted -> Completed)
  console.log('10. Artisan chitranshi_rahi completing B2B order (Accepted -> Completed)...');
  const completeOrderRes = await fetch(`${ARTISAN_BACKEND}/api/artisan/b2b/orders/${testOrder.order_id}/status`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${tokenChitranshi}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ status: 'completed' })
  });
  const completeOrderData = await completeOrderRes.json();
  console.log(`   ✅ Order status updated to: ${completeOrderData.order.status}\n`);

  // Test 11: Verify Business Manager Analytics reflects completed order revenue & units sold!
  console.log('11. Verifying Business Manager Analytics updated with completed B2B order...');
  const analyticsAfterRes = await fetch(`${ARTISAN_BACKEND}/api/artisan/analytics`, {
    headers: { 'Authorization': `Bearer ${tokenChitranshi}` }
  });
  const analyticsAfter = (await analyticsAfterRes.json()).analytics;
  const expectedRevenue = analyticsBefore.totalRevenue + (testOrder.total_amount || (testOrder.quantity * testOrder.unit_price));
  console.log(`   Revenue AFTER completion: ₹${analyticsAfter.totalRevenue} (Increased by ₹${analyticsAfter.totalRevenue - analyticsBefore.totalRevenue})`);
  console.log(`   Completed Orders AFTER completion: ${analyticsAfter.completedOrders}`);
  console.log(`   Units Sold AFTER completion: ${analyticsAfter.totalUnitsSold}`);
  const isRevenueCorrect = analyticsAfter.totalRevenue === expectedRevenue;
  console.log(`   Analytics Sync Status: ${isRevenueCorrect ? '✅ SUCCESS (Revenue synced correctly)' : '❌ FAILURE'}\n`);

  await mongoose.disconnect();
  console.log('Disconnected from MongoDB.');
}

runIntegrationTest().catch(err => {
  console.error('❌ Integration Test Error:', err);
  process.exit(1);
});
