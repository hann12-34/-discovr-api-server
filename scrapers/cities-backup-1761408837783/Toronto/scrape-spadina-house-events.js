const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeSpadinaHouseEvents(city) {
  console.log(`🏛️ Scraping Spadina House events for ${city}...`);
  
  try {
    const url = 'https://www.toronto.ca/explore-enjoy/history-art-culture/museums/spadina-museum';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // Look for museum and historical events
    $('.event, [class*="event"], .museum-event, .historical, .tour').each((index, element) => {
      const $event = $(element);
      
      const title = $event.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      
      if (title && title.length > 3 && title.length < 200) {
        const dateText = $event.find('.date, [class*="date"], time').text().trim();
        const description = $event.find('p, .description, [class*="desc"]').text().trim();
        
        events.push({
          title: title,
          date: dateText || 'Check museum',
          venue: { name: 'Spadina House', address: 'Toronto', city: 'Toronto' },
          location: 'Toronto, ON',
          description: description && description.length > 20 ? description : `Historical museum event or guided tour at Spadina House`,
          url: url,
          source: 'City of Toronto Website'
        });
      }
    });


    console.log(`✅ Scraped ${events.length} events from Spadina House`);
    return filterEvents(events);

  } catch (error) {
    console.log(`❌ Error scraping Spadina House events: ${error.message}`);
    return [];
  }
}

module.exports = scrapeSpadinaHouseEvents;
