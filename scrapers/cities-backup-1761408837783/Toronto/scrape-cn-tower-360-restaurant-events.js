const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeCNTower360RestaurantEvents(city) {
  console.log(`🗼 Scraping CN Tower 360 Restaurant events for ${city}...`);
  
  try {
    const url = 'https://www.cntower.ca/en-ca/360-restaurant/events';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // Look for restaurant events and special dining
    $('.event, [class*="event"], .dining-event, .special-event, .restaurant-event').each((index, element) => {
      const $event = $(element);
      
      const title = $event.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      
      if (title && title.length > 3 && title.length < 200) {
        const dateText = $event.find('.date, [class*="date"], time').text().trim();
        const description = $event.find('p, .description, [class*="desc"]').text().trim();
        
        events.push({
          title: title,
          date: dateText || 'Check restaurant',
          venue: { name: 'CN Tower 360 Restaurant', address: 'Toronto', city: 'Toronto' },
          location: 'Toronto, ON',
          description: description && description.length > 20 ? description : `Fine dining event at CN Tower 360 Restaurant`,
          url: url,
          source: 'CN Tower Website'
        });
      }
    });


    console.log(`✅ Scraped ${events.length} events from CN Tower 360 Restaurant`);
    return filterEvents(events);

  } catch (error) {
    console.log(`❌ Error scraping CN Tower 360 Restaurant events: ${error.message}`);
    return [];
  }
}

module.exports = scrapeCNTower360RestaurantEvents;
