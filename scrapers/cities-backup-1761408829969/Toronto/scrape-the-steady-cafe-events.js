const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeTheSteadyCafeEvents(city) {
  console.log(`☕ Scraping The Steady Cafe events for ${city}...`);
  
  try {
    const url = 'https://thesteady.ca/events';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // Look for cafe and community events
    $('.event, [class*="event"], .cafe, .community, .workshop').each((index, element) => {
      const $event = $(element);
      
      const title = $event.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      
      if (title && title.length > 3 && title.length < 200) {
        const dateText = $event.find('.date, [class*="date"], time').text().trim();
        const description = $event.find('p, .description, [class*="desc"]').text().trim();
        
        events.push({
          title: title,
          date: dateText || 'Check cafe',
          venue: { name: 'The Steady Cafe', city: 'Toronto' },
          location: 'Toronto, ON',
          description: description && description.length > 20 ? description : `Community event or workshop at The Steady Cafe`,
          url: url,
          source: 'The Steady Cafe Website'
        });
      }
    });


    console.log(`✅ Scraped ${events.length} events from The Steady Cafe`);
    return filterEvents(events);

  } catch (error) {
    console.log(`❌ Error scraping The Steady Cafe events: ${error.message}`);
    return [];
  }
}

module.exports = scrapeTheSteadyCafeEvents;
