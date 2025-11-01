const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeTarragonTheatreAltEvents(city) {
  console.log(`🎭 Scraping Tarragon Theatre (alt) events for ${city}...`);
  
  try {
    const url = 'https://tarragontheatre.com/season';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // Look for theatre productions and shows
    $('.event, [class*="event"], .show, .production, .season').each((index, element) => {
      const $event = $(element);
      
      const title = $event.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      
      if (title && title.length > 3 && title.length < 200) {
        const dateText = $event.find('.date, [class*="date"], time').text().trim();
        const description = $event.find('p, .description, [class*="desc"]').text().trim();
        
        events.push({
          title: title,
          date: dateText || 'Check theatre',
          venue: { name: 'Tarragon Theatre', city: 'Toronto' },
          location: 'Toronto, ON',
          description: description && description.length > 20 ? description : `Alternative theatre production at Tarragon Theatre`,
          url: url,
          source: 'Tarragon Theatre Website'
        });
      }
    });


    console.log(`✅ Scraped ${events.length} events from Tarragon Theatre (alt)`);
    return filterEvents(events);

  } catch (error) {
    console.log(`❌ Error scraping Tarragon Theatre (alt) events: ${error.message}`);
    return [];
  }
}

module.exports = scrapeTarragonTheatreAltEvents;
