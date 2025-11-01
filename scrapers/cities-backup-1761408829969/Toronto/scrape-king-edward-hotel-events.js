const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeKingEdwardHotelEvents(city) {
  console.log(`🏨 Scraping King Edward Hotel events for ${city}...`);
  
  try {
    const url = 'https://www.omnihotels.com/hotels/toronto-king-edward/meetings-and-events';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // Look for hotel events and meetings
    $('.event, [class*="event"], .meeting, .wedding, .hotel-event').each((index, element) => {
      const $event = $(element);
      
      const title = $event.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      
      if (title && title.length > 3 && title.length < 200) {
        const dateText = $event.find('.date, [class*="date"], time').text().trim();
        const description = $event.find('p, .description, [class*="desc"]').text().trim();
        
        events.push({
          title: title,
          date: dateText || 'Check hotel',
          venue: { name: 'King Edward Hotel', city: 'Toronto' },
          location: 'Toronto, ON',
          description: description && description.length > 20 ? description : `Luxury hotel event at King Edward Hotel`,
          url: url,
          source: 'King Edward Hotel Website'
        });
      }
    });


    console.log(`✅ Scraped ${events.length} events from King Edward Hotel`);
    return filterEvents(events);

  } catch (error) {
    console.log(`❌ Error scraping King Edward Hotel events: ${error.message}`);
    return [];
  }
}

module.exports = scrapeKingEdwardHotelEvents;
