const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeWaterfrontTrailEvents(city) {
  console.log(`🚴 Scraping Waterfront Trail events for ${city}...`);
  
  try {
    const url = 'https://www.toronto.ca/explore-enjoy/parks-gardens-beaches/waterfront-trail';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // Look for trail and outdoor events
    $('.event, [class*="event"], .trail-event, .outdoor, .cycling').each((index, element) => {
      const $event = $(element);
      
      const title = $event.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      
      if (title && title.length > 3 && title.length < 200) {
        const dateText = $event.find('.date, [class*="date"], time').text().trim();
        const description = $event.find('p, .description, [class*="desc"]').text().trim();
        
        events.push({
          title: title,
          date: dateText || 'Check trail',
          venue: { name: 'Waterfront Trail', city: 'Toronto' },
          location: 'Toronto, ON',
          description: description && description.length > 20 ? description : `Outdoor activity or event along Waterfront Trail`,
          url: url,
          source: 'City of Toronto Website'
        });
      }
    });


    console.log(`✅ Scraped ${events.length} events from Waterfront Trail`);
    return filterEvents(events);

  } catch (error) {
    console.log(`❌ Error scraping Waterfront Trail events: ${error.message}`);
    return [];
  }
}

module.exports = scrapeWaterfrontTrailEvents;
