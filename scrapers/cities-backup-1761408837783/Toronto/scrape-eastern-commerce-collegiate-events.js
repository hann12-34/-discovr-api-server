const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeEasternCommerceCollegiateEvents(city) {
  console.log(`🏢 Scraping Eastern Commerce Collegiate events for ${city}...`);
  
  try {
    const url = 'https://schoolweb.tdsb.on.ca/easterncommerce';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // Look for school and business events
    $('.event, [class*="event"], .school-event, .business, .commerce').each((index, element) => {
      const $event = $(element);
      
      const title = $event.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      
      if (title && title.length > 3 && title.length < 200) {
        const dateText = $event.find('.date, [class*="date"], time').text().trim();
        const description = $event.find('p, .description, [class*="desc"]').text().trim();
        
        events.push({
          title: title,
          date: dateText || 'Check school',
          venue: { name: 'Eastern Commerce Collegiate Institute', address: 'Toronto', city: 'Toronto' },
          location: 'Toronto, ON',
          description: description && description.length > 20 ? description : `Business or commerce event at Eastern Commerce Collegiate`,
          url: url,
          source: 'TDSB Website'
        });
      }
    });


    console.log(`✅ Scraped ${events.length} events from Eastern Commerce Collegiate Institute`);
    return filterEvents(events);

  } catch (error) {
    console.log(`❌ Error scraping Eastern Commerce Collegiate events: ${error.message}`);
    return [];
  }
}

module.exports = scrapeEasternCommerceCollegiateEvents;
