const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapePhoenixConcertTheatre3rdAltEvents(city) {
  console.log(`🎵 Scraping Phoenix Concert Theatre (3rd alt) events for ${city}...`);
  
  try {
    const url = 'https://www.phoenixconcerttheatre.com/calendar';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // Look for concert events and shows
    $('.event, [class*="event"], .concert, .show, .performance').each((index, element) => {
      const $event = $(element);
      
      const title = $event.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      
      if (title && title.length > 3 && title.length < 200) {
        const dateText = $event.find('.date, [class*="date"], time').text().trim();
        const description = $event.find('p, .description, [class*="desc"]').text().trim();
        
        events.push({
          title: title,
          date: dateText || 'Check venue',
          venue: { name: 'Phoenix Concert Theatre', city: 'Toronto' },
          location: 'Toronto, ON',
          description: description && description.length > 20 ? description : `Live music concert at Phoenix Concert Theatre`,
          url: url,
          source: 'Phoenix Concert Theatre Website'
        });
      }
    });


    console.log(`✅ Scraped ${events.length} events from Phoenix Concert Theatre (3rd alt)`);
    return filterEvents(events);

  } catch (error) {
    console.log(`❌ Error scraping Phoenix Concert Theatre (3rd alt) events: ${error.message}`);
    return [];
  }
}

module.exports = scrapePhoenixConcertTheatre3rdAltEvents;
