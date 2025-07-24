const axios = require('axios');
const cheerio = require('cheerio');

async function testScienceWorldScraper() {
  console.log("Testing Science World scraper...");
  const url = "https://www.scienceworld.ca/events/";
  
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 30000
    });
    
    console.log("Response status:", response.status);
    
    const $ = cheerio.load(response.data);
    
    // Log the HTML structure to understand what selectors to use
    console.log("Page title:", $('title').text());
    
    // Check if there are any events with various selectors
    const eventSelectors = [
      '.event', '.event-card', '.event-item', 'article',
      '.events-list', '.event-listing', '.swiper-slide',
      '.programmes-item', '.programme-card'
    ];
    
    eventSelectors.forEach(selector => {
      const count = $(selector).length;
      console.log(`Selector "${selector}" found ${count} elements`);
      
      if (count > 0) {
        const firstElement = $(selector).first();
        console.log(`First element with "${selector}" has text:`, firstElement.text().substring(0, 100) + '...');
        console.log(`HTML structure:`, firstElement.html().substring(0, 150) + '...');
      }
    });
  } catch (error) {
    console.error("Error:", error.message);
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Headers:", error.response.headers);
    }
  }
}

testScienceWorldScraper();
