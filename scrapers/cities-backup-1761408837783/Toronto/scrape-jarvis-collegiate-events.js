const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeJarvisCollegiateEvents(city) {
  console.log(`🎨 Scraping Jarvis Collegiate events for ${city}...`);
  
  try {
    const url = 'https://schoolweb.tdsb.on.ca/jarvis';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // Look for school and arts events
    $('.event, [class*="event"], .school-event, .arts, .performance').each((index, element) => {
      const $event = $(element);
      
      const title = $event.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      
      if (title && title.length > 3 && title.length < 200) {
        const dateText = $event.find('.date, [class*="date"], time').text().trim();
        const description = $event.find('p, .description, [class*="desc"]').text().trim();
        
        events.push({
          title: title,
          date: dateText || 'Check school',
          venue: { name: 'Jarvis Collegiate Institute', address: 'Toronto', city: 'Toronto' },
          location: 'Toronto, ON',
          description: description && description.length > 20 ? description : `Arts performance or school event at Jarvis Collegiate`,
          url: url,
          source: 'TDSB Website'
        });
      }
    });


    console.log(`✅ Scraped ${events.length} events from Jarvis Collegiate Institute`);
    return filterEvents(events);

  } catch (error) {
    console.log(`❌ Error scraping Jarvis Collegiate events: ${error.message}`);
    return [];
  }
}

module.exports = scrapeJarvisCollegiateEvents;
