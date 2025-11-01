const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeTorontoOutdoorArtFairEvents(city) {
  console.log(`🎨 Scraping Toronto Outdoor Art Fair events for ${city}...`);
  
  try {
    const url = 'https://torontooutdoorart.org/fair';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // Look for outdoor art fair and exhibition events
    $('.event, [class*="event"], .fair, .exhibition, .outdoor').each((index, element) => {
      const $event = $(element);
      
      const title = $event.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      
      if (title && title.length > 3 && title.length < 200) {
        const dateText = $event.find('.date, [class*="date"], time').text().trim();
        const description = $event.find('p, .description, [class*="desc"]').text().trim();
        
        events.push({
          title: title,
          date: dateText || 'Annual summer fair',
          venue: { name: 'Toronto Outdoor Art Fair', address: 'Toronto', city: 'Toronto' },
          location: 'Toronto, ON',
          description: description && description.length > 20 ? description : `Outdoor art exhibition and artist fair`,
          url: url,
          source: 'Toronto Outdoor Art Fair Website'
        });
      }
    });


    console.log(`✅ Scraped ${events.length} events from Toronto Outdoor Art Fair`);
    return filterEvents(events);

  } catch (error) {
    console.log(`❌ Error scraping Toronto Outdoor Art Fair events: ${error.message}`);
    return [];
  }
}

module.exports = scrapeTorontoOutdoorArtFairEvents;
