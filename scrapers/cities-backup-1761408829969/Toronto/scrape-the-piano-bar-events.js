const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeThePianoBarEvents(city) {
  console.log(`🎹 Scraping The Piano Bar events for ${city}...`);
  
  try {
    const url = 'https://thepianobar.ca/events';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // Look for piano bar and intimate music events
    $('.event, [class*="event"], .piano, .intimate, .music').each((index, element) => {
      const $event = $(element);
      
      const title = $event.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      
      if (title && title.length > 3 && title.length < 200) {
        const dateText = $event.find('.date, [class*="date"], time').text().trim();
        const description = $event.find('p, .description, [class*="desc"]').text().trim();
        
        events.push({
          title: title,
          date: dateText || 'Check venue',
          venue: { name: 'The Piano Bar', city: 'Toronto' },
          location: 'Toronto, ON',
          description: description && description.length > 20 ? description : `Piano bar and intimate music performance`,
          url: url,
          source: 'The Piano Bar Website'
        });
      }
    });


    console.log(`✅ Scraped ${events.length} events from The Piano Bar`);
    return filterEvents(events);

  } catch (error) {
    console.log(`❌ Error scraping The Piano Bar events: ${error.message}`);
    return [];
  }
}

module.exports = scrapeThePianoBarEvents;
