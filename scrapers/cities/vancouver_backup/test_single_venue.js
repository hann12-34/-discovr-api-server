/**
 * Test a single venue scraper
 * For quick testing of specific high-priority venues
 */

const path = require('path');

// Configure which venue to test
const VENUE = process.argv[2] || 'fortuneSoundClub.js';

async function main() {
  console.log(`🔍 Testing scraper: ${VENUE}`);
  
  try {
    // Try to import the scraper
    const scraperPath = path.join(__dirname, VENUE);
    const scraper = require(scraperPath);
    
    console.log(`✅ Successfully imported ${VENUE}`);
    console.log(`Scraper name: ${scraper.name || 'unknown'}`);
    
    // Check for scrape method
    if (typeof scraper.scrape !== 'function') {
      console.log(`❌ ${VENUE} does not have a scrape method`);
      return;
    }
    
    console.log(`✅ Found scrape method in ${VENUE}`);
    console.log(`🔄 Running scraper...`);
    
    // Run the scraper with a timeout
    const startTime = Date.now();
    const events = await Promise.race([
      scraper.scrape(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timed out after 60 seconds')), 60000))
    ]);
    
    const duration = Date.now() - startTime;
    
    console.log(`✅ Scraper ran successfully in ${duration/1000}s`);
    console.log(`🎟️ Found ${events.length} events`);
    
    if (events.length > 0) {
      // Print sample events (first 2)
      console.log('\n📋 Sample events:');
      events.slice(0, 2).forEach((event, idx) => {
        console.log(`\nEvent ${idx + 1}:`);
        console.log(`  Title: ${event.title || 'No title'}`);
        console.log(`  Date: ${event.startDate || event.date || 'No date'}`);
        console.log(`  Venue: ${event.venue || event.location || 'No venue'}`);
        if (event.url) console.log(`  URL: ${event.url}`);
        if (event.image) console.log(`  Has image: ${!!event.image}`);
      });
    } else {
      console.log('⚠️ No events found - is this expected?');
    }
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }
}

main().catch(console.error);
