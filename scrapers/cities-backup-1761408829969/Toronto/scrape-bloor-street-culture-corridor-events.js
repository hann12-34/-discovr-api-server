const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeBloorStreetCultureCorridorEvents(city) {
  console.log(`🎨 Scraping Bloor Street Culture Corridor events for ${city}...`);
  
  try {
    const url = 'https://www.toronto.ca/explore-enjoy/festivals-events/bloor-street-culture-corridor';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // Look for cultural corridor events
    $('.event, [class*="event"], .cultural, .corridor, .bloor-event').each((index, element) => {
      const $event = $(element);
      
      const title = $event.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      
      if (title && title.length > 3 && title.length < 200) {
        const dateText = $event.find('.date, [class*="date"], time').text().trim();
        const description = $event.find('p, .description, [class*="desc"]').text().trim();
        
        events.push({
          title: title,
          date: dateText || 'Check corridor',
          venue: { name: 'Bloor Street Culture Corridor', city: 'Toronto' },
          location: 'Toronto, ON',
          description: description && description.length > 20 ? description : `Cultural event along Bloor Street Culture Corridor`,
          url: url,
          source: 'City of Toronto Website'
        });
      }
    });


    console.log(`✅ Scraped ${events.length} events from Bloor Street Culture Corridor`);
    return filterEvents(events);

  } catch (error) {
    console.log(`❌ Error scraping Bloor Street Culture Corridor events: ${error.message}`);
    return [];
  }
}

module.exports = scrapeBloorStreetCultureCorridorEvents;
