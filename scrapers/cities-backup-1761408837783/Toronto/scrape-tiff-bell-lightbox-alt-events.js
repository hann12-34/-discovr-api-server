const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeTIFFBellLightboxAltEvents(city) {
  console.log(`🎬 Scraping TIFF Bell Lightbox (alt) events for ${city}...`);
  
  try {
    const url = 'https://www.tiff.net/events';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // Look for film events and screenings
    $('.event, [class*="event"], .screening, .film-event, .festival').each((index, element) => {
      const $event = $(element);
      
      const title = $event.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      
      if (title && title.length > 3 && title.length < 200) {
        const dateText = $event.find('.date, [class*="date"], time').text().trim();
        const description = $event.find('p, .description, [class*="desc"]').text().trim();
        
        events.push({
          title: title,
          date: dateText || 'Check TIFF',
          venue: { name: 'TIFF Bell Lightbox', address: 'Toronto', city: 'Toronto' },
          location: 'Toronto, ON',
          description: description && description.length > 20 ? description : `Film screening or cinema event at TIFF Bell Lightbox`,
          url: url,
          source: 'TIFF Website'
        });
      }
    });


    console.log(`✅ Scraped ${events.length} events from TIFF Bell Lightbox (alt)`);
    return filterEvents(events);

  } catch (error) {
    console.log(`❌ Error scraping TIFF Bell Lightbox (alt) events: ${error.message}`);
    return [];
  }
}

module.exports = scrapeTIFFBellLightboxAltEvents;
