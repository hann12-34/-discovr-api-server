const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeMotorOilRecordsEvents(city) {
  console.log(`🎵 Scraping Motor Oil Records events for ${city}...`);
  
  try {
    const url = 'https://motoroilrecords.com/events';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // Look for indie music and record store events
    $('.event, [class*="event"], .show, .music, .indie').each((index, element) => {
      const $event = $(element);
      
      const title = $event.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      
      if (title && title.length > 3 && title.length < 200) {
        const dateText = $event.find('.date, [class*="date"], time').text().trim();
        const description = $event.find('p, .description, [class*="desc"]').text().trim();
        
        events.push({
          title: title,
          date: dateText || 'Check venue',
          venue: { name: 'Motor Oil Records', address: 'Toronto', city: 'Toronto' },
          location: 'Toronto, ON',
          description: description && description.length > 20 ? description : `Indie music event at Motor Oil Records`,
          url: url,
          source: 'Motor Oil Records Website'
        });
      }
    });


    console.log(`✅ Scraped ${events.length} events from Motor Oil Records`);
    return filterEvents(events);

  } catch (error) {
    console.log(`❌ Error scraping Motor Oil Records events: ${error.message}`);
    return [];
  }
}

module.exports = scrapeMotorOilRecordsEvents;
