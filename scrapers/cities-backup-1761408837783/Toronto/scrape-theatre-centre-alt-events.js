const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeTheatreCentreAltEvents(city) {
  console.log(`🎭 Scraping Theatre Centre (alt) events for ${city}...`);
  
  try {
    const url = 'https://www.theatrecentre.org/shows';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // Look for theatre and performance events
    $('.event, [class*="event"], .show, .performance, .theatre').each((index, element) => {
      const $event = $(element);
      
      const title = $event.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      
      if (title && title.length > 3 && title.length < 200) {
        const dateText = $event.find('.date, [class*="date"], time').text().trim();
        const description = $event.find('p, .description, [class*="desc"]').text().trim();
        
        events.push({
          title: title,
          date: dateText || 'Check theatre',
          venue: { name: 'Theatre Centre', address: 'Toronto', city: 'Toronto' },
          location: 'Toronto, ON',
          description: description && description.length > 20 ? description : `Alternative theatre performance at Theatre Centre`,
          url: url,
          source: 'Theatre Centre Website'
        });
      }
    });


    console.log(`✅ Scraped ${events.length} events from Theatre Centre (alt)`);
    return filterEvents(events);

  } catch (error) {
    console.log(`❌ Error scraping Theatre Centre (alt) events: ${error.message}`);
    return [];
  }
}

module.exports = scrapeTheatreCentreAltEvents;
