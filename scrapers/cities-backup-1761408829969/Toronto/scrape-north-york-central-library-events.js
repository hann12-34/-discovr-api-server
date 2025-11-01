const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeNorthYorkCentralLibraryEvents(city) {
  console.log(`📚 Scraping North York Central Library events for ${city}...`);
  
  try {
    const url = 'https://www.torontopubliclibrary.ca/programs-and-classes/';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // Look for library programs and community events
    $('.event, [class*="event"], .program, .library-event, .workshop').each((index, element) => {
      const $event = $(element);
      
      const title = $event.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      
      if (title && title.length > 3 && title.length < 200) {
        const dateText = $event.find('.date, [class*="date"], time').text().trim();
        const description = $event.find('p, .description, [class*="desc"]').text().trim();
        
        events.push({
          title: title,
          date: dateText || 'Check library',
          venue: { name: 'North York Central Library', city: 'Toronto' },
          location: 'Toronto, ON',
          description: description && description.length > 20 ? description : `Community program or workshop at North York Central Library`,
          url: url,
          source: 'Toronto Public Library Website'
        });
      }
    });


    console.log(`✅ Scraped ${events.length} events from North York Central Library`);
    return filterEvents(events);

  } catch (error) {
    console.log(`❌ Error scraping North York Central Library events: ${error.message}`);
    return [];
  }
}

module.exports = scrapeNorthYorkCentralLibraryEvents;
