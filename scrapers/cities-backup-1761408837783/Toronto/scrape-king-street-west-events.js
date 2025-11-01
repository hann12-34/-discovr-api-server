const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeKingStreetWestEvents(city) {
  console.log(`👑 Scraping King Street West events for ${city}...`);
  
  try {
    const url = 'https://kingwestbia.ca/events';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // Look for events
    $('.event, [class*="event"], .program, .activity, .news-item').each((index, element) => {
      const $event = $(element);
      
      const title = $event.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      
      if (title && title.length > 3 && title.length < 200) {
        const dateText = $event.find('.date, [class*="date"], time').text().trim();
        const description = $event.find('p, .description, [class*="desc"]').text().trim();
        
        events.push({
          title: title,
          date: dateText || 'Check website',
          venue: { name: 'King Street West District', address: 'Toronto', city: 'Toronto' },
          location: 'Toronto, ON',
          description: description && description.length > 20 ? description : `Event in King Street West entertainment district`,
          url: url,
          source: 'King West BIA Website'
        });
      }
    });


    console.log(`✅ Scraped ${events.length} events from King Street West`);
    return filterEvents(events);

  } catch (error) {
    console.log(`❌ Error scraping King Street West events: ${error.message}`);
    return [];
  }
}

module.exports = scrapeKingStreetWestEvents;
