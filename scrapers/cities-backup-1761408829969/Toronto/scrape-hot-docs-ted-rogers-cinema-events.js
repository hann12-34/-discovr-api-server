const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeHotDocsTedRogersCinemaEvents(city) {
  console.log(`🎬 Scraping Hot Docs Ted Rogers Cinema events for ${city}...`);
  
  try {
    const url = 'https://hotdocs.ca/whats-on';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // Look for documentary screenings and events
    $('.event, [class*="event"], .screening, .documentary, .film-event').each((index, element) => {
      const $event = $(element);
      
      const title = $event.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      
      if (title && title.length > 3 && title.length < 200) {
        const dateText = $event.find('.date, [class*="date"], time').text().trim();
        const description = $event.find('p, .description, [class*="desc"]').text().trim();
        
        events.push({
          title: title,
          date: dateText || 'Check cinema',
          venue: { name: 'Hot Docs Ted Rogers Cinema', city: 'Toronto' },
          location: 'Toronto, ON',
          description: description && description.length > 20 ? description : `Documentary screening or event at Hot Docs Ted Rogers Cinema`,
          url: url,
          source: 'Hot Docs Website'
        });
      }
    });


    console.log(`✅ Scraped ${events.length} events from Hot Docs Ted Rogers Cinema`);
    return filterEvents(events);

  } catch (error) {
    console.log(`❌ Error scraping Hot Docs Ted Rogers Cinema events: ${error.message}`);
    return [];
  }
}

module.exports = scrapeHotDocsTedRogersCinemaEvents;
