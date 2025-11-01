const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeLibertyGrandEvents(city) {
  console.log(`🏛️ Scraping Liberty Grand events for ${city}...`);
  
  try {
    const url = 'https://libertygrand.com/events';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // Look for event venue and wedding events
    $('.event, [class*="event"], .wedding, .corporate, .venue-event').each((index, element) => {
      const $event = $(element);
      
      const title = $event.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      
      if (title && title.length > 3 && title.length < 200) {
        const dateText = $event.find('.date, [class*="date"], time').text().trim();
        const description = $event.find('p, .description, [class*="desc"]').text().trim();
        
        events.push({
          title: title,
          date: dateText || 'Check venue',
          venue: { name: 'Liberty Grand', city: 'Toronto' },
          location: 'Toronto, ON',
          description: description && description.length > 20 ? description : `Special event or celebration at Liberty Grand venue`,
          url: url,
          source: 'Liberty Grand Website'
        });
      }
    });


    console.log(`✅ Scraped ${events.length} events from Liberty Grand`);
    return filterEvents(events);

  } catch (error) {
    console.log(`❌ Error scraping Liberty Grand events: ${error.message}`);
    return [];
  }
}

module.exports = scrapeLibertyGrandEvents;
