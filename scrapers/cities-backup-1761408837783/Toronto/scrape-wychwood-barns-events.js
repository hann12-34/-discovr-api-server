const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeWychwoodBarnsEvents(city) {
  console.log(`🏚️ Scraping Wychwood Barns events for ${city}...`);
  
  try {
    const url = 'https://wychwoodbarns.ca/events';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // Look for community and cultural events
    $('.event, [class*="event"], .farmers-market, .community, .cultural').each((index, element) => {
      const $event = $(element);
      
      const title = $event.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      
      if (title && title.length > 3 && title.length < 200) {
        const dateText = $event.find('.date, [class*="date"], time').text().trim();
        const description = $event.find('p, .description, [class*="desc"]').text().trim();
        
        events.push({
          title: title,
          date: dateText || 'Check barns',
          venue: { name: 'Wychwood Barns', address: 'Toronto', city: 'Toronto' },
          location: 'Toronto, ON',
          description: description && description.length > 20 ? description : `Community or cultural event at Wychwood Barns`,
          url: url,
          source: 'Wychwood Barns Website'
        });
      }
    });


    console.log(`✅ Scraped ${events.length} events from Wychwood Barns`);
    return filterEvents(events);

  } catch (error) {
    console.log(`❌ Error scraping Wychwood Barns events: ${error.message}`);
    return [];
  }
}

module.exports = scrapeWychwoodBarnsEvents;
