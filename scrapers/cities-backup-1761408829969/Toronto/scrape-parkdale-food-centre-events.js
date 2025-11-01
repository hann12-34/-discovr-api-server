const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeParkdaleFoodCentreEvents(city) {
  console.log(`🍽️ Scraping Parkdale Food Centre events for ${city}...`);
  
  try {
    const url = 'https://parkdalefoodcentre.ca/events';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // Look for community and food-related events
    $('.event, [class*="event"], .community, .food, .workshop').each((index, element) => {
      const $event = $(element);
      
      const title = $event.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      
      if (title && title.length > 3 && title.length < 200) {
        const dateText = $event.find('.date, [class*="date"], time').text().trim();
        const description = $event.find('p, .description, [class*="desc"]').text().trim();
        
        events.push({
          title: title,
          date: dateText || 'Check centre',
          venue: { name: 'Parkdale Food Centre', city: 'Toronto' },
          location: 'Toronto, ON',
          description: description && description.length > 20 ? description : `Community workshop or food event at Parkdale Food Centre`,
          url: url,
          source: 'Parkdale Food Centre Website'
        });
      }
    });


    console.log(`✅ Scraped ${events.length} events from Parkdale Food Centre`);
    return filterEvents(events);

  } catch (error) {
    console.log(`❌ Error scraping Parkdale Food Centre events: ${error.message}`);
    return [];
  }
}

module.exports = scrapeParkdaleFoodCentreEvents;
