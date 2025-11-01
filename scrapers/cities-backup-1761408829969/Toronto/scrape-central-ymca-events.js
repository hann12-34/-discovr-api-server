const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeCentralYMCAEvents(city) {
  console.log(`🏊 Scraping Central YMCA events for ${city}...`);
  
  try {
    const url = 'https://ymcagta.org/find-a-y/central-ymca';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // Look for fitness and wellness events
    $('.event, [class*="event"], .program, .fitness, .wellness').each((index, element) => {
      const $event = $(element);
      
      const title = $event.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      
      if (title && title.length > 3 && title.length < 200) {
        const dateText = $event.find('.date, [class*="date"], time').text().trim();
        const description = $event.find('p, .description, [class*="desc"]').text().trim();
        
        events.push({
          title: title,
          date: dateText || 'Check YMCA',
          venue: { name: 'Central YMCA', city: 'Toronto' },
          location: 'Toronto, ON',
          description: description && description.length > 20 ? description : `Fitness or wellness program at Central YMCA`,
          url: url,
          source: 'YMCA GTA Website'
        });
      }
    });


    console.log(`✅ Scraped ${events.length} events from Central YMCA`);
    return filterEvents(events);

  } catch (error) {
    console.log(`❌ Error scraping Central YMCA events: ${error.message}`);
    return [];
  }
}

module.exports = scrapeCentralYMCAEvents;
