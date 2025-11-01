const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeMusicGalleryAltEvents(city) {
  console.log(`🎼 Scraping Music Gallery (alt) events for ${city}...`);
  
  try {
    const url = 'https://musicgallery.org/concerts';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // Look for experimental and contemporary music events
    $('.event, [class*="event"], .concert, .experimental, .new-music').each((index, element) => {
      const $event = $(element);
      
      const title = $event.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      
      if (title && title.length > 3 && title.length < 200) {
        const dateText = $event.find('.date, [class*="date"], time').text().trim();
        const description = $event.find('p, .description, [class*="desc"]').text().trim();
        
        events.push({
          title: title,
          date: dateText || 'Check gallery',
          venue: { name: 'Music Gallery', city: 'Toronto' },
          location: 'Toronto, ON',
          description: description && description.length > 20 ? description : `Alternative experimental music concert at Music Gallery`,
          url: url,
          source: 'Music Gallery Website'
        });
      }
    });


    console.log(`✅ Scraped ${events.length} events from Music Gallery (alt)`);
    return filterEvents(events);

  } catch (error) {
    console.log(`❌ Error scraping Music Gallery (alt) events: ${error.message}`);
    return [];
  }
}

module.exports = scrapeMusicGalleryAltEvents;
