const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeJustinaBarnickeGalleryEvents(city) {
  console.log(`🖼️ Scraping Justina M. Barnicke Gallery events for ${city}...`);
  
  try {
    const url = 'https://jmbgallery.ca/exhibitions';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // Look for exhibitions and events
    $('.exhibition, .event, [class*="exhibition"], [class*="event"], .show').each((index, element) => {
      const $event = $(element);
      
      const title = $event.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      
      if (title && title.length > 3 && title.length < 200) {
        const dateText = $event.find('.date, [class*="date"], time').text().trim();
        const description = $event.find('p, .description, [class*="desc"]').text().trim();
        
        events.push({
          title: title,
          date: dateText || 'Check website',
          venue: { name: 'Justina M. Barnicke Gallery', city: 'Toronto' },
          location: 'Toronto, ON',
          description: description && description.length > 20 ? description : `Contemporary art exhibition at JMB Gallery`,
          url: url,
          source: 'JMB Gallery Website'
        });
      }
    });


    console.log(`✅ Scraped ${events.length} events from Justina M. Barnicke Gallery`);
    return filterEvents(events);

  } catch (error) {
    console.log(`❌ Error scraping JMB Gallery events: ${error.message}`);
    return [];
  }
}

module.exports = scrapeJustinaBarnickeGalleryEvents;
