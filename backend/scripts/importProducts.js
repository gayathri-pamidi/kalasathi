import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Product } from '../models/Product.js';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const isDryRun = process.argv.includes('--dry-run');

/**
 * Robust CSV parser that handles quoted strings containing commas
 */
function parseCSV(text) {
  const rows = [];
  let currentRow = [];
  let currentVal = '';
  let inQuotes = false;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    
    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        currentVal += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentVal.trim());
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && text[i + 1] === '\n') {
        i++;
      }
      currentRow.push(currentVal.trim());
      if (currentRow.some(cell => cell.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentVal = '';
    } else {
      currentVal += char;
    }
  }
  if (currentVal || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    if (currentRow.some(cell => cell.length > 0)) {
      rows.push(currentRow);
    }
  }

  if (rows.length === 0) return { header: [], rows: [] };
  const header = rows[0];
  const dataRows = [];
  for (let i = 1; i < rows.length; i++) {
    const rawValues = rows[i];
    const rowObj = {};
    header.forEach((colName, index) => {
      rowObj[colName] = rawValues[index] !== undefined ? rawValues[index] : '';
    });
    dataRows.push({ rowIndex: i + 1, data: rowObj });
  }

  return { header, rows: dataRows };
}

/**
 * Helper to parse dates formatted as DD-MM-YYYY or YYYY-MM-DD
 */
