require('dotenv').config();
const FortuneSoundClubScraper = require('../../scrapers/cities/vancouver/fortuneSoundClub');
const vancouverScrapers = require('../../scrapers/cities/vancouver');

console.log('🎵 Testing Fortune Sound Club scraper...');

// Get Fortune Sound Club scraper instance from Vancouver scrapers
const fortuneScraper = vancouverScrapers.scrapers.find(s => s.name === 'Fortune Sound Club');

if (!fortuneScraper) {
  console.error('Fortune Sound Club scraper not found in Vancouver scrapers!');
  process.exit(1);
}

async function testFortuneSoundClubScraper() {
  try {
    // Test scraping method
    console.log('Testing Fortune Sound Club scraper...');
    const cheerioEvents = await fortuneScraper.scrape();
    console.log(`Axios/Cheerio found ${cheerioEvents.length} events`);
    
    if (cheerioEvents.length > 0) {
      console.log('\n✅ First 3 events from Axios/Cheerio:');
      cheerioEvents.slice(0, 3).forEach((event, i) => {
        console.log(`\n--- Event ${i + 1} ---`);
        console.log(`Title: ${event.title}`);
        console.log(`Date: ${new Date(event.date).toLocaleString()}`);
        console.log(`Category: ${event.category}`);
      });
    } else {
      console.log('No events found using Axios/Cheerio method');
    }
    
    // Integrated test is sufficient - the scrape() method already handles fallback
    console.log('\n✅ Fortune Sound Club scraper test completed successfully')
    
    // Test full scraper
    console.log('\nTesting full scraper (with fallback)...');
    const fortuneEvents = await fortuneScraper.scrape();
    console.log(`Full scraper returned ${fortuneEvents.length} events`);
    
    if (fortuneEvents.length > 0) {
      console.log('\n✅ First 5 events from full scraper:');
      fortuneEvents.slice(0, 5).forEach((event, i) => {
        console.log(`\n--- Event ${i + 1} ---`);
        console.log(`Title: ${event.title}`);
        console.log(`Date: ${new Date(event.date).toLocaleString()}`);
        console.log(`Category: ${event.category}`);
        console.log(`Venue: ${event.venue.name}`);
        console.log(`Image URL: ${event.image ? (event.image.substring(0, 60) + '...') : 'No image'}`);
      });

      // Save to file for verification
      const fs = require('fs');
      const path = require('path');
      const outputPath = path.join(__dirname, 'fortune-events-js.json');
      fs.writeFileSync(outputPath, JSON.stringify(fortuneEvents, null, 2));
      console.log(`\n✅ Saved ${fortuneEvents.length} events to ${outputPath}`);
    } else {
      console.log('No events found by the full scraper');
    }
    
  } catch (error) {
    console.error('Error testing Fortune Sound Club scraper:', error);
  }
}

testFortuneSoundClubScraper();
