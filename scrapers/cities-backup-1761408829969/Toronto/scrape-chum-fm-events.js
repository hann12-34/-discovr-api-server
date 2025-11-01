const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeCHUMFMEvents(city) {
  console.log(`📻 Scraping CHUM-FM events for ${city}...`);
  
  try {
    const url = 'https://www.iheartradio.ca/chum/events';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // Look for radio events and concerts
    $('.event, [class*="event"], .concert, .radio-event, .music-event').each((index, element) => {
      const $event = $(element);
      
      const title = $event.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      
      if (title && title.length > 3 && title.length < 200) {
        const dateText = $event.find('.date, [class*="date"], time').text().trim();
        const description = $event.find('p, .description, [class*="desc"]').text().trim();
        
        events.push({
          title: title,
          date: dateText || 'Check schedule',
          venue: { name: 'CHUM-FM Radio', city: 'Toronto' },
          location: 'Toronto, ON',
          description: description && description.length > 20 ? description : `CHUM-FM radio event or music programming`,
          url: url,
          source: 'CHUM-FM Website'
        });
      }
    });


    console.log(`✅ Scraped ${events.length} events from CHUM-FM`);
    return filterEvents(events);

  } catch (error) {
    console.log(`❌ Error scraping CHUM-FM events: ${error.message}`);
    return [];
  }
}

module.exports = scrapeCHUMFMEvents;
