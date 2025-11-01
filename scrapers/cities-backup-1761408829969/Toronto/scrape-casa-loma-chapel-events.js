const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeCasaLomaChapelEvents(city) {
  console.log(`🏰 Scraping Casa Loma Chapel events for ${city}...`);
  
  try {
    const url = 'https://casaloma.ca/weddings-events';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // Look for chapel and wedding events
    $('.event, [class*="event"], .wedding, .chapel, .ceremony').each((index, element) => {
      const $event = $(element);
      
      const title = $event.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      
      if (title && title.length > 3 && title.length < 200) {
        const dateText = $event.find('.date, [class*="date"], time').text().trim();
        const description = $event.find('p, .description, [class*="desc"]').text().trim();
        
        events.push({
          title: title,
          date: dateText || 'By appointment',
          venue: { name: 'Casa Loma Chapel', city: 'Toronto' },
          location: 'Toronto, ON',
          description: description && description.length > 20 ? description : `Wedding ceremony or event at Casa Loma Chapel`,
          url: url,
          source: 'Casa Loma Website'
        });
      }
    });


    console.log(`✅ Scraped ${events.length} events from Casa Loma Chapel`);
    return filterEvents(events);

  } catch (error) {
    console.log(`❌ Error scraping Casa Loma Chapel events: ${error.message}`);
    return [];
  }
}

module.exports = scrapeCasaLomaChapelEvents;
