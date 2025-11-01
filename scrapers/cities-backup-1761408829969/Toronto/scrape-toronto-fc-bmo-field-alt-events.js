const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeTorontoFCBMOFieldAltEvents(city) {
  console.log(`⚽ Scraping Toronto FC BMO Field (alt) events for ${city}...`);
  
  try {
    const url = 'https://www.torontofc.ca/schedule';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // Look for soccer matches and events
    $('.event, [class*="event"], .match, .game, .soccer-event').each((index, element) => {
      const $event = $(element);
      
      const title = $event.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      
      if (title && title.length > 3 && title.length < 200) {
        const dateText = $event.find('.date, [class*="date"], time').text().trim();
        const description = $event.find('p, .description, [class*="desc"]').text().trim();
        
        events.push({
          title: title,
          date: dateText || 'Check schedule',
          venue: { name: 'BMO Field (Toronto FC)', city: 'Toronto' },
          location: 'Toronto, ON',
          description: description && description.length > 20 ? description : `Toronto FC soccer match at BMO Field`,
          url: url,
          source: 'Toronto FC Website'
        });
      }
    });


    console.log(`✅ Scraped ${events.length} events from Toronto FC BMO Field (alt)`);
    return filterEvents(events);

  } catch (error) {
    console.log(`❌ Error scraping Toronto FC BMO Field (alt) events: ${error.message}`);
    return [];
  }
}

module.exports = scrapeTorontoFCBMOFieldAltEvents;
