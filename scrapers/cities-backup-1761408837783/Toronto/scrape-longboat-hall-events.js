const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeLongboatHallEvents(city) {
  console.log(`🚣 Scraping Longboat Hall events for ${city}...`);
  
  try {
    const url = 'https://longboathall.com/events';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // Look for indie music and community events
    $('.event, [class*="event"], .show, .indie, .community').each((index, element) => {
      const $event = $(element);
      
      const title = $event.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      
      if (title && title.length > 3 && title.length < 200) {
        const dateText = $event.find('.date, [class*="date"], time').text().trim();
        const description = $event.find('p, .description, [class*="desc"]').text().trim();
        
        events.push({
          title: title,
          date: dateText || 'Check venue',
          venue: { name: 'Longboat Hall', address: 'Toronto', city: 'Toronto' },
          location: 'Toronto, ON',
          description: description && description.length > 20 ? description : `Indie music or community event at Longboat Hall`,
          url: url,
          source: 'Longboat Hall Website'
        });
      }
    });


    console.log(`✅ Scraped ${events.length} events from Longboat Hall`);
    return filterEvents(events);

  } catch (error) {
    console.log(`❌ Error scraping Longboat Hall events: ${error.message}`);
    return [];
  }
}

module.exports = scrapeLongboatHallEvents;
