const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeHarbourfrontReadingSeriesEvents(city) {
  console.log(`📚 Scraping Harbourfront Reading Series events for ${city}...`);
  
  try {
    const url = 'https://readings.harbourfrontcentre.com';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // Look for reading events
    $('.event, [class*="event"], .reading, .author-event, .literary-event').each((index, element) => {
      const $event = $(element);
      
      const title = $event.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      
      if (title && title.length > 3 && title.length < 200) {
        const dateText = $event.find('.date, [class*="date"], time').text().trim();
        const description = $event.find('p, .description, [class*="desc"]').text().trim();
        
        events.push({
          title: title,
          date: dateText || 'Check schedule',
          venue: { name: 'Harbourfront Reading Series', address: 'Toronto', city: 'Toronto' },
          location: 'Toronto, ON',
          description: description && description.length > 20 ? description : `Literary reading at Harbourfront Centre`,
          url: url,
          source: 'Harbourfront Reading Series Website'
        });
      }
    });


    console.log(`✅ Scraped ${events.length} events from Harbourfront Reading Series`);
    return filterEvents(events);

  } catch (error) {
    console.log(`❌ Error scraping Harbourfront Reading Series events: ${error.message}`);
    return [];
  }
}

module.exports = scrapeHarbourfrontReadingSeriesEvents;
