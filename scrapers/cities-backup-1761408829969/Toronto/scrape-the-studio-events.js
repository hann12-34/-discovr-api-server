const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeTheStudioEvents(city) {
  console.log(`🎬 Scraping The Studio events for ${city}...`);
  
  try {
    const url = 'https://thestudio.ca/events';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const events = [];

    $('.event, [class*="event"], .studio, .production').each((index, element) => {
      const $event = $(element);
      const title = $event.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      
      if (title && title.length > 3 && title.length < 200) {
        events.push({
          title: title,
          date: $event.find('.date, [class*="date"], time').text().trim() || 'Check studio',
          venue: { name: 'The Studio', city: 'Toronto' },
          location: 'Toronto, ON',
          description: $event.find('p, .description, [class*="desc"]').text().trim() && $event.find('p, .description, [class*="desc"]').text().trim().length > 20 ? $event.find('p, .description, [class*="desc"]').text().trim() : `${title} - Studio production event`,
          url: url,
          source: 'The Studio Website'
        });
      }
    });


    console.log(`✅ Scraped ${events.length} events from The Studio`);
    return filterEvents(events);

  } catch (error) {
    console.log(`❌ Error scraping The Studio events: ${error.message}`);
    return [];
  }
}

module.exports = scrapeTheStudioEvents;
