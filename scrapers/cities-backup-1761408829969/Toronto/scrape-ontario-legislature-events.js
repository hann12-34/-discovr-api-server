const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeOntarioLegislatureEvents(city) {
  console.log(`🏛️ Scraping Ontario Legislature events for ${city}...`);
  
  try {
    const url = 'https://www.ola.org/en/events';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // Look for legislative events and tours
    $('.event, [class*="event"], .tour, .session, .committee').each((index, element) => {
      const $event = $(element);
      
      const title = $event.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      
      if (title && title.length > 3 && title.length < 200) {
        const dateText = $event.find('.date, [class*="date"], time').text().trim();
        const description = $event.find('p, .description, [class*="desc"]').text().trim();
        
        events.push({
          title: title,
          date: dateText || 'Check schedule',
          venue: { name: 'Ontario Legislative Assembly', city: 'Toronto' },
          location: 'Toronto, ON',
          description: description && description.length > 20 ? description : `Provincial government event or tour`,
          url: url,
          source: 'Ontario Legislative Assembly Website'
        });
      }
    });


    console.log(`✅ Scraped ${events.length} events from Ontario Legislature`);
    return filterEvents(events);

  } catch (error) {
    console.log(`❌ Error scraping Ontario Legislature events: ${error.message}`);
    return [];
  }
}

module.exports = scrapeOntarioLegislatureEvents;
