/**
 * TEST: New Venue Data (Bypass Database)
 * 
 * Tests scrapers to see the actual NEW venue data they would create
 * by bypassing duplicate detection and database storage
 */

const fs = require('fs');
const path = require('path');

const TORONTO_DIR = '/Users/seongwoohan/CascadeProjects/discovr-api-server/scrapers/cities/Toronto';

// Sample of key venue scrapers to test
const TEST_SCRAPERS = [
  'scrape-rom-events-clean.js',      // ROM  
  'scrape-cn-tower-events-clean.js', // CN Tower
  'scrape-moca-events.js'            // MOCA
];

async function testNewVenueData() {
  console.log('🎯 TESTING NEW VENUE DATA (BYPASS DATABASE)');
  console.log('='.repeat(60));
  
  for (const scraperFile of TEST_SCRAPERS) {
    const scraperPath = path.join(TORONTO_DIR, scraperFile);
    
    if (!fs.existsSync(scraperPath)) {
      console.log(`⚠️ ${scraperFile}: File not found, skipping`);
      continue;
    }
    
    try {
      console.log(`\n🔍 Testing ${scraperFile}:`);
      
      // Import and run the scraper
      delete require.cache[require.resolve(scraperPath)];
      const scraper = require(scraperPath);
      
      if (typeof scraper.scrapeEvents === 'function') {
        // Mock MongoDB connection to prevent actual database operations
        const originalMongoClient = require('mongodb').MongoClient;
        require('mongodb').MongoClient = class MockMongoClient {
          constructor() {}
          connect() { return Promise.resolve(); }
          db() { 
            return {
              collection() {
                return {
                  findOne: () => Promise.resolve(null), // Always return null = no duplicates
                  insertOne: (doc) => {
                    // Instead of inserting, show us the venue data!
                    console.log(`📋 NEW EVENT WOULD BE CREATED:`);
                    console.log(`   📍 Venue: ${doc.venue || 'Unknown'}`);
                    console.log(`   🏢 Title: ${doc.title || 'Unknown'}`);
                    console.log(`   🔗 Source: ${doc.source || 'Unknown'}`);
                    console.log(`   📅 Date: ${doc.startDate || 'Unknown'}`);
                    return Promise.resolve({ insertedId: 'mock-id' });
                  }
                }
              }
            }
          }
          close() { return Promise.resolve(); }
        };
        
        const events = await scraper.scrapeEvents('Toronto');
        
        // Restore original MongoDB client
        require('mongodb').MongoClient = originalMongoClient;
        
        console.log(`✅ Scraper completed - ${events ? 'events processed' : 'no events'}`);
        
      } else {
        console.log(`❌ Scraper function not found or invalid`);
      }
      
    } catch (error) {
      console.log(`❌ Error testing ${scraperFile}: ${error.message}`);
    }
  }
  
  console.log('\n🏁 NEW VENUE DATA TEST COMPLETE');
  console.log('✅ If you see proper venue names above, the fixes are working!');
  console.log('❌ If you see "Unknown", there are still issues to fix.');
}

// Run the test
testNewVenueData().catch(console.error);