function parseDate(dateStr) {
  if (!dateStr) return null;
  const str = dateStr.trim();
  
  const match = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/.exec(str);
  if (match) {
    let p1 = parseInt(match[1], 10);
    let p2 = parseInt(match[2], 10);
    let year = parseInt(match[3], 10);
    
    let day, month;
    if (p2 > 12) {
      // p1 is month, p2 is day (e.g. 5/24/2025 -> May 24, 2025)
      month = p1 - 1;
      day = p2;
    } else {
      // default DD-MM-YYYY (e.g. 01-02-2025 -> Feb 1, 2025)
      day = p1;
      month = p2 - 1;
    }
    const parsed = new Date(Date.UTC(year, month, day));
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Generate a deterministic product_id based on key record fields
 */
function generateDeterministicProductId(data, rowIndex) {
  const seed = `${data.user_id}_${data.product}_${data.state}_${data.district}_${data.date}_${rowIndex}`.toLowerCase();
  const hash = crypto.createHash('md5').update(seed).digest('hex').substring(0, 10).toUpperCase();
  return `PROD_IMP_${hash}`;
}

async function runImporter() {
  console.log('==================================================');
  console.log(`PRODUCT DATASET IMPORTER ${isDryRun ? '[DRY-RUN MODE]' : '[LIVE IMPORT MODE]'}`);
  console.log('==================================================\n');

  // 1. Locate CSV dataset
  const csvPathCandidate = path.join(__dirname, '../products_dataset.csv');
  const fallbackCsvPath = path.join(__dirname, '../../artisan-ai/ml/datasets/sih2.csv');
  
  let csvPath = csvPathCandidate;
  if (!fs.existsSync(csvPath)) {
    if (fs.existsSync(fallbackCsvPath)) {
      csvPath = fallbackCsvPath;
    } else {
      console.error(`❌ CSV dataset file not found at ${csvPathCandidate}`);
      process.exit(1);
    }
  }

  console.log(`📁 CSV Dataset Path: ${csvPath}`);
  const csvText = fs.readFileSync(csvPath, 'utf8');
  const { header, rows } = parseCSV(csvText);

  console.log(`📊 Total CSV Rows Found: ${rows.length}`);
  console.log(`📋 Header Columns (${header.length}): ${header.join(', ')}\n`);

  // 2. Connect to MongoDB
  await connectDB();
  console.log('✅ Connected to MongoDB\n');

  // 3. Cache existing user_ids in memory for fast validation
  const existingUsers = await User.find({}, { user_id: 1 }).lean();
  const validUserIdsSet = new Set(existingUsers.map(u => u.user_id));
  console.log(`👤 Found ${validUserIdsSet.size} registered users in MongoDB: [${Array.from(validUserIdsSet).join(', ')}]\n`);

  // Statistics trackers
  let validRowsCount = 0;
  let invalidRowsCount = 0;
  let missingImageCount = 0;
  let wouldInsertCount = 0;
  let wouldUpdateCount = 0;
  let importedCount = 0;
  let updatedCount = 0;

  const missingUserIdsMap = new Map(); // user_id -> count
  const invalidRowsDetails = [];
  const processedProductIds = new Set();
  let duplicateProductIdsCount = 0;

  console.log('🔍 Processing and validating records...\n');

  for (const { rowIndex, data } of rows) {
    const rawUserId = (data.user_id || '').trim();
    const rawProductTitle = (data.product || '').trim();
    const rawImageUrl = (data.image_url || '').trim();

    // Field level validation
    let isRowValid = true;
    const rowErrors = [];

    if (!rawUserId) {
      isRowValid = false;
      rowErrors.push('Missing user_id');
    }

    if (!rawProductTitle) {
      isRowValid = false;
      rowErrors.push('Missing product title');
    }

    if (rawUserId && !validUserIdsSet.has(rawUserId)) {
      isRowValid = false;
      rowErrors.push(`user_id '${rawUserId}' does not exist in MongoDB users collection`);
      missingUserIdsMap.set(rawUserId, (missingUserIdsMap.get(rawUserId) || 0) + 1);
    }

    if (!rawImageUrl) {
      missingImageCount++;
    }

    const marketPrice = Number(data.market_price);
    if (data.market_price && isNaN(marketPrice)) {
      isRowValid = false;
      rowErrors.push(`Invalid market_price numeric value: '${data.market_price}'`);
    }

    const parsedDatasetDate = parseDate(data.date);
    if (data.date && !parsedDatasetDate) {
      isRowValid = false;
      rowErrors.push(`Invalid date format: '${data.date}'`);
    }

    if (!isRowValid) {
      invalidRowsCount++;
      invalidRowsDetails.push({ rowIndex, errors: rowErrors, data });
      continue;
    }

    validRowsCount++;

    const productId = generateDeterministicProductId(data, rowIndex);

    if (processedProductIds.has(productId)) {
      duplicateProductIdsCount++;
    } else {
      processedProductIds.add(productId);
    }

    // Check if product already exists in DB
    const existingProductInDB = await Product.findOne({ product_id: productId }).lean();
    if (existingProductInDB) {
      wouldUpdateCount++;
    } else {
      wouldInsertCount++;
    }

    // Prepare document
    const productDocument = {
      product_id: productId,
      user_id: rawUserId,
      title: rawProductTitle,
      description: `Authentic ${rawProductTitle} handcrafted in ${data.district || 'India'}, ${data.state || ''}. Sector: ${data.sector || 'Handicraft'}, Material: ${data.material || 'Natural'}.`,
      category: (data.category || '').trim(),
      price: !isNaN(marketPrice) ? marketPrice : 0,
      stock: 0, // Reference dataset initial stock set to 0
      images: rawImageUrl ? [rawImageUrl] : [],
      status: 'active',
      created_at: new Date(),
      state: (data.state || '').trim(),
      district: (data.district || '').trim(),
      sector: (data.sector || '').trim(),
      material: (data.material || '').trim(),
      product_size: (data.product_size || '').trim(),
      labour_hours: Number(data.labour_hours) || 0,
      material_cost: Number(data.material_cost) || 0,
      product_cost: Number(data.product_cost) || 0,
      dataset_quantity: Number(data.quantity) || 0,
      dataset_date: parsedDatasetDate,
      demand_level: (data.demand_level || '').trim(),
      season: (data.season || '').trim(),
      source: (data.source || '').trim(),
      image_source_type: (data.image_source_type || '').trim(),
      dominant_colors: [],
      visual_features: []
    };

    // If LIVE import, perform database write
    if (!isDryRun) {
      const res = await Product.updateOne(
        { product_id: productId },
        { $set: productDocument },
        { upsert: true }
      );
      if (res.upsertedCount > 0) {
        importedCount++;
      } else {
        updatedCount++;
      }
    }
  }

  // Output Summary Report
  console.log('==================================================');
  console.log(`SUMMARY REPORT ${isDryRun ? '[DRY-RUN RESULTS]' : '[LIVE IMPORT RESULTS]'}`);
  console.log('==================================================');
  console.log(`Total CSV Rows Processed: ${rows.length}`);
  console.log(`Valid Rows:               ${validRowsCount}`);
  console.log(`Invalid Rows Skipped:     ${invalidRowsCount}`);
  console.log(`Missing Image URLs:       ${missingImageCount}`);
  console.log(`Duplicate IDs in CSV:     ${duplicateProductIdsCount}`);

  if (missingUserIdsMap.size > 0) {
    console.log('\n❌ Missing user_ids in MongoDB users collection:');
    missingUserIdsMap.forEach((count, uid) => {
      console.log(`   - user_id: '${uid}' (${count} products skipped)`);
    });
  } else {
    console.log('\n✅ All user_ids in CSV exist in MongoDB users collection!');
  }

  if (isDryRun) {
    console.log('\n--------------------------------------------------');
    console.log('DRY-RUN PROJECTION:');
    console.log(`   Rows that WOULD BE INSERTED (New Products): ${wouldInsertCount}`);
    console.log(`   Rows that WOULD BE UPDATED / SKIPPED:       ${wouldUpdateCount}`);
    console.log('--------------------------------------------------');
    console.log('ℹ️  No changes were made to MongoDB during this dry-run.');
  } else {
    console.log('\n--------------------------------------------------');
    console.log('LIVE DATABASE EXECUTION STATS:');
    console.log(`   Imported (New Documents Created): ${importedCount}`);
    console.log(`   Updated / Skipped (Existing):     ${updatedCount}`);
    console.log('--------------------------------------------------');
    console.log('✅ Database import process complete!');
  }

  await mongoose.disconnect();
  console.log('Disconnected from MongoDB.');
}

runImporter().catch((err) => {
  console.error('❌ Import Script Error:', err);
  process.exit(1);
});
