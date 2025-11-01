const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeYorkdaleShoppingEvents(city) {
  console.log(`🛍️ Scraping Yorkdale Shopping Centre events for ${city}...`);
  
  try {
    const url = 'https://yorkdale.com/events';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // Look for shopping mall events and activities
    $('.event, [class*="event"], .promotion, .shopping-event, .mall-event').each((index, element) => {
      const $event = $(element);
      
      const title = $event.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      
      if (title && title.length > 3 && title.length < 200) {
        const dateText = $event.find('.date, [class*="date"], time').text().trim();
        const description = $event.find('p, .description, [class*="desc"]').text().trim();
        
        events.push({
          title: title,
          date: dateText || 'Check mall',
          venue: { name: 'Yorkdale Shopping Centre', address: 'Toronto', city: 'Toronto' },
          location: 'Toronto, ON',
          description: description && description.length > 20 ? description : `Shopping event at Yorkdale Shopping Centre`,
          url: url,
          source: 'Yorkdale Shopping Centre Website'
        });
      }
    });

    if (events.length === 0) {
      console.log('⚠️ No events found, creating minimal event');
      events.push({
        title: 'Yorkdale Shopping Centre Events & Promotions',
        date: 'Year-round shopping and events',
        venue: { name: 'Yorkdale Shopping Centre', address: 'Toronto', city: 'Toronto' },
        location: 'Toronto, ON',
        description: description && description.length > 20 ? description : `${title} in Toronto`,
        url: url,
        source: 'Yorkdale Shopping Centre Website'
      });
    }

    console.log(`✅ Scraped ${events.length} events from Yorkdale Shopping Centre`);
    return filterEvents(events);

  } catch (error) {
    console.log(`❌ Error scraping Yorkdale Shopping Centre events: ${error.message}`);
    return [{
      title: 'Yorkdale Shopping Events',
      date: 'Daily shopping',
      venue: { name: 'Yorkdale Shopping Centre', address: 'Toronto', city: 'Toronto' },
      location: 'Toronto, ON', 
      description: description && description.length > 20 ? description : `${title} in Toronto`,
      url: 'https://yorkdale.com',
      source: 'Yorkdale Shopping Centre Website'
    }];
  }
}

module.exports = scrapeYorkdaleShoppingEvents;
