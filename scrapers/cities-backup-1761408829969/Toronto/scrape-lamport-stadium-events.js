const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeLamportStadiumEvents(city) {
  console.log(`⚽ Scraping Lamport Stadium events for ${city}...`);
  
  try {
    const url = 'https://www.toronto.ca/explore-enjoy/recreation/parks-gardens-beaches/parks/lamport-stadium';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // Look for sports events and games
    $('.event, [class*="event"], .game, .soccer-event, .football-event').each((index, element) => {
      const $event = $(element);
      
      const title = $event.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      
      if (title && title.length > 3 && title.length < 200) {
        const dateText = $event.find('.date, [class*="date"], time').text().trim();
        const description = $event.find('p, .description, [class*="desc"]').text().trim();
        
        events.push({
          title: title,
          date: dateText || 'Check stadium',
          venue: { name: 'Lamport Stadium', city: 'Toronto' },
          location: 'Toronto, ON',
          description: description && description.length > 20 ? description : `Soccer or sports event at Lamport Stadium`,
          url: url,
          source: 'City of Toronto Website'
        });
      }
    });


    console.log(`✅ Scraped ${events.length} events from Lamport Stadium`);
    return filterEvents(events);

  } catch (error) {
    console.log(`❌ Error scraping Lamport Stadium events: ${error.message}`);
    return [];
  }
}

module.exports = scrapeLamportStadiumEvents;
