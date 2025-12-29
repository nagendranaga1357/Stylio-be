/**
 * Salon Data Import Script
 * 
 * Imports salon data from finalsalons_scrap.csv into MongoDB
 * 
 * Usage: cd server && node src/scripts/importSalons.js
 */

import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Import models
import Salon from '../models/Salon.js';
import { City, Area } from '../models/Location.js';
import { ServiceCategory, ServiceType, Service } from '../models/Service.js';

// =====================
// CONFIGURATION
// =====================

const CSV_PATH = path.join(__dirname, '../../finalsalons_scrap.csv');
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/stylio';

// Amalapuram coordinates
const AMALAPURAM_COORDS = {
  longitude: 82.0009,
  latitude: 16.5782,
};

// Default service prices and durations
const SERVICE_PRICES = {
  'hair cut': { price: 150, duration: 30, audience: ['men', 'women'] },
  'hair colour': { price: 500, duration: 60, audience: ['men', 'women'] },
  'hair styling': { price: 300, duration: 45, audience: ['men', 'women'] },
  'classic hair cut for women': { price: 200, duration: 30, audience: ['women'] },
  'classic hair cut for women (member)': { price: 180, duration: 30, audience: ['women'] },
  'balayage global hair colour with hair highlight': { price: 1500, duration: 120, audience: ['women'] },
  'balayage global hair colour with hair highlight (member)': { price: 1350, duration: 120, audience: ['women'] },
  'ear piercing': { price: 200, duration: 15, audience: ['women', 'kids'] },
  'ear piercing for baby': { price: 150, duration: 15, audience: ['kids'] },
  'change of nail colour (member)': { price: 80, duration: 20, audience: ['women'] },
  'change of nail colour (regular)': { price: 100, duration: 20, audience: ['women'] },
  'french nail polish (finger, toe) (regular)': { price: 200, duration: 30, audience: ['women'] },
};

// Service to Category mapping
const SERVICE_CATEGORY_MAP = {
  'hair cut': 'Hair Care',
  'hair colour': 'Hair Care',
  'hair styling': 'Hair Care',
  'classic hair cut': 'Hair Care',
  'balayage': 'Hair Care',
  'ear piercing': 'Beauty',
  'nail': 'Nail Care',
  'french nail': 'Nail Care',
  'mehendi': 'Beauty',
  'massage': 'Spa & Massage',
  'facial': 'Skin Care',
  'spa': 'Spa & Massage',
};

// Service Categories to create
const SERVICE_CATEGORIES = [
  { name: 'Hair Care', slug: 'hair-care', icon: 'cut-outline', description: 'Haircuts, coloring, and styling services', order: 1 },
  { name: 'Beauty', slug: 'beauty', icon: 'sparkles-outline', description: 'Makeup, piercing, and beauty treatments', order: 2 },
  { name: 'Nail Care', slug: 'nail-care', icon: 'color-palette-outline', description: 'Manicure, pedicure, and nail art', order: 3 },
  { name: 'Skin Care', slug: 'skin-care', icon: 'leaf-outline', description: 'Facials, cleanups, and skin treatments', order: 4 },
  { name: 'Spa & Massage', slug: 'spa-massage', icon: 'water-outline', description: 'Relaxation and therapeutic treatments', order: 5 },
];

// =====================
// UTILITY FUNCTIONS
// =====================

/**
 * Extract pincode from address
 */
function extractPincode(address) {
  const match = address.match(/\b(\d{6})\b/);
  return match ? match[1] : '533201';
}

/**
 * Extract area name from address
 */
function extractArea(address) {
  // Common area patterns in Amalapuram
  const areaPatterns = [
    { pattern: /clock tower/i, name: 'Clock Tower' },
    { pattern: /muslim street/i, name: 'Muslim Street' },
    { pattern: /mobarlipet/i, name: 'Mobarlipet' },
    { pattern: /km agraharam/i, name: 'KM Agraharam' },
    { pattern: /edarapalle/i, name: 'Edarapalle' },
    { pattern: /bypass road/i, name: 'Bypass Road' },
    { pattern: /bank street/i, name: 'Bank Street' },
    { pattern: /cinema road/i, name: 'Cinema Road' },
    { pattern: /main road/i, name: 'Main Road' },
    { pattern: /red bridge/i, name: 'Red Bridge' },
    { pattern: /government hospital/i, name: 'Government Hospital Road' },
    { pattern: /black bridge/i, name: 'Black Bridge' },
    { pattern: /gollagudem/i, name: 'Gollagudem' },
    { pattern: /bhaskar nagar/i, name: 'Bhaskar Nagar' },
    { pattern: /sri rama nagar/i, name: 'Sri Rama Nagar' },
    { pattern: /dudduvari agraharam/i, name: 'Dudduvari Agraharam' },
    { pattern: /bupai agraharam/i, name: 'Bupai Agraharam' },
    { pattern: /vanacharla/i, name: 'Vanacharla Vari Street' },
    { pattern: /muzaffar/i, name: 'Muzaffar Street' },
  ];

  for (const { pattern, name } of areaPatterns) {
    if (pattern.test(address)) {
      return name;
    }
  }

  // Default: extract first meaningful part
  const parts = address.split(',');
  if (parts.length > 1) {
    return parts[1].trim().substring(0, 50);
  }
  return 'Amalapuram Central';
}

