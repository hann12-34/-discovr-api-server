const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeAlexandraParkCommunitycentreEvents(city) {
  console.log(`🏢 Scraping Alexandra Park Community Centre events for ${city}...`);
  
  try {
    const url = 'https://www.toronto.ca/explore-enjoy/recreation/community-centres/alexandra-park-community-centre';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // Look for community centre events
    $('.event, [class*="event"], .program, .community, .recreation').each((index, element) => {
      const $event = $(element);
      
      const title = $event.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      
      if (title && title.length > 3 && title.length < 200) {
        const dateText = $event.find('.date, [class*="date"], time').text().trim();
        const description = $event.find('p, .description, [class*="desc"]').text().trim();
        
        events.push({
          title: title,
          date: dateText || 'Check centre',
          venue: { name: 'Alexandra Park Community Centre', city: 'Toronto' },
          location: 'Toronto, ON',
          description: description && description.length > 20 ? description : `Community program or recreation event at Alexandra Park Community Centre`,
          url: url,
          source: 'City of Toronto Website'
        });
      }
    });


    console.log(`✅ Scraped ${events.length} events from Alexandra Park Community Centre`);
    return filterEvents(events);

  } catch (error) {
    console.log(`❌ Error scraping Alexandra Park Community Centre events: ${error.message}`);
    return [];
  }
}

module.exports = scrapeAlexandraParkCommunitycentreEvents;
