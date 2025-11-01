const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeStLawrenceMarketNorthEvents(city) {
  console.log(`🏪 Scraping St. Lawrence Market North events for ${city}...`);
  
  try {
    const url = 'https://www.stlawrencemarket.com/vendors/north-market';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // Look for market events
    $('.event, [class*="event"], .market-day, .vendor-event, .farmers-market').each((index, element) => {
      const $event = $(element);
      
      const title = $event.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      
      if (title && title.length > 3 && title.length < 200) {
        const dateText = $event.find('.date, [class*="date"], time').text().trim();
        const description = $event.find('p, .description, [class*="desc"]').text().trim();
        
        events.push({
          title: title,
          date: dateText || 'Saturdays',
          venue: { name: 'St. Lawrence Market North', address: 'Toronto', city: 'Toronto' },
          location: 'Toronto, ON',
          description: description && description.length > 20 ? description : `Farmers market event at St. Lawrence North`,
          url: url,
          source: 'St. Lawrence Market Website'
        });
      }
    });


    console.log(`✅ Scraped ${events.length} events from St. Lawrence Market North`);
    return filterEvents(events);

  } catch (error) {
    console.log(`❌ Error scraping St. Lawrence Market North events: ${error.message}`);
    return [];
  }
}

module.exports = scrapeStLawrenceMarketNorthEvents;
