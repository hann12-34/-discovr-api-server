const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeConcertHallEvents(city) {
  console.log(`🎼 Scraping Concert Hall events for ${city}...`);
  
  try {
    const url = 'https://www.toronto.ca/explore-enjoy/festivals-events/featured-events';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // Look for concert hall events and classical performances
    $('.event, [class*="event"], .concert, .classical, .performance').each((index, element) => {
      const $event = $(element);
      
      const title = $event.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      
      if (title && title.length > 3 && title.length < 200) {
        const dateText = $event.find('.date, [class*="date"], time').text().trim();
        const description = $event.find('p, .description, [class*="desc"]').text().trim();
        
        events.push({
          title: title,
          date: dateText || 'Check schedule',
          venue: { name: 'Toronto Concert Hall', city: 'Toronto' },
          location: 'Toronto, ON',
          description: description && description.length > 20 ? description : `Classical music or concert performance at Toronto Concert Hall`,
          url: url,
          source: 'City of Toronto Website'
        });
      }
    });


    console.log(`✅ Scraped ${events.length} events from Concert Hall`);
    return filterEvents(events);

  } catch (error) {
    console.log(`❌ Error scraping Concert Hall events: ${error.message}`);
    return [];
  }
}

module.exports = scrapeConcertHallEvents;
