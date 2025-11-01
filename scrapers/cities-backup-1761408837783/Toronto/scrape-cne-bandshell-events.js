const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeCNEBandshellEvents(city) {
  console.log(`🎪 Scraping CNE Bandshell events for ${city}...`);
  
  try {
    const url = 'https://theex.com/entertainment/bandshell';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // Look for outdoor concert and festival events
    $('.event, [class*="event"], .concert, .show, .bandshell').each((index, element) => {
      const $event = $(element);
      
      const title = $event.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      
      if (title && title.length > 3 && title.length < 200) {
        const dateText = $event.find('.date, [class*="date"], time').text().trim();
        const description = $event.find('p, .description, [class*="desc"]').text().trim();
        
        events.push({
          title: title,
          date: dateText || 'Check CNE schedule',
          venue: { name: 'CNE Bandshell', address: 'Toronto', city: 'Toronto' },
          location: 'Toronto, ON',
          description: description && description.length > 20 ? description : `Outdoor concert or show at CNE Bandshell`,
          url: url,
          source: 'CNE Website'
        });
      }
    });


    console.log(`✅ Scraped ${events.length} events from CNE Bandshell`);
    return filterEvents(events);

  } catch (error) {
    console.log(`❌ Error scraping CNE Bandshell events: ${error.message}`);
    return [];
  }
}

module.exports = scrapeCNEBandshellEvents;
