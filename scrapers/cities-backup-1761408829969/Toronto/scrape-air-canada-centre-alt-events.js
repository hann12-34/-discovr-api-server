const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeAirCanadaCentreAltEvents(city) {
  console.log(`🏒 Scraping Air Canada Centre (alt) events for ${city}...`);
  
  try {
    const url = 'https://www.scotiabankarena.com/events';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // Look for sports and entertainment events
    $('.event, [class*="event"], .game, .concert, .sports-event').each((index, element) => {
      const $event = $(element);
      
      const title = $event.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      
      if (title && title.length > 3 && title.length < 200) {
        const dateText = $event.find('.date, [class*="date"], time').text().trim();
        const description = $event.find('p, .description, [class*="desc"]').text().trim();
        
        events.push({
          title: title,
          date: dateText || 'Check arena',
          venue: { name: 'Scotiabank Arena (Air Canada Centre)', city: 'Toronto' },
          location: 'Toronto, ON',
          description: description && description.length > 20 ? description : `Sports or entertainment event at Scotiabank Arena`,
          url: url,
          source: 'Scotiabank Arena Website'
        });
      }
    });


    console.log(`✅ Scraped ${events.length} events from Air Canada Centre (alt)`);
    return filterEvents(events);

  } catch (error) {
    console.log(`❌ Error scraping Air Canada Centre (alt) events: ${error.message}`);
    return [];
  }
}

module.exports = scrapeAirCanadaCentreAltEvents;
