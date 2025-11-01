const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeTextileMuseumCanadaEvents(city) {
  console.log(`🧵 Scraping Textile Museum of Canada events for ${city}...`);
  
  try {
    const url = 'https://textilemuseum.ca/exhibitions';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // Look for exhibitions and events
    $('.exhibition, .event, [class*="exhibition"], [class*="event"], .program').each((index, element) => {
      const $event = $(element);
      
      const title = $event.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      
      if (title && title.length > 3 && title.length < 200) {
        const dateText = $event.find('.date, [class*="date"], time').text().trim();
        const description = $event.find('p, .description, [class*="desc"]').text().trim();
        
        events.push({
          title: title,
          date: dateText || 'Check website',
          venue: { name: 'Textile Museum of Canada', address: 'Toronto', city: 'Toronto' },
          location: 'Toronto, ON',
          description: description && description.length > 20 ? description : `Textile arts exhibition at TMC`,
          url: url,
          source: 'Textile Museum Website'
        });
      }
    });


    console.log(`✅ Scraped ${events.length} events from Textile Museum of Canada`);
    return filterEvents(events);

  } catch (error) {
    console.log(`❌ Error scraping Textile Museum events: ${error.message}`);
    return [];
  }
}

module.exports = scrapeTextileMuseumCanadaEvents;
