const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeNeighbourhoodUnscriptedEvents(city) {
  console.log(`🎭 Scraping Neighbourhood Unscripted events for ${city}...`);
  
  try {
    const url = 'https://neighbourhoodunscripted.com';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // Look for shows and events
    $('.show, .event, [class*="show"], [class*="event"], .performance').each((index, element) => {
      const $event = $(element);
      
      const title = $event.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      
      if (title && title.length > 3 && title.length < 200) {
        const dateText = $event.find('.date, [class*="date"], time').text().trim();
        const description = $event.find('p, .description, [class*="desc"]').text().trim();
        
        events.push({
          title: title,
          date: dateText || 'Check website',
          venue: { name: 'Neighbourhood Unscripted', city: 'Toronto' },
          location: 'Toronto, ON',
          description: description && description.length > 20 ? description : `Live performance at Neighbourhood Unscripted`,
          url: url,
          source: 'Neighbourhood Unscripted Website'
        });
      }
    });


    console.log(`✅ Scraped ${events.length} events from Neighbourhood Unscripted`);
    return filterEvents(events);

  } catch (error) {
    console.log(`❌ Error scraping Neighbourhood Unscripted events: ${error.message}`);
    return [];
  }
}

module.exports = scrapeNeighbourhoodUnscriptedEvents;
