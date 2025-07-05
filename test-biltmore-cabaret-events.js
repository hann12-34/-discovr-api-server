/**
 * Test script for Biltmore Cabaret Events scraper
 * 
 * This script runs the Biltmore Cabaret Events scraper and outputs the results
 */

const BiltmoreCabaretEvents = require('./scrapers/cities/vancouver/biltmoreCabaretEvents');
const fs = require('fs');
const path = require('path');

// Function to format dates consistently
function formatDate(date) {
  if (!date) return 'N/A';
  return date.toLocaleDateString('en-US', { 
    weekday: 'short',
    month: 'short', 
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

// Create output directory if it doesn't exist
const outputDir = path.join(__dirname, 'test-output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

async function testScraper() {
  console.log(`🔍 Testing scraper: ${BiltmoreCabaretEvents.name}`);
  console.log(`Source URL: ${BiltmoreCabaretEvents.url}`);
  console.log('--------------------------------------------');
  
  console.time('Scraping time');
  const startTime = new Date();
  
  try {
    // Run the scraper
    const events = await BiltmoreCabaretEvents.scrape();
    
    const endTime = new Date();
    const duration = (endTime - startTime) / 1000;
    console.timeEnd('Scraping time');
    
    // Check if any events were found
    if (events.length === 0) {
      console.log('❌ No events found!');
    } else {
      console.log(`✅ Found ${events.length} events!`);
      
      // Check for fallback events
      const fallbackEvents = events.filter(event => event.isFallback);
      if (fallbackEvents.length > 0) {
        console.log(`⚠️ Warning: ${fallbackEvents.length} fallback events detected!`);
      } else {
        console.log('✅ No fallback events detected.');
      }
      
      // Log each event summary
      console.log('\nEvent Summaries:');
      events.forEach((event, index) => {
        console.log(`\n[${index + 1}] ${event.title}`);
        console.log(`   Date: ${formatDate(event.startDate)} - ${formatDate(event.endDate)}`);
        console.log(`   URL: ${event.sourceUrl}`);
        console.log(`   Categories: ${event.categories.join(', ')}`);
        console.log(`   Has image: ${event.imageUrl ? 'Yes' : 'No'}`);
        if (event.price) console.log(`   Price: ${event.price}`);
      });
      
      // Save full JSON to file for detailed inspection
      const outputFile = path.join(outputDir, 'biltmore-cabaret-events.json');
      fs.writeFileSync(outputFile, JSON.stringify(events, null, 2));
      console.log(`\nSaved full events data to: ${outputFile}`);
      
      // Provide sample for quick view
      console.log('\nSample event (first event):');
      console.log(JSON.stringify(events[0], null, 2));
    }
  } catch (error) {
    console.error(`❌ Error testing scraper: ${error.message}`);
    console.error(error);
  }
}

// Run the test
testScraper().catch(console.error);
