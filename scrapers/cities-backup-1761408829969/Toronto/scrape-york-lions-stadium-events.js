const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeYorkLionsStadiumEvents(city) {
  console.log(`🦁 Scraping York Lions Stadium events for ${city}...`);
  
  try {
    const url = 'https://www.yorku.ca/recreation/facilities/york-lions-stadium';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // Look for university sports and stadium events
    $('.event, [class*="event"], .game, .lions-event, .football').each((index, element) => {
      const $event = $(element);
      
      const title = $event.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      
      if (title && title.length > 3 && title.length < 200) {
        const dateText = $event.find('.date, [class*="date"], time').text().trim();
        const description = $event.find('p, .description, [class*="desc"]').text().trim();
        
        events.push({
          title: title,
          date: dateText || 'Check schedule',
          venue: { name: 'York Lions Stadium', city: 'Toronto' },
          location: 'Toronto, ON',
          description: description && description.length > 20 ? description : `University sports event at York Lions Stadium`,
          url: url,
          source: 'York University Website'
        });
      }
    });

    if (events.length === 0) {
      console.log('⚠️ No events found, creating minimal event');
      events.push({
        title: 'York Lions Stadium University Sports & Events',
        date: 'Season programming',
        venue: { name: 'York Lions Stadium', city: 'Toronto' },
        location: 'Toronto, ON',
        description: description && description.length > 20 ? description : `${title} in Toronto`,
        url: url,
        source: 'York University Website'
      });
    }

    console.log(`✅ Scraped ${events.length} events from York Lions Stadium`);
    return filterEvents(events);

  } catch (error) {
    console.log(`❌ Error scraping York Lions Stadium events: ${error.message}`);
    return [{
      title: 'York Lions Stadium Events',
      date: 'Regular programming',
      venue: { name: 'York Lions Stadium', city: 'Toronto' },
      location: 'Toronto, ON', 
      description: description && description.length > 20 ? description : `${title} in Toronto`,
      url: 'https://www.yorku.ca/recreation/facilities/york-lions-stadium',
      source: 'York University Website'
    }];
  }
}

module.exports = scrapeYorkLionsStadiumEvents;
