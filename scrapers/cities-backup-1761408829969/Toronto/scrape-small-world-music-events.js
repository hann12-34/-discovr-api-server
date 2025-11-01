const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeSmallWorldMusicEvents(city) {
  console.log(`🌍 Scraping Small World Music events for ${city}...`);
  
  try {
    const url = 'https://smallworldmusic.com/events';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // Look for world music and cultural events
    $('.event, [class*="event"], .world-music, .cultural, .concert').each((index, element) => {
      const $event = $(element);
      
      const title = $event.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      
      if (title && title.length > 3 && title.length < 200) {
        const dateText = $event.find('.date, [class*="date"], time').text().trim();
        const description = $event.find('p, .description, [class*="desc"]').text().trim();
        
        events.push({
          title: title,
          date: dateText || 'Check venue',
          venue: { name: 'Small World Music', city: 'Toronto' },
          location: 'Toronto, ON',
          description: description && description.length > 20 ? description : `World music and cultural event at Small World Music`,
          url: url,
          source: 'Small World Music Website'
        });
      }
    });


    console.log(`✅ Scraped ${events.length} events from Small World Music`);
    return filterEvents(events);

  } catch (error) {
    console.log(`❌ Error scraping Small World Music events: ${error.message}`);
    return [];
  }
}

module.exports = scrapeSmallWorldMusicEvents;
