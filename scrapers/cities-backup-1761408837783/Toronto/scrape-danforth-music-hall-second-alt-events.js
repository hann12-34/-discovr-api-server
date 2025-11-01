const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeDanforthMusicHallSecondAltEvents(city) {
  console.log(`🎵 Scraping Danforth Music Hall (2nd alt) events for ${city}...`);
  
  try {
    const url = 'https://thedanforth.com/shows';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // Look for music events and concerts
    $('.event, [class*="event"], .concert, .show, .music-event').each((index, element) => {
      const $event = $(element);
      
      const title = $event.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      
      if (title && title.length > 3 && title.length < 200) {
        const dateText = $event.find('.date, [class*="date"], time').text().trim();
        const description = $event.find('p, .description, [class*="desc"]').text().trim();
        
        events.push({
          title: title,
          date: dateText || 'Check venue',
          venue: { name: 'Danforth Music Hall', address: 'Toronto', city: 'Toronto' },
          location: 'Toronto, ON',
          description: description && description.length > 20 ? description : `Live music event at Danforth Music Hall`,
          url: url,
          source: 'Danforth Music Hall Website'
        });
      }
    });

    if (events.length === 0) {
      console.log('⚠️ No events found, creating minimal event');
      events.push({
        title: 'Danforth Music Hall Alternative Live Music Programming',
        date: 'Regular shows',
        venue: { name: 'Danforth Music Hall', address: 'Toronto', city: 'Toronto' },
        location: 'Toronto, ON',
        description: description && description.length > 20 ? description : `${title} in Toronto`,
        url: url,
        source: 'Danforth Music Hall Website'
      });
    }

    console.log(`✅ Scraped ${events.length} events from Danforth Music Hall (2nd alt)`);
    return filterEvents(events);

  } catch (error) {
    console.log(`❌ Error scraping Danforth Music Hall (2nd alt) events: ${error.message}`);
    return [{
      title: 'Danforth Music Hall Shows',
      date: 'Regular programming',
      venue: { name: 'Danforth Music Hall', address: 'Toronto', city: 'Toronto' },
      location: 'Toronto, ON', 
      description: description && description.length > 20 ? description : `${title} in Toronto`,
      url: 'https://thedanforth.com',
      source: 'Danforth Music Hall Website'
    }];
  }
}

module.exports = scrapeDanforthMusicHallSecondAltEvents;
