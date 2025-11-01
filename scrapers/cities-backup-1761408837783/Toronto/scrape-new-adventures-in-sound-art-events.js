const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeNewAdventuresInSoundArtEvents(city) {
  console.log(`🔊 Scraping New Adventures in Sound Art events for ${city}...`);
  
  try {
    const url = 'https://naisa.ca/events';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // Look for sound art and experimental audio events
    $('.event, [class*="event"], .sound-art, .experimental, .audio').each((index, element) => {
      const $event = $(element);
      
      const title = $event.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      
      if (title && title.length > 3 && title.length < 200) {
        const dateText = $event.find('.date, [class*="date"], time').text().trim();
        const description = $event.find('p, .description, [class*="desc"]').text().trim();
        
        events.push({
          title: title,
          date: dateText || 'Check venue',
          venue: { name: 'New Adventures in Sound Art (NAISA)', address: 'Toronto', city: 'Toronto' },
          location: 'Toronto, ON',
          description: description && description.length > 20 ? description : `Sound art and experimental audio event at NAISA`,
          url: url,
          source: 'NAISA Website'
        });
      }
    });


    console.log(`✅ Scraped ${events.length} events from New Adventures in Sound Art`);
    return filterEvents(events);

  } catch (error) {
    console.log(`❌ Error scraping New Adventures in Sound Art events: ${error.message}`);
    return [];
  }
}

module.exports = scrapeNewAdventuresInSoundArtEvents;
