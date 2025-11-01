const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeTorontoMusicGardenEvents(city) {
  console.log(`🎼 Scraping Toronto Music Garden events for ${city}...`);
  
  try {
    const url = 'https://www.toronto.ca/explore-enjoy/parks-gardens-beaches/parks/toronto-music-garden';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // Look for concerts and events
    $('.event, [class*="event"], .concert, .performance, .program').each((index, element) => {
      const $event = $(element);
      
      const title = $event.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      
      if (title && title.length > 3 && title.length < 200) {
        const dateText = $event.find('.date, [class*="date"], time').text().trim();
        const description = $event.find('p, .description, [class*="desc"]').text().trim();
        
        events.push({
          title: title,
          date: dateText || 'Summer season',
          venue: { name: 'Toronto Music Garden', address: 'Toronto', city: 'Toronto' },
          location: 'Toronto, ON',
          description: description && description.length > 20 ? description : `Outdoor concert at Toronto Music Garden`,
          url: url,
          source: 'City of Toronto Website'
        });
      }
    });


    console.log(`✅ Scraped ${events.length} events from Toronto Music Garden`);
    return filterEvents(events);

  } catch (error) {
    console.log(`❌ Error scraping Toronto Music Garden events: ${error.message}`);
    return [];
  }
}

module.exports = scrapeTorontoMusicGardenEvents;
