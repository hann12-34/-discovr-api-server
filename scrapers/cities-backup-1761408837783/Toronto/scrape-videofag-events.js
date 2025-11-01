const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeVideofagEvents(city) {
  console.log(`📱 Scraping Videofag events for ${city}...`);
  
  try {
    const url = 'https://videofag.com/events';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // Look for experimental art and performance events
    $('.event, [class*="event"], .performance, .art, .experimental').each((index, element) => {
      const $event = $(element);
      
      const title = $event.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      
      if (title && title.length > 3 && title.length < 200) {
        const dateText = $event.find('.date, [class*="date"], time').text().trim();
        const description = $event.find('p, .description, [class*="desc"]').text().trim();
        
        events.push({
          title: title,
          date: dateText || 'Check venue',
          venue: { name: 'Videofag', address: 'Toronto', city: 'Toronto' },
          location: 'Toronto, ON',
          description: description && description.length > 20 ? description : `Experimental art and performance event at Videofag`,
          url: url,
          source: 'Videofag Website'
        });
      }
    });


    console.log(`✅ Scraped ${events.length} events from Videofag`);
    return filterEvents(events);

  } catch (error) {
    console.log(`❌ Error scraping Videofag events: ${error.message}`);
    return [];
  }
}

module.exports = scrapeVideofagEvents;