/**
 * Get category for a service name
 */
function getCategoryForService(serviceName) {
  const lowerName = serviceName.toLowerCase();
  
  for (const [keyword, category] of Object.entries(SERVICE_CATEGORY_MAP)) {
    if (lowerName.includes(keyword)) {
      return category;
    }
  }
  
  return 'Hair Care'; // Default
}

/**
 * Get price info for a service
 */
function getPriceInfo(serviceName) {
  const lowerName = serviceName.toLowerCase();
  
  // Check for exact match first
  if (SERVICE_PRICES[lowerName]) {
    return SERVICE_PRICES[lowerName];
  }
  
  // Check for partial match
  for (const [key, value] of Object.entries(SERVICE_PRICES)) {
    if (lowerName.includes(key) || key.includes(lowerName)) {
      return value;
    }
  }
  
  // Default
  return { price: 200, duration: 30, audience: ['men', 'women'] };
}

/**
 * Generate random variation in coordinates for visual spread on map
 */
function getRandomCoordinates() {
  // Add small random offset (within ~500m)
  const latOffset = (Math.random() - 0.5) * 0.01;
  const lngOffset = (Math.random() - 0.5) * 0.01;
  
  return {
    longitude: AMALAPURAM_COORDS.longitude + lngOffset,
    latitude: AMALAPURAM_COORDS.latitude + latOffset,
  };
}

// =====================
// MAIN IMPORT FUNCTION
// =====================

