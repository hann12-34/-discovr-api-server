const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeFairmontRoyalYorkEvents(city) {
  console.log(`🏨 Scraping Fairmont Royal York Hotel events for ${city}...`);
  
  try {
    const url = 'https://www.fairmont.com/royal-york-toronto/events';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // Look for hotel events and functions
    $('.event, [class*="event"], .function, .hotel-event, .meeting').each((index, element) => {
      const $event = $(element);
      
      const title = $event.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      
      if (title && title.length > 3 && title.length < 200) {
        const dateText = $event.find('.date, [class*="date"], time').text().trim();
        const description = $event.find('p, .description, [class*="desc"]').text().trim();
        
        events.push({
          title: title,
          date: dateText || 'Check hotel',
          venue: { name: 'Fairmont Royal York Hotel', city: 'Toronto' },
          location: 'Toronto, ON',
          description: description && description.length > 20 ? description : `Luxury hotel event at Fairmont Royal York`,
          url: url,
          source: 'Fairmont Royal York Website'
        });
      }
    });


    console.log(`✅ Scraped ${events.length} events from Fairmont Royal York Hotel`);
    return filterEvents(events);

  } catch (error) {
    console.log(`❌ Error scraping Fairmont Royal York events: ${error.message}`);
    return [];
  }
}

module.exports = scrapeFairmontRoyalYorkEvents;
