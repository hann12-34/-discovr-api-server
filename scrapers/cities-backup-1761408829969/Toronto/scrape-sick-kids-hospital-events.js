const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeSickKidsHospitalEvents(city) {
  console.log(`🏥 Scraping Sick Kids Hospital events for ${city}...`);
  
  try {
    const url = 'https://www.sickkids.ca/en/events';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // Look for hospital events and family programs
    $('.event, [class*="event"], .program, .family-event, .education').each((index, element) => {
      const $event = $(element);
      
      const title = $event.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      
      if (title && title.length > 3 && title.length < 200) {
        const dateText = $event.find('.date, [class*="date"], time').text().trim();
        const description = $event.find('p, .description, [class*="desc"]').text().trim();
        
        events.push({
          title: title,
          date: dateText || 'Check website',
          venue: { name: 'The Hospital for Sick Children (SickKids)', city: 'Toronto' },
          location: 'Toronto, ON',
          description: description && description.length > 20 ? description : `Family and pediatric health event at SickKids Hospital`,
          url: url,
          source: 'SickKids Website'
        });
      }
    });


    console.log(`✅ Scraped ${events.length} events from SickKids Hospital`);
    return filterEvents(events);

  } catch (error) {
    console.log(`❌ Error scraping SickKids Hospital events: ${error.message}`);
    return [];
  }
}

module.exports = scrapeSickKidsHospitalEvents;
