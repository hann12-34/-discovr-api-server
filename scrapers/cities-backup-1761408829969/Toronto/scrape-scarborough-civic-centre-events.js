const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeScarboroughCivicCentreEvents(city) {
  console.log(`🏛️ Scraping Scarborough Civic Centre events for ${city}...`);
  
  try {
    const url = 'https://www.toronto.ca/city-government/accountability-operations-customer-service/city-administration/staff-directory-divisions-and-customer-service/customer-service/district-offices/scarborough-district';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // Look for civic events and community programs
    $('.event, [class*="event"], .program, .civic-event, .community').each((index, element) => {
      const $event = $(element);
      
      const title = $event.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      
      if (title && title.length > 3 && title.length < 200) {
        const dateText = $event.find('.date, [class*="date"], time').text().trim();
        const description = $event.find('p, .description, [class*="desc"]').text().trim();
        
        events.push({
          title: title,
          date: dateText || 'Check civic centre',
          venue: { name: 'Scarborough Civic Centre', city: 'Toronto' },
          location: 'Toronto, ON',
          description: description && description.length > 20 ? description : `Community event or civic program at Scarborough Civic Centre`,
          url: url,
          source: 'City of Toronto Website'
        });
      }
    });


    console.log(`✅ Scraped ${events.length} events from Scarborough Civic Centre`);
    return filterEvents(events);

  } catch (error) {
    console.log(`❌ Error scraping Scarborough Civic Centre events: ${error.message}`);
    return [];
  }
}

module.exports = scrapeScarboroughCivicCentreEvents;
