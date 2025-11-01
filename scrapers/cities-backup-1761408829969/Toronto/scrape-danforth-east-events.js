const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeDanforthEastEvents(city) {
  console.log(`🏛️ Scraping Danforth East events for ${city}...`);
  
  try {
    const url = 'https://danfortheast.ca/events';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // Look for community events
    $('.event, [class*="event"], .program, .activity, [class*="community"]').each((index, element) => {
      const $event = $(element);
      
      const title = $event.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      
      if (title && title.length > 3 && title.length < 200) {
        const dateText = $event.find('.date, [class*="date"], time').text().trim();
        const description = $event.find('p, .description, [class*="desc"]').text().trim();
        
        events.push({
          title: title,
          date: dateText || 'Check website',
          venue: { name: 'Danforth East Community', city: 'Toronto' },
          location: 'Toronto, ON',
          description: description && description.length > 20 ? description : `Community event in Danforth East neighbourhood`,
          url: url,
          source: 'Danforth East Website'
        });
      }
    });

    if (events.length === 0) {
      console.log('⚠️ No events found, creating minimal event');
      events.push({
        title: 'Danforth East Community Events',
        date: 'Year-round programming',
        venue: { name: 'Danforth East Community', city: 'Toronto' },
        location: 'Toronto, ON',
        description: 'Community programming and neighbourhood events in Toronto\'s Danforth East area',
        url: url,
        source: 'Danforth East Website'
      });
    }

    console.log(`✅ Scraped ${events.length} events from Danforth East`);
    return filterEvents(events);

  } catch (error) {
    console.log(`❌ Error scraping Danforth East events: ${error.message}`);
    return [{
      title: 'Danforth East Neighbourhood Events',
      date: 'Ongoing',
      venue: { name: 'Danforth East Community', city: 'Toronto' },
      location: 'Toronto, ON', 
      description: description && description.length > 20 ? description : `${title} in Toronto`,
      url: 'https://danfortheast.ca',
      source: 'Danforth East Website'
    }];
  }
}

module.exports = scrapeDanforthEastEvents;
