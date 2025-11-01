const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeCoronationParkEvents(city) {
  console.log(`👑 Scraping Coronation Park events for ${city}...`);
  
  try {
    const url = 'https://www.toronto.ca/explore-enjoy/parks-gardens-beaches/parks/coronation-park';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // Look for park and community events
    $('.event, [class*="event"], .park-event, .community, .outdoor').each((index, element) => {
      const $event = $(element);
      
      const title = $event.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      
      if (title && title.length > 3 && title.length < 200) {
        const dateText = $event.find('.date, [class*="date"], time').text().trim();
        const description = $event.find('p, .description, [class*="desc"]').text().trim();
        
        events.push({
          title: title,
          date: dateText || 'Check park',
          venue: { name: 'Coronation Park', address: 'Toronto', city: 'Toronto' },
          location: 'Toronto, ON',
          description: description && description.length > 20 ? description : `Community event or outdoor activity at Coronation Park`,
          url: url,
          source: 'City of Toronto Website'
        });
      }
    });


    console.log(`✅ Scraped ${events.length} events from Coronation Park`);
    return filterEvents(events);

  } catch (error) {
    console.log(`❌ Error scraping Coronation Park events: ${error.message}`);
    return [];
  }
}

module.exports = scrapeCoronationParkEvents;
