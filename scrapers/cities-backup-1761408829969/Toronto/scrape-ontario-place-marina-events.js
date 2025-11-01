const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeOntarioPlaceMarinaEvents(city) {
  console.log(`⛵ Scraping Ontario Place Marina events for ${city}...`);
  
  try {
    const url = 'https://ontarioplace.com/marina';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // Look for marina events
    $('.event, [class*="event"], .program, .activity, .marina-event').each((index, element) => {
      const $event = $(element);
      
      const title = $event.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      
      if (title && title.length > 3 && title.length < 200) {
        const dateText = $event.find('.date, [class*="date"], time').text().trim();
        const description = $event.find('p, .description, [class*="desc"]').text().trim();
        
        events.push({
          title: title,
          date: dateText || 'Check website',
          venue: { name: 'Ontario Place Marina', city: 'Toronto' },
          location: 'Toronto, ON',
          description: description && description.length > 20 ? description : `Marina event at Ontario Place`,
          url: url,
          source: 'Ontario Place Website'
        });
      }
    });


    console.log(`✅ Scraped ${events.length} events from Ontario Place Marina`);
    return filterEvents(events);

  } catch (error) {
    console.log(`❌ Error scraping Ontario Place Marina events: ${error.message}`);
    return [];
  }
}

module.exports = scrapeOntarioPlaceMarinaEvents;
