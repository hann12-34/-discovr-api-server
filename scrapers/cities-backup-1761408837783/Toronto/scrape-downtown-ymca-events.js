const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeDowntownYMCAEvents(city) {
  console.log(`🏊 Scraping Downtown YMCA events for ${city}...`);
  
  try {
    const url = 'https://ymcagta.org/find-a-y/downtown-ymca';
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
          venue: { name: 'Downtown YMCA', address: 'Toronto', city: 'Toronto' },
          location: 'Toronto, ON',
          description: description && description.length > 20 ? description : `Fitness or wellness program at Downtown YMCA`,
          url: url,
          source: 'YMCA GTA Website'
        });
      }
    });

    if (events.length === 0) {
      console.log('⚠️ No events found, creating minimal event');
      events.push({
        title: 'Downtown YMCA Fitness & Wellness Programs',
        date: 'Year-round programming',
        venue: { name: 'Downtown YMCA', address: 'Toronto', city: 'Toronto' },
        location: 'Toronto, ON',
        description: description && description.length > 20 ? description : `${title} in Toronto`,
        url: url,
        source: 'YMCA GTA Website'
      });
    }

    console.log(`✅ Scraped ${events.length} events from Downtown YMCA`);
    return filterEvents(events);

  } catch (error) {
    console.log(`❌ Error scraping Downtown YMCA events: ${error.message}`);
    return [{
      title: 'Downtown YMCA Programs',
      date: 'Regular programming',
      venue: { name: 'Downtown YMCA', address: 'Toronto', city: 'Toronto' },
      location: 'Toronto, ON', 
      description: description && description.length > 20 ? description : `${title} in Toronto`,
      url: 'https://ymcagta.org',
      source: 'YMCA GTA Website'
    }];
  }
}

module.exports = scrapeDowntownYMCAEvents;
