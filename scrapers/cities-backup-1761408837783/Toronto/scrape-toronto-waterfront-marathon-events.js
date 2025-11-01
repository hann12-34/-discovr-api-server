const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeTorontoWaterfrontMarathonEvents(city) {
  console.log(`🏃 Scraping Toronto Waterfront Marathon events for ${city}...`);
  
  try {
    const url = 'https://torontowaterfrontmarathon.com';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // Look for race events
    $('.event, [class*="event"], .race, [class*="race"], .marathon').each((index, element) => {
      const $event = $(element);
      
      const title = $event.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      
      if (title && title.length > 3 && title.length < 200) {
        const dateText = $event.find('.date, [class*="date"], time').text().trim();
        const description = $event.find('p, .description, [class*="desc"]').text().trim();
        
        events.push({
          title: title,
          date: dateText || 'Annual - October',
          venue: { name: 'Toronto Waterfront', address: 'Toronto', city: 'Toronto' },
          location: 'Toronto, ON',
          description: description && description.length > 20 ? description : `Running event at Toronto Waterfront Marathon`,
          url: url,
          source: 'Toronto Waterfront Marathon Website'
        });
      }
    });


    console.log(`✅ Scraped ${events.length} events from Toronto Waterfront Marathon`);
    return filterEvents(events);

  } catch (error) {
    console.log(`❌ Error scraping Toronto Waterfront Marathon events: ${error.message}`);
    return [];
  }
}

module.exports = scrapeTorontoWaterfrontMarathonEvents;
