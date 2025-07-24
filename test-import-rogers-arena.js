/**
 * Test importing Rogers Arena events through the main import system
 */
const fs = require('fs');
const path = require('path');
require('dotenv').config();

console.log('Testing Rogers Arena scraper with the main import system...');

// Import the Rogers Arena scraper adapter
const rogersArenaScraper = require('./scrapers/cities/vancouver/rogersArenaScraperAdapter');

// Function to run scraper and process events
async function runScraperTest() {
  try {
    console.time('Scraping completed in');
    
    // Run the scraper
    console.log('Running Rogers Arena scraper...');
    const events = await rogersArenaScraper.scrape();
    
    console.timeEnd('Scraping completed in');
    
    // Output results
    console.log(`Found ${events.length} events from Rogers Arena`);
    
    if (events.length > 0) {
      console.log('\nSample event:');
      console.log(JSON.stringify(events[0], null, 2));
      
      console.log('\nAll event titles and dates:');
      events.forEach(event => {
        const date = event.startDate 
          ? new Date(event.startDate).toLocaleDateString() 
          : 'No date';
        console.log(`- ${event.title} (${date})`);
      });
      
      // Save events to a JSON file for inspection
      const outputPath = path.join(__dirname, 'rogers-arena-events.json');
      fs.writeFileSync(outputPath, JSON.stringify(events, null, 2));
      console.log(`\nSaved ${events.length} events to ${outputPath}`);
    }
  } catch (error) {
    console.error('Error running scraper test:', error);
  }
}

// Run the test
runScraperTest();
