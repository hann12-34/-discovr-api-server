const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeArtscapeDanielsLaunchpadEvents(city) {
  console.log(`🚀 Scraping Artscape Daniels Launchpad events for ${city}...`);
  
  try {
    const url = 'https://artscapedanielslaunchpad.ca/events';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // Look for creative and startup events
    $('.event, [class*="event"], .workshop, .program, .startup-event').each((index, element) => {
      const $event = $(element);
      
      const title = $event.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      
      if (title && title.length > 3 && title.length < 200) {
        const dateText = $event.find('.date, [class*="date"], time').text().trim();
        const description = $event.find('p, .description, [class*="desc"]').text().trim();
        
        events.push({
          title: title,
          date: dateText || 'Check website',
          venue: { name: 'Artscape Daniels Launchpad', address: 'Toronto', city: 'Toronto' },
          location: 'Toronto, ON',
          description: description && description.length > 20 ? description : `Creative entrepreneurship event at Daniels Launchpad`,
          url: url,
          source: 'Artscape Daniels Launchpad Website'
        });
      }
    });


    console.log(`✅ Scraped ${events.length} events from Artscape Daniels Launchpad`);
    return filterEvents(events);

  } catch (error) {
    console.log(`❌ Error scraping Artscape Daniels Launchpad events: ${error.message}`);
    return [];
  }
}

module.exports = scrapeArtscapeDanielsLaunchpadEvents;
