const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeUPExpressEvents(city) {
  console.log(`🚄 Scraping UP Express events for ${city}...`);
  
  try {
    const url = 'https://www.upexpress.com/events';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // Look for UP Express events and promotions
    $('.event, [class*="event"], .promotion, .up-event, .activity').each((index, element) => {
      const $event = $(element);
      
      const title = $event.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      
      if (title && title.length > 3 && title.length < 200) {
        const dateText = $event.find('.date, [class*="date"], time').text().trim();
        const description = $event.find('p, .description, [class*="desc"]').text().trim();
        
        events.push({
          title: title,
          date: dateText || 'Check schedule',
          venue: { name: 'UP Express', city: 'Toronto' },
          location: 'Toronto, ON',
          description: description && description.length > 20 ? description : `UP Express transit event or promotion`,
          url: url,
          source: 'UP Express Website'
        });
      }
    });


    console.log(`✅ Scraped ${events.length} events from UP Express`);
    return filterEvents(events);

  } catch (error) {
    console.log(`❌ Error scraping UP Express events: ${error.message}`);
    return [];
  }
}

module.exports = scrapeUPExpressEvents;
