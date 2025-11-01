const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeCrowsTheatreEvents(city) {
  console.log(`🐦 Scraping Crow's Theatre events for ${city}...`);
  
  try {
    const url = 'https://crowstheatre.com/season';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // Look for intimate theatre productions
    $('.event, [class*="event"], .show, .production, .intimate').each((index, element) => {
      const $event = $(element);
      
      const title = $event.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      
      if (title && title.length > 3 && title.length < 200) {
        const dateText = $event.find('.date, [class*="date"], time').text().trim();
        const description = $event.find('p, .description, [class*="desc"]').text().trim();
        
        events.push({
          title: title,
          date: dateText || 'Check theatre',
          venue: { name: 'Crow\'s Theatre', city: 'Toronto' },
          location: 'Toronto, ON',
          description: description && description.length > 20 ? description : `Intimate theatre production at Crow\`s Theatre',
          url: url,
          source: 'Crow\'s Theatre Website'
        });
      }
    });


    console.log(`✅ Scraped ${events.length} events from Crow's Theatre`);
    return filterEvents(events);

  } catch (error) {
    console.log(`❌ Error scraping Crow's Theatre events: ${error.message}`);
    return [];
  }
}

module.exports = scrapeCrowsTheatreEvents;
