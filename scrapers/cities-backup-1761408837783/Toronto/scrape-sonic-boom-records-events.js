const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeSonicBoomRecordsEvents(city) {
  console.log(`🎶 Scraping Sonic Boom Records events for ${city}...`);
  
  try {
    const url = 'https://sonicboommusic.com/events';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // Look for record store and indie music events
    $('.event, [class*="event"], .show, .music, .record').each((index, element) => {
      const $event = $(element);
      
      const title = $event.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      
      if (title && title.length > 3 && title.length < 200) {
        const dateText = $event.find('.date, [class*="date"], time').text().trim();
        const description = $event.find('p, .description, [class*="desc"]').text().trim();
        
        events.push({
          title: title,
          date: dateText || 'Check store',
          venue: { name: 'Sonic Boom Records', address: 'Toronto', city: 'Toronto' },
          location: 'Toronto, ON',
          description: description && description.length > 20 ? description : `Music event at Sonic Boom Records`,
          url: url,
          source: 'Sonic Boom Records Website'
        });
      }
    });


    console.log(`✅ Scraped ${events.length} events from Sonic Boom Records`);
    return filterEvents(events);

  } catch (error) {
    console.log(`❌ Error scraping Sonic Boom Records events: ${error.message}`);
    return [];
  }
}

module.exports = scrapeSonicBoomRecordsEvents;
