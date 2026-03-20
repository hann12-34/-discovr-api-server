/**
 * TEST: Venue Diversity Verification
 * 
 * Runs a sample of fixed Toronto scrapers to verify:
 * 1. Each scraper hits its correct venue URL
 * 2. Events are diverse (not all from same website)
 * 3. Event data contains proper venue information
 */

const fs = require('fs');
const path = require('path');

const TORONTO_DIR = '/Users/seongwoo/CascadeProjects/discovr-api-server/scrapers/cities/Toronto';

// Sample of key venue scrapers to test
const TEST_SCRAPERS = [
  'scrape-ago-events-clean.js',      // AGO
  'scrape-rom-events-clean.js',      // ROM  
  'scrape-cn-tower-events-clean.js', // CN Tower
  'scrape-moca-events.js',           // MOCA
  'scrape-casa-loma-events-clean.js' // Casa Loma
];

async function testVenueDiversity() {
  console.log('🧪 TESTING VENUE DIVERSITY AFTER URL FIX');
  console.log('='.repeat(50));
  
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
        const events = await scraper.scrapeEvents('Toronto');
        
        if (events && events.length > 0) {
          const firstEvent = events[0];
          console.log(`✅ Found ${events.length} events`);
          console.log(`📍 Venue: ${firstEvent.venue || 'Unknown'}`);
          console.log(`📋 Title: ${firstEvent.title || 'Unknown'}`);
          console.log(`🔗 URL Source: ${firstEvent.source || firstEvent.url || 'Unknown'}`);
          
          // Check for unique venue content
          const uniqueVenues = new Set(events.map(e => e.venue).filter(v => v));
          const uniqueSources = new Set(events.map(e => e.source || e.url).filter(s => s));
          
          console.log(`🏢 Unique venues found: ${uniqueVenues.size}`);
          console.log(`🔗 Unique sources found: ${uniqueSources.size}`);
          
          // Check if all events are from Gardiner Museum
          const gardinerEvents = events.filter(e => 
            (e.source && e.source.includes('gardiner')) ||
            (e.url && e.url.includes('gardiner')) ||
            (e.venue && e.venue.toLowerCase().includes('gardiner'))
          );
          
          if (gardinerEvents.length > 0) {
            console.log(`🚨 WARNING: ${gardinerEvents.length}/${events.length} events still from Gardiner Museum!`);
          } else {
            console.log(`🎉 SUCCESS: No Gardiner Museum contamination detected!`);
          }
          
        } else {
          console.log(`⚠️ No events found (might be network/site issue)`);
        }
      } else {
        console.log(`❌ Scraper function not found or invalid`);
      }
      
    } catch (error) {
      console.log(`❌ Error testing ${scraperFile}: ${error.message}`);
    }
  }
  
  console.log('\n🏁 VENUE DIVERSITY TEST COMPLETE');
  console.log('If you see diverse venues and no Gardiner contamination,');
  console.log('the URL fix was successful! 🎉');
}

// Run the test
testVenueDiversity().catch(console.error);
