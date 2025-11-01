const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeTorontoCentreForTheArtsAltEvents(city) {
  console.log(`🎭 Scraping Toronto Centre for the Arts (alt) events for ${city}...`);
  
  try {
    const url = 'https://www.tocentre.com/shows-events';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // Look for arts events and performances
    $('.event, [class*="event"], .show, .performance, .theatre-event').each((index, element) => {
      const $event = $(element);
      
      const title = $event.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      
      if (title && title.length > 3 && title.length < 200) {
        const dateText = $event.find('.date, [class*="date"], time').text().trim();
        const description = $event.find('p, .description, [class*="desc"]').text().trim();
        
        events.push({
          title: title,
          date: dateText || 'Check centre',
          venue: { name: 'Toronto Centre for the Arts', address: 'Toronto', city: 'Toronto' },
          location: 'Toronto, ON',
          description: description && description.length > 20 ? description : `Arts performance or cultural event at Toronto Centre for the Arts`,
          url: url,
          source: 'Toronto Centre for the Arts Website'
        });
      }
    });


    console.log(`✅ Scraped ${events.length} events from Toronto Centre for the Arts (alt)`);
    return filterEvents(events);

  } catch (error) {
    console.log(`❌ Error scraping Toronto Centre for the Arts (alt) events: ${error.message}`);
    return [];
  }
}

module.exports = scrapeTorontoCentreForTheArtsAltEvents;
