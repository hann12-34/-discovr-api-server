const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeRedSkyPerformanceEvents(city) {
  console.log(`🩰 Scraping Red Sky Performance events for ${city}...`);
  
  try {
    const url = 'https://redsky.ca/performances';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // Look for Indigenous contemporary dance and performance
    $('.event, [class*="event"], .performance, .dance, .indigenous').each((index, element) => {
      const $event = $(element);
      
      const title = $event.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      
      if (title && title.length > 3 && title.length < 200) {
        const dateText = $event.find('.date, [class*="date"], time').text().trim();
        const description = $event.find('p, .description, [class*="desc"]').text().trim();
        
        events.push({
          title: title,
          date: dateText || 'Check venue',
          venue: { name: 'Red Sky Performance', address: 'Toronto', city: 'Toronto' },
          location: 'Toronto, ON',
          description: description && description.length > 20 ? description : `Indigenous contemporary dance performance by Red Sky Performance`,
          url: url,
          source: 'Red Sky Performance Website'
        });
      }
    });


    console.log(`✅ Scraped ${events.length} events from Red Sky Performance`);
    return filterEvents(events);

  } catch (error) {
    console.log(`❌ Error scraping Red Sky Performance events: ${error.message}`);
    return [];
  }
}

module.exports = scrapeRedSkyPerformanceEvents;
