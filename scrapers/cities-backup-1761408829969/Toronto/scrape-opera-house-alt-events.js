const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeOperaHouseAltEvents(city) {
  console.log(`🎭 Scraping The Opera House (alt) events for ${city}...`);
  
  try {
    const url = 'https://www.theoperahouse.ca/upcoming-events';
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
          venue: { name: 'The Opera House', address: '735 Queen Street E, Toronto, ON M4M 1H1', city: 'Toronto' },
          location: 'Toronto, ON',
          description: description && description.length > 20 ? description : `Live music event at The Opera House`,
          url: url,
          source: 'The Opera House Website'
        });
      }
    });


    console.log(`✅ Scraped ${events.length} events from The Opera House (alt)`);
    return filterEvents(events);

  } catch (error) {
    console.log(`❌ Error scraping The Opera House (alt) events: ${error.message}`);
    return [];
  }
}

module.exports = scrapeOperaHouseAltEvents;
