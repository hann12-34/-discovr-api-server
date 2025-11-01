const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeArrayMusicEvents(city) {
  console.log(`🎼 Scraping Array Music events for ${city}...`);
  
  try {
    const url = 'https://arraymusic.com/concerts';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // Look for new music and contemporary classical events
    $('.event, [class*="event"], .concert, .new-music, .contemporary').each((index, element) => {
      const $event = $(element);
      
      const title = $event.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      
      if (title && title.length > 3 && title.length < 200) {
        const dateText = $event.find('.date, [class*="date"], time').text().trim();
        const description = $event.find('p, .description, [class*="desc"]').text().trim();
        
        events.push({
          title: title,
          date: dateText || 'Check venue',
          venue: { name: 'Array Music', city: 'Toronto' },
          location: 'Toronto, ON',
          description: description && description.length > 20 ? description : `New music and contemporary classical concert by Array Music`,
          url: url,
          source: 'Array Music Website'
        });
      }
    });

    console.log(`✅ Scraped ${events.length} events from Array Music`);
    return filterEvents(events);

  } catch (error) {
    console.log(`❌ Error scraping Array Music events: ${error.message}`);
    return [];
  }
}

module.exports = scrapeArrayMusicEvents;
