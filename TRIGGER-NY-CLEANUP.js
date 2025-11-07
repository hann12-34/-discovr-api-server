#!/usr/bin/env node

/**
 * Trigger New York database cleanup and re-scrape
 * This will:
 * 1. Delete all old NY events from MongoDB
 * 2. Run scrapers with new clean filters
 * 3. Save only clean events to database
 */

const https = require('https');

const API_URL = 'https://discovr-proxy-server.onrender.com/api/admin/rescrape-city/New%20York';

console.log('🧹 Triggering New York database cleanup...\n');
console.log(`POST ${API_URL}\n`);

const options = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req = https.request(API_URL, options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response Status:', res.statusCode);
    console.log('Response Body:\n');
    
    try {
      const json = JSON.parse(data);
      console.log(JSON.stringify(json, null, 2));
      
      if (json.success) {
        console.log('\n✅ SUCCESS!');
        console.log(`   - Deleted: ${json.deleted} old events`);
        console.log(`   - Scraped: ${json.scraped} clean events`);
        console.log(`   - Saved: ${json.saved} to database`);
        console.log('\n🎉 New York database is now CLEAN!');
        console.log('   Force quit and restart your iOS app to see changes.\n');
      } else {
        console.log('\n❌ FAILED!');
        console.log(`   Error: ${json.message}\n`);
      }
    } catch (err) {
      console.log(data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request failed:', error.message);
});

req.end();
