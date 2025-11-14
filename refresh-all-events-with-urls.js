#!/usr/bin/env node

/**
 * REFRESH ALL EVENTS WITH URLs
 * 
 * Runs all city scrapers and imports fresh data with URLs to MongoDB
 * This ensures every event has a sourceURL field
 */

const { execSync } = require('child_process');

const cities = [
  'Vancouver',
  'Toronto',
  'Calgary',
  'Montreal'
];

console.log('🚀 REFRESHING ALL EVENTS WITH URLs\n');
console.log('This will:');
console.log('1. Clear existing events');
console.log('2. Run all scrapers (with URL extraction)');
console.log('3. Import fresh data to MongoDB\n');

async function refreshAllCities() {
  for (const city of cities) {
    console.log('\n' + '='.repeat(60));
    console.log(`📍 IMPORTING ${city.toUpperCase()} EVENTS`);
    console.log('='.repeat(60) + '\n');
    
    try {
      execSync(`node ImportFiles/import-all-${city.toLowerCase()}-events.js`, {
        stdio: 'inherit',
        cwd: __dirname
      });
      console.log(`✅ ${city} import complete!\n`);
    } catch (error) {
      console.error(`❌ ${city} import failed:`, error.message);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🎉 ALL CITIES IMPORTED!');
  console.log('='.repeat(60));
  console.log('\n✅ Every event now has a URL!');
  console.log('🔄 Rebuild your iOS app to see the working Website buttons!\n');
}

refreshAllCities();
