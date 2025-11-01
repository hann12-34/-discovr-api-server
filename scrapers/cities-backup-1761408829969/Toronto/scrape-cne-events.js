const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeCNEEvents(city) {
  console.log(`🎡 Scraping Canadian National Exhibition events for ${city}...`);
  
  try {
    const url = 'https://theex.com';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // Look for events and shows
    $('.event, .show, [class*="event"], [class*="show"], .performance, .attraction').each((index, element) => {
      const $event = $(element);
      
      const title = $event.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      
      if (title && title.length > 3 && title.length < 200) {
        const dateText = $event.find('.date, [class*="date"], time').text().trim();
        const description = $event.find('p, .description, [class*="desc"]').text().trim();
        
        events.push({
          title: title,
          date: dateText || 'August 2024',
          venue: { name: 'Canadian National Exhibition', city: 'Toronto' },
          location: 'Toronto, ON',
          description: description && description.length > 20 ? description : `CNE attraction and entertainment`,
          url: url,
          source: 'CNE Website'
        });
      }
    });


    console.log(`✅ Scraped ${events.length} events from Canadian National Exhibition`);
    return filterEvents(events);

  } catch (error) {
    console.log(`❌ Error scraping CNE events: ${error.message}`);
    return [];
  }
}

module.exports = scrapeCNEEvents;
