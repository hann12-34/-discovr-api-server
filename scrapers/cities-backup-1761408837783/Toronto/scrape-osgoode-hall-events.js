const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeOsgoodeHallEvents(city) {
  console.log(`⚖️ Scraping Osgoode Hall events for ${city}...`);
  
  try {
    const url = 'https://www.lsuc.on.ca/osgoode-hall';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // Look for legal events and tours
    $('.event, [class*="event"], .tour, .legal-event, .ceremony').each((index, element) => {
      const $event = $(element);
      
      const title = $event.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      
      if (title && title.length > 3 && title.length < 200) {
        const dateText = $event.find('.date, [class*="date"], time').text().trim();
        const description = $event.find('p, .description, [class*="desc"]').text().trim();
        
        events.push({
          title: title,
          date: dateText || 'Check schedule',
          venue: { name: 'Osgoode Hall', address: 'Toronto', city: 'Toronto' },
          location: 'Toronto, ON',
          description: description && description.length > 20 ? description : `Legal ceremony or tour at historic Osgoode Hall`,
          url: url,
          source: 'Law Society of Ontario Website'
        });
      }
    });


    console.log(`✅ Scraped ${events.length} events from Osgoode Hall`);
    return filterEvents(events);

  } catch (error) {
    console.log(`❌ Error scraping Osgoode Hall events: ${error.message}`);
    return [];
  }
}

module.exports = scrapeOsgoodeHallEvents;
