/**
 * Test script for Vancouver Folk Music Festival Events scraper
 * 
 * This script runs the Folk Festival Events scraper and outputs the results
 */

const FolkFestEvents = require('./folkFestEvents');
const fs = require('fs');
const path = require('path');

// Add debug logging
console.log(`Testing test-folk-fest-events.js...`);


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
  console.log(`🔍 Testing scraper: ${FolkFestEvents.name}`);
  console.log(`Source URL: ${FolkFestEvents.url}`);
  console.log('--------------------------------------------');
  
  console.time('Scraping time');
  const startTime = new Date();
  
  try {
    // Run the scraper
    const events = await FolkFestEvents.scrape();
    
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
      });
      
      // Save full JSON to file for detailed inspection
      const outputFile = path.join(outputDir, 'folk-fest-events.json');
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
try {
  testScraper().catch(console.error);
  console.log('Test completed successfully');
} catch (err) {
  console.error('Test error:', err);
  process.exit(1);
}
