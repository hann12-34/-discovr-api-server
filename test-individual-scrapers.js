/**
 * Test individual scrapers to verify they actually scrape events
 */

const path = require('path');

// List of scrapers user wants verified
const scrapersToTest = [
  'junctionPublicMarket.js',
  'khatsahlanoEvents.js', 
  'kitsilanoShowboat.js',
  'rickshawTheatreEvents.js',
  'roxyEvents.js',
  'redRoom.js',
  'redRoomEvents.js',
  'levelsNightclub.js',
  'fortuneSoundClub.js',
  'orpheumTheatre.js',
  'orpheumTheatreEvents.js'
];

async function testScraperExecution(scraperName) {
  console.log(`\n🔍 Testing: ${scraperName}`);
  console.log('=' .repeat(50));
  
  const scraperPath = path.join(__dirname, 'scrapers', 'cities', 'vancouver', scraperName);
  
  try {
    // Try to require the scraper
    const ScraperClass = require(scraperPath);
    console.log(`✅ Successfully required`);
    
    // Determine scraper type and instantiate
    let scraper;
    let scrapeFunction;
    
    if (typeof ScraperClass === 'function' && ScraperClass.prototype && typeof ScraperClass.prototype.scrape === 'function') {
      // Class-based scraper
      scraper = new ScraperClass();
      scrapeFunction = async () => await scraper.scrape();
      console.log(`📋 Type: Class-based scraper`);
      console.log(`📋 Venue: ${scraper.name || 'Unknown'}`);
    } else if (typeof ScraperClass === 'function' && !ScraperClass.prototype) {
      // Function-based scraper
      scrapeFunction = ScraperClass;
      console.log(`📋 Type: Function-based scraper`);
    } else if (typeof ScraperClass === 'object' && typeof ScraperClass.scrape === 'function') {
      // Object with scrape method
      scrapeFunction = async () => await ScraperClass.scrape();
      console.log(`📋 Type: Object with scrape method`);
    } else if (typeof ScraperClass === 'object' && typeof ScraperClass.scrapeEvents === 'function') {
      // Festival scraper
      scrapeFunction = async () => await ScraperClass.scrapeEvents();
      console.log(`📋 Type: Festival scraper with scrapeEvents`);
    } else {
      throw new Error(`Cannot determine scraper type - Type: ${typeof ScraperClass}, Has prototype: ${!!ScraperClass.prototype}`);
    }
    
    // Test actual scraping
    console.log(`🚀 Testing actual scraping...`);
    const startTime = Date.now();
    
    const events = await scrapeFunction();
    
    const duration = (Date.now() - startTime) / 1000;
    
    // Analyze results
    if (Array.isArray(events)) {
      console.log(`✅ Scraping successful!`);
      console.log(`📊 Events found: ${events.length}`);
      console.log(`⏱️  Duration: ${duration.toFixed(2)} seconds`);
      
      if (events.length > 0) {
        console.log(`📋 Sample event titles:`);
        events.slice(0, 3).forEach((event, i) => {
          console.log(`   ${i + 1}. ${event.title || event.name || 'Untitled'}`);
        });
      } else {
        console.log(`⚠️  No events found - might need scraper improvement`);
      }
    } else {
      console.log(`❌ Invalid return value: ${typeof events} (expected array)`);
    }
    
  } catch (error) {
    console.log(`❌ Error testing scraper: ${error.message}`);
    if (error.stack) {
      console.log(`Stack (first 5 lines):`);
      error.stack.split('\n').slice(0, 5).forEach(line => console.log(`   ${line}`));
    }
  }
}

async function runAllTests() {
  console.log('🎯 Testing Individual Scrapers for Event Extraction');
  console.log('=' .repeat(60));
  
  for (const scraperName of scrapersToTest) {
    await testScraperExecution(scraperName);
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n🎉 All scraper tests complete!');
}

// Run the tests
runAllTests().catch(console.error);
