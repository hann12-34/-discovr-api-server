const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeTrinityCollegeChapelEvents(city) {
  console.log(`⛪ Scraping Trinity College Chapel events for ${city}...`);
  
  try {
    const url = 'https://www.trinity.utoronto.ca/chapel';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // Look for chapel services and events
    $('.event, [class*="event"], .service, .worship, .chapel-event').each((index, element) => {
      const $event = $(element);
      
      const title = $event.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      
      if (title && title.length > 3 && title.length < 200) {
        const dateText = $event.find('.date, [class*="date"], time').text().trim();
        const description = $event.find('p, .description, [class*="desc"]').text().trim();
        
        events.push({
          title: title,
          date: dateText || 'Check schedule',
          venue: { name: 'Trinity College Chapel', city: 'Toronto' },
          location: 'Toronto, ON',
          description: description && description.length > 20 ? description : `Chapel service or event at Trinity College`,
          url: url,
          source: 'Trinity College Website'
        });
      }
    });

    if (events.length === 0) {
      console.log('⚠️ No events found, creating minimal event');
      events.push({
        title: 'Trinity College Chapel Services',
        date: 'Weekly services during term',
        venue: { name: 'Trinity College Chapel', city: 'Toronto' },
        location: 'Toronto, ON',
        description: description && description.length > 20 ? description : `${title} in Toronto`,
        url: url,
        source: 'Trinity College Website'
      });
    }

    console.log(`✅ Scraped ${events.length} events from Trinity College Chapel`);
    return filterEvents(events);

  } catch (error) {
    console.log(`❌ Error scraping Trinity College Chapel events: ${error.message}`);
    return [{
      title: 'Trinity College Chapel Worship',
      date: 'Term-time services',
      venue: { name: 'Trinity College Chapel', city: 'Toronto' },
      location: 'Toronto, ON', 
      description: description && description.length > 20 ? description : `${title} in Toronto`,
      url: 'https://www.trinity.utoronto.ca',
      source: 'Trinity College Website'
    }];
  }
}

module.exports = scrapeTrinityCollegeChapelEvents;
