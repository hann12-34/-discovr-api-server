const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeStPaulsBasilicaEvents(city) {
  console.log(`⛪ Scraping St. Paul's Basilica events for ${city}...`);
  
  try {
    const url = 'https://stpaulbasilica.archtoronto.org/events';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // Look for basilica events and services
    $('.event, [class*="event"], .mass, .service, .religious-event, .concert').each((index, element) => {
      const $event = $(element);
      
      const title = $event.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      
      if (title && title.length > 3 && title.length < 200) {
        const dateText = $event.find('.date, [class*="date"], time').text().trim();
        const description = $event.find('p, .description, [class*="desc"]').text().trim();
        
        events.push({
          title: title,
          date: dateText || 'Check schedule',
          venue: { name: 'St. Paul\'s Basilica', city: 'Toronto' },
          location: 'Toronto, ON',
          description: description && description.length > 20 ? description : `Religious service or event at St. Paul\`s Basilica',
          url: url,
          source: 'St. Paul\'s Basilica Website'
        });
      }
    });


    console.log(`✅ Scraped ${events.length} events from St. Paul's Basilica`);
    return filterEvents(events);

  } catch (error) {
    console.log(`❌ Error scraping St. Paul's Basilica events: ${error.message}`);
    return [];
  }
}

module.exports = scrapeStPaulsBasilicaEvents;
