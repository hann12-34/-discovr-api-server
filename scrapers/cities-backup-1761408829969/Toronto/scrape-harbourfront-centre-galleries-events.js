const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeHarbourfrontCentreGalleriesEvents(city) {
  console.log(`🖼️ Scraping Harbourfront Centre Galleries events for ${city}...`);
  
  try {
    const url = 'https://harbourfrontcentre.com/visual-arts/galleries';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // Look for visual arts and gallery events
    $('.event, [class*="event"], .exhibition, .gallery, .visual-arts').each((index, element) => {
      const $event = $(element);
      
      const title = $event.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      
      if (title && title.length > 3 && title.length < 200) {
        const dateText = $event.find('.date, [class*="date"], time').text().trim();
        const description = $event.find('p, .description, [class*="desc"]').text().trim();
        
        events.push({
          title: title,
          date: dateText || 'Check galleries',
          venue: { name: 'Harbourfront Centre Galleries', city: 'Toronto' },
          location: 'Toronto, ON',
          description: description && description.length > 20 ? description : `Visual arts exhibition or gallery event at Harbourfront Centre`,
          url: url,
          source: 'Harbourfront Centre Website'
        });
      }
    });


    console.log(`✅ Scraped ${events.length} events from Harbourfront Centre Galleries`);
    return filterEvents(events);

  } catch (error) {
    console.log(`❌ Error scraping Harbourfront Centre Galleries events: ${error.message}`);
    return [];
  }
}

module.exports = scrapeHarbourfrontCentreGalleriesEvents;
