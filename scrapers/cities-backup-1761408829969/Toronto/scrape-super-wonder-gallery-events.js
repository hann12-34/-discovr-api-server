const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeSuperWonderGalleryEvents(city) {
  console.log(`✨ Scraping Super Wonder Gallery events for ${city}...`);
  
  try {
    const url = 'https://superwondergallery.com/events';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // Look for art gallery and exhibition events
    $('.event, [class*="event"], .exhibition, .art, .gallery').each((index, element) => {
      const $event = $(element);
      
      const title = $event.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      
      if (title && title.length > 3 && title.length < 200) {
        const dateText = $event.find('.date, [class*="date"], time').text().trim();
        const description = $event.find('p, .description, [class*="desc"]').text().trim();
        
        events.push({
          title: title,
          date: dateText || 'Check gallery',
          venue: { name: 'Super Wonder Gallery', city: 'Toronto' },
          location: 'Toronto, ON',
          description: description && description.length > 20 ? description : `Art exhibition or gallery event at Super Wonder Gallery`,
          url: url,
          source: 'Super Wonder Gallery Website'
        });
      }
    });


    console.log(`✅ Scraped ${events.length} events from Super Wonder Gallery`);
    return filterEvents(events);

  } catch (error) {
    console.log(`❌ Error scraping Super Wonder Gallery events: ${error.message}`);
    return [];
  }
}

module.exports = scrapeSuperWonderGalleryEvents;
