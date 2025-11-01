const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeFringeFestivalEvents(city) {
  console.log(`🎪 Scraping Toronto Fringe Festival events for ${city}...`);
  
  try {
    const url = 'https://fringetoronto.com/fringe-shows';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // Look for fringe theatre and independent shows
    $('.event, [class*="event"], .show, .fringe, .independent').each((index, element) => {
      const $event = $(element);
      
      const title = $event.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      
      if (title && title.length > 3 && title.length < 200) {
        const dateText = $event.find('.date, [class*="date"], time').text().trim();
        const description = $event.find('p, .description, [class*="desc"]').text().trim();
        
        events.push({
          title: title,
          date: dateText || 'Annual fringe festival',
          venue: { name: 'Toronto Fringe Festival', city: 'Toronto' },
          location: 'Toronto, ON',
          description: description && description.length > 20 ? description : `Independent fringe theatre show at Toronto Fringe Festival`,
          url: url,
          source: 'Toronto Fringe Festival Website'
        });
      }
    });


    console.log(`✅ Scraped ${events.length} events from Toronto Fringe Festival`);
    return filterEvents(events);

  } catch (error) {
    console.log(`❌ Error scraping Toronto Fringe Festival events: ${error.message}`);
    return [];
  }
}

module.exports = scrapeFringeFestivalEvents;
