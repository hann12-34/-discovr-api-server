require('dotenv').config();
const fortuneBridge = require('./scrapers/cities/vancouver/fortuneSoundClubBridge');
const vancouverScrapers = require('./scrapers/cities/vancouver');

console.log('🎵 Testing Fortune Sound Club Bridge...');

// Get Fortune Sound Club scraper instance from Vancouver scrapers
const fortuneScraper = vancouverScrapers.scrapers.find(s => s.name === 'Fortune Sound Club');

if (!fortuneScraper) {
  console.error('Fortune Sound Club scraper not found in Vancouver scrapers!');
  process.exit(1);
}

async function testFortuneBridge() {
  try {
    // Test the scrape method which runs the Python scraper and reads the output
    console.log('\nTesting Fortune Sound Club Bridge scraper...');
    const events = await fortuneScraper.scrape();
    console.log(`Bridge returned ${events.length} events`);
    
    if (events.length > 0) {
      console.log('\n✅ First 5 events from Fortune Sound Club:');
      events.slice(0, 5).forEach((event, i) => {
        console.log(`\n--- Event ${i + 1} ---`);
        console.log(`Title: ${event.title}`);
        console.log(`Date: ${new Date(event.startDate).toLocaleString()}`);
        console.log(`Category: ${event.category}`);
        console.log(`Venue: ${event.venue.name}`);
        console.log(`Image: ${event.image ? 'Yes' : 'No'}`);
      });

      // Save to file for verification
      const fs = require('fs');
      const path = require('path');
      const outputPath = path.join(__dirname, 'fortune-events-bridge.json');
      fs.writeFileSync(outputPath, JSON.stringify(events, null, 2));
      console.log(`\n✅ Saved ${events.length} events to ${outputPath}`);
      
      // Now test the full Vancouver scrapers cycle
      console.log('\nTesting full Vancouver scrapers cycle...');
      const allEvents = await vancouverScrapers.scrape();
      
      // Check if Fortune events are included
      const fortuneEvents = allEvents.filter(e => 
        e.venue && e.venue.name === 'Fortune Sound Club'
      );
      
      console.log(`Vancouver scrapers returned ${allEvents.length} total events`);
      console.log(`Found ${fortuneEvents.length} Fortune Sound Club events in the mix`);
      
      if (fortuneEvents.length > 0) {
        console.log('\n✅ Integration successful! Fortune Sound Club events are now part of the main Discovr API pipeline.');
      } else {
        console.log('\n❌ Integration issue: Fortune Sound Club events are not appearing in the Vancouver scrapers output.');
      }
    } else {
      console.log('No events found from Fortune Sound Club Bridge');
    }
    
  } catch (error) {
    console.error('Error testing Fortune Sound Club Bridge:', error);
  }
}

testFortuneBridge();
