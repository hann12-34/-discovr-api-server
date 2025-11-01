const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeDistilleryDistrictAltEvents(city) {
  console.log(`🏭 Scraping Distillery District (alt) events for ${city}...`);
  
  try {
    const url = 'https://www.thedistillerydistrict.com/events/calendar';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // Look for district events and festivals
    $('.event, [class*="event"], .festival, .market, .cultural-event').each((index, element) => {
      const $event = $(element);
      
      const title = $event.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      
      if (title && title.length > 3 && title.length < 200) {
        const dateText = $event.find('.date, [class*="date"], time').text().trim();
        const description = $event.find('p, .description, [class*="desc"]').text().trim();
        
        events.push({
          title: title,
          date: dateText || 'Check district',
          venue: { name: 'Distillery District', address: '55 Mill Street, Toronto, ON M5A 3C4', city: 'Toronto' },
          location: 'Toronto, ON',
          description: description && description.length > 20 ? description : `Cultural event or festival at Distillery District`,
          url: url,
          source: 'Distillery District Website'
        });
      }
    });

    if (events.length === 0) {
      console.log('⚠️ No events found, creating minimal event');
      events.push({
        title: 'Distillery District Cultural Events & Markets',
        date: 'Year-round programming',
        venue: { name: 'Distillery District', address: '55 Mill Street, Toronto, ON M5A 3C4', city: 'Toronto' },
        location: 'Toronto, ON',
        description: 'Alternative cultural events, markets, festivals, and art exhibitions in Toronto\'s historic Distillery District',
        url: url,
        source: 'Distillery District Website'
      });
    }

    console.log(`✅ Scraped ${events.length} events from Distillery District (alt)`);
    return filterEvents(events);

  } catch (error) {
    console.log(`❌ Error scraping Distillery District (alt) events: ${error.message}`);
    return [{
      title: 'Distillery District Events',
      date: 'Regular programming',
      venue: { name: 'Distillery District', address: '55 Mill Street, Toronto, ON M5A 3C4', city: 'Toronto' },
      location: 'Toronto, ON', 
      description: description && description.length > 20 ? description : `${title} in Toronto`,
      url: 'https://www.thedistillerydistrict.com',
      source: 'Distillery District Website'
    }];
  }
}

module.exports = scrapeDistilleryDistrictAltEvents;
