const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeTorontoIslandFerryEvents(city) {
  console.log(`⛴️ Scraping Toronto Island Ferry events for ${city}...`);
  
  try {
    const url = 'https://www.toronto.ca/explore-enjoy/parks-gardens-beaches/toronto-island-park';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // Look for ferry and island events
    $('.event, [class*="event"], .ferry, .island-event, .activity').each((index, element) => {
      const $event = $(element);
      
      const title = $event.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      
      if (title && title.length > 3 && title.length < 200) {
        const dateText = $event.find('.date, [class*="date"], time').text().trim();
        const description = $event.find('p, .description, [class*="desc"]').text().trim();
        
        events.push({
          title: title,
          date: dateText || 'Daily service',
          venue: { name: 'Toronto Island Ferry', city: 'Toronto' },
          location: 'Toronto, ON',
          description: description && description.length > 20 ? description : `Ferry service and island activities`,
          url: url,
          source: 'City of Toronto Website'
        });
      }
    });


    console.log(`✅ Scraped ${events.length} events from Toronto Island Ferry`);
    return filterEvents(events);

  } catch (error) {
    console.log(`❌ Error scraping Toronto Island Ferry events: ${error.message}`);
    return [];
  }
}

module.exports = scrapeTorontoIslandFerryEvents;
