/**
 * STANDARDIZED DATABASE CONFIGURATION
 * Single source of truth for all database connections
 */

// ✅ PRODUCTION DATABASE - Use this for ALL imports and scrapers
const PRODUCTION_DATABASE_URI = 'mongodb+srv://discovr123:discovr1234@discovr.vzlnmqb.mongodb.net/?retryWrites=true&w=majority&appName=Discovr';

// 🗄️ Database configuration object
const DatabaseConfig = {
  // Primary production database (use this everywhere)
  PRODUCTION: PRODUCTION_DATABASE_URI,
  
  // Fallback for development (local only)
  LOCAL_DEV: 'mongodb://localhost:27017/discovr',
  
  // Get the correct URI based on environment
  getURI: () => {
    return process.env.MONGODB_URI || PRODUCTION_DATABASE_URI;
  },
  
  // Connection options
  OPTIONS: {
    retryWrites: true,
    w: 'majority',
    appName: 'Discovr'
  }
};

// 🔧 FIXES NEEDED FOR EXISTING FILES:
console.log('🔧 DATABASE STANDARDIZATION REQUIRED');
console.log('===================================\n');

console.log('📝 FILES THAT NEED MANUAL UPDATES:');
console.log('1. scrapers/fortune-sound/import-fortune-events.js');
console.log('   CHANGE: mongodb+srv://materaccount:materaccount123@...');
console.log('   TO:     ' + PRODUCTION_DATABASE_URI);
console.log('');

console.log('2. import-toronto-events.js');
console.log('   CHANGE: mongodb+srv://discovrapp:FZNwIj6DXXNJjhDU@cluster0.yfnbe.mongodb.net/test...');
console.log('   TO:     ' + PRODUCTION_DATABASE_URI);
console.log('');

console.log('3. Set Environment Variable:');
console.log('   export MONGODB_URI="' + PRODUCTION_DATABASE_URI + '"');
console.log('');

console.log('✅ ALREADY CORRECT (no changes needed):');
console.log('• working-vancouver-import.js');
console.log('• All recent Toronto import files');
console.log('• Most production import scripts');
console.log('');

console.log('🎯 RESULT: All scrapers will use the same database');
console.log('📊 Expected: Unified event counts across all cities');

module.exports = DatabaseConfig;
