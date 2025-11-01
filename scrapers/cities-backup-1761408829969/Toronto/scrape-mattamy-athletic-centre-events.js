const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeMattamyAthleticCentreEvents(city) {
  console.log(`🏒 Scraping Mattamy Athletic Centre events for ${city}...`);
  
  try {
    const url = 'https://www.mattamyathleticcentre.ca/events';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // Look for hockey and sports events
    $('.event, [class*="event"], .game, .hockey-event, .sports-event').each((index, element) => {
      const $event = $(element);
      
      const title = $event.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      
      if (title && title.length > 3 && title.length < 200) {
        const dateText = $event.find('.date, [class*="date"], time').text().trim();
        const description = $event.find('p, .description, [class*="desc"]').text().trim();
        
        events.push({
          title: title,
          date: dateText || 'Check schedule',
          venue: { name: 'Mattamy Athletic Centre', city: 'Toronto' },
          location: 'Toronto, ON',
          description: description && description.length > 20 ? description : `Hockey or sports event at Mattamy Athletic Centre`,
          url: url,
          source: 'Mattamy Athletic Centre Website'
        });
      }
    });


    console.log(`✅ Scraped ${events.length} events from Mattamy Athletic Centre`);
    return filterEvents(events);

  } catch (error) {
    console.log(`❌ Error scraping Mattamy Athletic Centre events: ${error.message}`);
    return [];
  }
}

module.exports = scrapeMattamyAthleticCentreEvents;
