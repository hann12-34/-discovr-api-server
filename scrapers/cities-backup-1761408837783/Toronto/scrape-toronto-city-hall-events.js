const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeTorontoCityHallEvents(city) {
  console.log(`🏛️ Scraping Toronto City Hall events for ${city}...`);
  
  try {
    const url = 'https://www.toronto.ca/city-government/accountability-operations-customer-service/city-administration/staff-directory-divisions-and-customer-service/city-clerks-office/council-committee-meetings';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // Look for city council meetings and civic events
    $('.event, [class*="event"], .meeting, .council, .committee').each((index, element) => {
      const $event = $(element);
      
      const title = $event.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      
      if (title && title.length > 3 && title.length < 200) {
        const dateText = $event.find('.date, [class*="date"], time').text().trim();
        const description = $event.find('p, .description, [class*="desc"]').text().trim();
        
        events.push({
          title: title,
          date: dateText || 'Check schedule',
          venue: { name: 'Toronto City Hall', address: 'Toronto', city: 'Toronto' },
          location: 'Toronto, ON',
          description: description && description.length > 20 ? description : `Municipal government meeting or civic event`,
          url: url,
          source: 'City of Toronto Website'
        });
      }
    });


    console.log(`✅ Scraped ${events.length} events from Toronto City Hall`);
    return filterEvents(events);

  } catch (error) {
    console.log(`❌ Error scraping Toronto City Hall events: ${error.message}`);
    return [];
  }
}

module.exports = scrapeTorontoCityHallEvents;