async function importData() {
  console.log('\n🚀 Starting Salon Data Import...\n');
  
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Read and parse CSV
    if (!fs.existsSync(CSV_PATH)) {
      console.error(`❌ CSV file not found: ${CSV_PATH}`);
      process.exit(1);
    }

    const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    });
    console.log(`📊 Found ${records.length} records in CSV\n`);

    // =====================
    // STEP 1: Create City
    // =====================
    console.log('📍 Creating City...');
    let city = await City.findOne({ name: 'Amalapuram' });
    if (!city) {
      city = await City.create({
        name: 'Amalapuram',
        state: 'Andhra Pradesh',
        country: 'India',
        center: {
          type: 'Point',
          coordinates: [AMALAPURAM_COORDS.longitude, AMALAPURAM_COORDS.latitude],
        },
        isActive: true,
      });
      console.log('   ✅ Created city: Amalapuram');
    } else {
      console.log('   ℹ️  City already exists: Amalapuram');
    }

    // =====================
    // STEP 2: Create Service Categories
    // =====================
    console.log('\n📂 Creating Service Categories...');
    const categoryMap = new Map();
    
    for (const cat of SERVICE_CATEGORIES) {
      const category = await ServiceCategory.findOneAndUpdate(
        { slug: cat.slug },
        cat,
        { upsert: true, new: true }
      );
      categoryMap.set(cat.name, category);
      console.log(`   ✅ ${cat.name}`);
    }

    // =====================
    // STEP 3: Extract and Create Areas
    // =====================
    console.log('\n🏘️  Creating Areas...');
    const areaMap = new Map();
    
    for (const record of records) {
      if (record.Address) {
        const areaName = extractArea(record.Address);
        if (!areaMap.has(areaName)) {
          let area = await Area.findOne({ city: city._id, name: areaName });
          if (!area) {
            area = await Area.create({
              city: city._id,
              name: areaName,
              pincode: extractPincode(record.Address),
              center: {
                type: 'Point',
                coordinates: [AMALAPURAM_COORDS.longitude, AMALAPURAM_COORDS.latitude],
              },
              isActive: true,
            });
            console.log(`   ✅ ${areaName}`);
          }
          areaMap.set(areaName, area);
        }
      }
    }
    console.log(`   📊 Total areas: ${areaMap.size}`);

    // =====================
    // STEP 4: Import Salons
    // =====================
    console.log('\n💈 Importing Salons...');
    let imported = 0;
    let skipped = 0;
    let errors = 0;
    const serviceTypeMap = new Map();

    for (const record of records) {
      try {
        // Skip records without name
        if (!record.Name || record.Name.trim() === '') {
          skipped++;
          continue;
        }

        const salonName = record.Name.trim();

        // Check if salon already exists
        const existingSalon = await Salon.findOne({ 
          name: salonName,
          city: city._id 
        });
        
        if (existingSalon) {
          skipped++;
          continue;
        }

        // Parse data
        const areaName = extractArea(record.Address || 'Amalapuram');
        const area = areaMap.get(areaName) || Array.from(areaMap.values())[0];
        
        // Parse rating
        const rating = parseFloat(record.Rating) || 0;
        
        // Parse review count (e.g., "16Ratings" -> 16)
        const reviewCount = parseInt(
          (record.Ratings_Count || '').replace(/[^0-9]/g, '')
        ) || 0;
        
        // Parse phone numbers
        const phones = (record.Phone || '')
          .split(',')
          .map(p => p.trim())
          .filter(p => p.length > 0);
        
        // Parse images
        const imageUrls = (record.Photo_URLs || '')
          .split(';')
          .map(url => url.trim())
          .filter(url => url.length > 10);

        // Get random coordinates
        const coords = getRandomCoordinates();

        // Create salon
        const salon = await Salon.create({
          name: salonName,
          address: record.Address || 'Amalapuram, Andhra Pradesh',
          area: area._id,
          city: city._id,
          phone: phones[0] || '',
          mobile: phones[1] || phones[0] || '',
          email: '',
          website: record.URL || '',
          averageRating: rating,
          rating: rating,
          totalReviews: reviewCount,
          coverImage: imageUrls[0] || '',
          thumbnailUrl: imageUrls[0] || '',
          galleryImages: imageUrls.slice(0, 10).map((url, index) => ({
            image: url,
            order: index,
          })),
          location: {
            type: 'Point',
            coordinates: [coords.longitude, coords.latitude],
          },
          mode: 'toSalon',
          audience: ['men', 'women'],
          features: {
            hasParking: Math.random() > 0.5,
            hasWifi: Math.random() > 0.7,
            hasAc: true,
            acceptsCards: Math.random() > 0.3,
            homeServiceAvailable: false,
          },
          priceLevel: Math.floor(Math.random() * 3) + 1, // 1-3
          popularityScore: reviewCount * 2 + rating * 10,
          isActive: true,
          isVerified: rating >= 4.5,
        });

        // =====================
        // STEP 5: Create Services for Salon
        // =====================
        const serviceNames = (record.Services || '')
          .split(',')
          .map(s => s.trim())
          .filter(s => s.length > 0 && s.toLowerCase() !== 'not listed');

        for (const serviceName of serviceNames) {
          // Get category
          const categoryName = getCategoryForService(serviceName);
          const category = categoryMap.get(categoryName);
          
          if (!category) continue;

          // Find or create service type
          const serviceTypeKey = `${categoryName}:${serviceName}`;
          let serviceType = serviceTypeMap.get(serviceTypeKey);
          
          if (!serviceType) {
            serviceType = await ServiceType.findOne({ 
              name: serviceName,
              category: category._id 
            });
            
            if (!serviceType) {
              const slug = serviceName
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '')
                .substring(0, 50);
              
              serviceType = await ServiceType.create({
                category: category._id,
                name: serviceName,
                slug: slug,
                isActive: true,
              });
            }
            
            serviceTypeMap.set(serviceTypeKey, serviceType);
          }

          // Get price info
          const priceInfo = getPriceInfo(serviceName);

          // Create service
          await Service.create({
            salon: salon._id,
            serviceType: serviceType._id,
            name: serviceName,
            price: priceInfo.price,
            basePrice: priceInfo.price,
            durationMinutes: priceInfo.duration,
            mode: 'toSalon',
            audience: priceInfo.audience || ['men', 'women'],
            isActive: true,
            isPopular: Math.random() > 0.7,
          });
        }

        imported++;
        console.log(`   ✅ ${salonName} (${serviceNames.length} services)`);

      } catch (error) {
        errors++;
        console.error(`   ❌ Error importing "${record.Name}": ${error.message}`);
      }
    }

    // =====================
    // SUMMARY
    // =====================
    console.log('\n' + '='.repeat(50));
    console.log('📊 IMPORT SUMMARY');
    console.log('='.repeat(50));
    console.log(`   ✅ Imported: ${imported} salons`);
    console.log(`   ⏭️  Skipped: ${skipped} (empty name or duplicate)`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📂 Categories: ${categoryMap.size}`);
    console.log(`   🏘️  Areas: ${areaMap.size}`);
    console.log(`   🔧 Service Types: ${serviceTypeMap.size}`);
    console.log('='.repeat(50));
    console.log('\n✅ Import completed successfully!\n');

  } catch (error) {
    console.error('\n❌ Import failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run import
importData();

