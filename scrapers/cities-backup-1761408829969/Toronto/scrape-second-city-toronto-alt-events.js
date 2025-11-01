const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeSecondCityTorontoAltEvents(city) {
  console.log(`😄 Scraping Second City Toronto (alt) events for ${city}...`);
  
  try {
    const url = 'https://www.secondcity.com/shows/toronto';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // Look for comedy shows and improv events
    $('.event, [class*="event"], .show, .comedy, .improv').each((index, element) => {
      const $event = $(element);
      
      const title = $event.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      
      if (title && title.length > 3 && title.length < 200) {
        const dateText = $event.find('.date, [class*="date"], time').text().trim();
        const description = $event.find('p, .description, [class*="desc"]').text().trim();
        
        events.push({
          title: title,
          date: dateText || 'Check venue',
          venue: { name: 'Second City Toronto', city: 'Toronto' },
          location: 'Toronto, ON',
          description: description && description.length > 20 ? description : `Alternative comedy show or improv performance at Second City Toronto`,
          url: url,
          source: 'Second City Website'
        });
      }
    });


    console.log(`✅ Scraped ${events.length} events from Second City Toronto (alt)`);
    return filterEvents(events);

  } catch (error) {
    console.log(`❌ Error scraping Second City Toronto (alt) events: ${error.message}`);
    return [];
  }
}

module.exports = scrapeSecondCityTorontoAltEvents;
