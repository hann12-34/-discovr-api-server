/**
 * Test Vancouver Scrapers - Civic Theatres and Roxy
 * Tests both scrapers to ensure they're working with correct URLs
 */

const path = require('path');

async function testVancouverScrapers() {
  console.log('🧪 Testing Vancouver Scrapers...\n');
  
  try {
    // Test Vancouver Civic Theatres
    console.log('1. Testing Vancouver Civic Theatres...');
    const civicScraper = require('./scrapers/cities/vancouver/vancouverCivicTheatres.js');
    
    console.log(`   URL: ${civicScraper.url}`);
    console.log(`   Venue: ${civicScraper.venue.name}`);
    
    const civicEvents = await civicScraper.scrape();
    console.log(`   ✅ Found ${civicEvents.length} events from Civic Theatres`);
    
    if (civicEvents.length > 0) {
      console.log(`   Sample event: ${civicEvents[0].title}`);
    }
    
  } catch (error) {
    console.log(`   ❌ Civic Theatres error: ${error.message}`);
  }
  
  console.log('');
  
  try {
    // Test Roxy Events
    console.log('2. Testing Roxy Events...');
    const roxyScraper = require('./scrapers/cities/vancouver/roxyEvents.js');
    
    console.log(`   URL: ${roxyScraper.url}`);
    console.log(`   Venue: ${roxyScraper.venue.name}`);
    
    const roxyEvents = await roxyScraper.scrape();
    console.log(`   ✅ Found ${roxyEvents.length} events from Roxy`);
    
    if (roxyEvents.length > 0) {
      console.log(`   Sample event: ${roxyEvents[0].title}`);
    }
    
  } catch (error) {
    console.log(`   ❌ Roxy error: ${error.message}`);
  }
  
  console.log('\n🏁 Vancouver scrapers test complete!');
}

// Run the test
testVancouverScrapers().catch(console.error);
