const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeKensingtonBrewingCompanyEvents(city) {
  console.log(`🍺 Scraping Kensington Brewing Company events for ${city}...`);
  
  try {
    const url = 'https://kensingtonbrewingcompany.com/events';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // Look for brewery and community events
    $('.event, [class*="event"], .brewery, .community, .tasting').each((index, element) => {
      const $event = $(element);
      
      const title = $event.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      
      if (title && title.length > 3 && title.length < 200) {
        const dateText = $event.find('.date, [class*="date"], time').text().trim();
        const description = $event.find('p, .description, [class*="desc"]').text().trim();
        
        events.push({
          title: title,
          date: dateText || 'Check brewery',
          venue: { name: 'Kensington Brewing Company', city: 'Toronto' },
          location: 'Toronto, ON',
          description: description && description.length > 20 ? description : `Brewery event at Kensington Brewing Company`,
          url: url,
          source: 'Kensington Brewing Company Website'
        });
      }
    });


    console.log(`✅ Scraped ${events.length} events from Kensington Brewing Company`);
    return filterEvents(events);

  } catch (error) {
    console.log(`❌ Error scraping Kensington Brewing Company events: ${error.message}`);
    return [];
  }
}

module.exports = scrapeKensingtonBrewingCompanyEvents;
