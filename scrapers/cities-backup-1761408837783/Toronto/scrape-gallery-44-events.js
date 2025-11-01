const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeGallery44Events(city) {
  console.log(`🎨 Scraping Gallery 44 events for ${city}...`);
  
  try {
    const url = 'https://gallery44.org/events';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // Look for photography exhibitions and artist events
    $('.event, [class*="event"], .exhibition, .photography, .artist').each((index, element) => {
      const $event = $(element);
      
      const title = $event.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      
      if (title && title.length > 3 && title.length < 200) {
        const dateText = $event.find('.date, [class*="date"], time').text().trim();
        const description = $event.find('p, .description, [class*="desc"]').text().trim();
        
        events.push({
          title: title,
          date: dateText || 'Check gallery',
          venue: { name: 'Gallery 44', address: 'Toronto', city: 'Toronto' },
          location: 'Toronto, ON',
          description: description && description.length > 20 ? description : `Photography exhibition or artist event at Gallery 44`,
          url: url,
          source: 'Gallery 44 Website'
        });
      }
    });


    console.log(`✅ Scraped ${events.length} events from Gallery 44`);
    return filterEvents(events);

  } catch (error) {
    console.log(`❌ Error scraping Gallery 44 events: ${error.message}`);
    return [];
  }
}

module.exports = scrapeGallery44Events;
