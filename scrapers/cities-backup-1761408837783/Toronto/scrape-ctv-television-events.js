const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeCTVTelevisionEvents(city) {
  console.log(`📺 Scraping CTV Television events for ${city}...`);
  
  try {
    const url = 'https://www.ctvnews.ca/toronto';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // Look for CTV events and broadcasts
    $('.event, [class*="event"], .broadcast, .news-event, .media-event').each((index, element) => {
      const $event = $(element);
      
      const title = $event.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      
      if (title && title.length > 3 && title.length < 200) {
        const dateText = $event.find('.date, [class*="date"], time').text().trim();
        const description = $event.find('p, .description, [class*="desc"]').text().trim();
        
        events.push({
          title: title,
          date: dateText || 'Check schedule',
          venue: { name: 'CTV Television Toronto', address: 'Toronto', city: 'Toronto' },
          location: 'Toronto, ON',
          description: description && description.length > 20 ? description : `CTV broadcast event or news programming`,
          url: url,
          source: 'CTV News Website'
        });
      }
    });


    console.log(`✅ Scraped ${events.length} events from CTV Television`);
    return filterEvents(events);

  } catch (error) {
    console.log(`❌ Error scraping CTV Television events: ${error.message}`);
    return [];
  }
}

module.exports = scrapeCTVTelevisionEvents;
