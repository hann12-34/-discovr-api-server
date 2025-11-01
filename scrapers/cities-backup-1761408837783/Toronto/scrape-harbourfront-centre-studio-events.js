const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeHarbourfrontCentreStudioEvents(city) {
  console.log(`🎬 Scraping Harbourfront Centre Studio events for ${city}...`);
  
  try {
    const url = 'https://harbourfrontcentre.com/venues/studio';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // Look for studio and intimate events
    $('.event, [class*="event"], .studio, .intimate, .performance').each((index, element) => {
      const $event = $(element);
      
      const title = $event.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      
      if (title && title.length > 3 && title.length < 200) {
        const dateText = $event.find('.date, [class*="date"], time').text().trim();
        const description = $event.find('p, .description, [class*="desc"]').text().trim();
        
        events.push({
          title: title,
          date: dateText || 'Check studio',
          venue: { name: 'Harbourfront Centre Studio', address: 'Toronto', city: 'Toronto' },
          location: 'Toronto, ON',
          description: description && description.length > 20 ? description : `Intimate performance or studio event at Harbourfront Centre`,
          url: url,
          source: 'Harbourfront Centre Website'
        });
      }
    });


    console.log(`✅ Scraped ${events.length} events from Harbourfront Centre Studio`);
    return filterEvents(events);

  } catch (error) {
    console.log(`❌ Error scraping Harbourfront Centre Studio events: ${error.message}`);
    return [];
  }
}

module.exports = scrapeHarbourfrontCentreStudioEvents;
