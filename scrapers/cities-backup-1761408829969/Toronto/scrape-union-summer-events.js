const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeUnionSummerEvents(city) {
  console.log(`☀️ Scraping Union Summer events for ${city}...`);
  
  try {
    const url = 'https://www.unionsummer.com/events';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // Look for summer events and outdoor activities
    $('.event, [class*="event"], .summer-event, .outdoor, .festival').each((index, element) => {
      const $event = $(element);
      
      const title = $event.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      
      if (title && title.length > 3 && title.length < 200) {
        const dateText = $event.find('.date, [class*="date"], time').text().trim();
        const description = $event.find('p, .description, [class*="desc"]').text().trim();
        
        events.push({
          title: title,
          date: dateText || 'Check schedule',
          venue: { name: 'Union Summer', city: 'Toronto' },
          location: 'Toronto, ON',
          description: description && description.length > 20 ? description : `Summer event or outdoor activity at Union Summer`,
          url: url,
          source: 'Union Summer Website'
        });
      }
    });


    console.log(`✅ Scraped ${events.length} events from Union Summer`);
    return filterEvents(events);

  } catch (error) {
    console.log(`❌ Error scraping Union Summer events: ${error.message}`);
    return [];
  }
}

module.exports = scrapeUnionSummerEvents;
