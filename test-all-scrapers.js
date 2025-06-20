/**
 * Test script to verify all scrapers are properly registered in the main scraping system
 */
const scraperSystem = require('./scrapers');

async function testAllScrapers() {
  try {
    // Get list of all registered scrapers
    const registeredScrapers = scraperSystem.scrapers.map(scraper => scraper.name);
    
    console.log(`Total registered scrapers: ${registeredScrapers.length}`);
    console.log('==================================================');
    console.log('List of all registered scrapers:');
    
    // Print all registered scrapers
    registeredScrapers.forEach((name, index) => {
      console.log(`${index + 1}. ${name}`);
    });
    
    console.log('==================================================');
    console.log('Venue scrapers:', registeredScrapers.filter(name => !name.includes('Events') && !name.includes('Scraper')).length);
    console.log('Event scrapers:', registeredScrapers.filter(name => name.includes('Events') || name.includes('Scraper')).length);
    
    // Get the scrapers array directly
    const scrapersArray = scraperSystem.scrapers;
    
    // Check if all scrapers have the necessary functions
    console.log('==================================================');
    console.log('Checking scraper interface...');
    
    let validScrapers = 0;
    let invalidScrapers = [];
    
    scrapersArray.forEach(scraper => {
      if (typeof scraper.scrape === 'function' && scraper.name && scraper.urls) {
        validScrapers++;
      } else {
        invalidScrapers.push({
          name: scraper.name || 'Unknown',
          hasScrapeFn: typeof scraper.scrape === 'function',
          hasName: !!scraper.name,
          hasUrls: !!scraper.urls
        });
      }
    });
    
    console.log(`Valid scrapers: ${validScrapers} of ${scrapersArray.length}`);
    if (invalidScrapers.length > 0) {
      console.log('Invalid scrapers:');
      invalidScrapers.forEach(scraper => {
        console.log(`- ${scraper.name || 'Unknown'}: ` + 
                    `scrape function: ${scraper.hasScrapeFn}, ` +
                    `name: ${scraper.hasName}, ` +
                    `urls: ${scraper.hasUrls}`);
      });
    }
  } catch (error) {
    console.error("Error testing scrapers:", error);
  }
}

// Run the test
testAllScrapers();
