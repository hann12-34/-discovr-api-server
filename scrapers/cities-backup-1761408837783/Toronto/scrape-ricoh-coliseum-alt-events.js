const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeRicohColiseumAltEvents(city) {
  console.log(`🏒 Scraping Ricoh Coliseum (alt) events for ${city}...`);
  
  try {
    const url = 'https://www.cocacolacoliseum.com/about';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // Look for alternative hockey and sports events
    $('.event, [class*="event"], .game, .hockey-event, .ricoh').each((index, element) => {
      const $event = $(element);
      
      const title = $event.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      
      if (title && title.length > 3 && title.length < 200) {
        const dateText = $event.find('.date, [class*="date"], time').text().trim();
        const description = $event.find('p, .description, [class*="desc"]').text().trim();
        
        events.push({
          title: title,
          date: dateText || 'Check venue',
          venue: { name: 'Ricoh Coliseum (Coca-Cola Coliseum)', address: 'Toronto', city: 'Toronto' },
          location: 'Toronto, ON',
          description: description && description.length > 20 ? description : `Hockey or sports event at Ricoh Coliseum`,
          url: url,
          source: 'Coca-Cola Coliseum Website'
        });
      }
    });


    console.log(`✅ Scraped ${events.length} events from Ricoh Coliseum (alt)`);
    return filterEvents(events);

  } catch (error) {
    console.log(`❌ Error scraping Ricoh Coliseum (alt) events: ${error.message}`);
    return [];
  }
}

module.exports = scrapeRicohColiseumAltEvents;
