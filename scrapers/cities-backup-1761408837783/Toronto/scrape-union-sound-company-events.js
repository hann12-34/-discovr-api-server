const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeUnionSoundCompanyEvents(city) {
  console.log(`🔊 Scraping Union Sound Company events for ${city}...`);
  
  try {
    const url = 'https://unionsoundcompany.com/events';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // Look for audio production and sound events
    $('.event, [class*="event"], .sound, .audio, .production').each((index, element) => {
      const $event = $(element);
      
      const title = $event.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      
      if (title && title.length > 3 && title.length < 200) {
        const dateText = $event.find('.date, [class*="date"], time').text().trim();
        const description = $event.find('p, .description, [class*="desc"]').text().trim();
        
        events.push({
          title: title,
          date: dateText || 'Check venue',
          venue: { name: 'Union Sound Company', address: 'Toronto', city: 'Toronto' },
          location: 'Toronto, ON',
          description: description && description.length > 20 ? description : `Audio production and sound event at Union Sound Company`,
          url: url,
          source: 'Union Sound Company Website'
        });
      }
    });


    console.log(`✅ Scraped ${events.length} events from Union Sound Company`);
    return filterEvents(events);

  } catch (error) {
    console.log(`❌ Error scraping Union Sound Company events: ${error.message}`);
    return [];
  }
}

module.exports = scrapeUnionSoundCompanyEvents;
