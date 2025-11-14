/**
 * Time Out New York Nightlife Events Scraper
 * NYC events and culture magazine - nightlife section
 * NOT a competitor - this is a media publication
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrape() {
  console.log('📰 Scraping Time Out NYC nightlife events...');
  
  try {
    // Try both nightlife and music/clubs sections
    const urls = [
      'https://www.timeout.com/newyork/nightlife',
      'https://www.timeout.com/newyork/clubs'
    ];
    
    const events = [];
    const seen = new Set();
    
    for (const url of urls) {
      try {
        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
          },
          timeout: 15000
        });
        
        const $ = cheerio.load(response.data);
        
        $('article, .event-item, [class*="listing"], [class*="card"]').each((i, el) => {
          const $el = $(el);
          
          const title = $el.find('h1, h2, h3, .title, [class*="title"]').first().text().trim();
          const venue = $el.find('.venue, .location, [class*="venue"]').first().text().trim();
          const dateText = $el.find('time, .date, [datetime]').attr('datetime') || 
                           $el.find('time, .date').text().trim();
          const url = $el.find('a').first().attr('href');
      // Extract image
      const img = $event.find('img').first();
      let imageUrl = null;
      if (img.length) {
        imageUrl = img.attr('src') || img.attr('data-src') || img.attr('data-lazy-src');
        if (imageUrl && !imageUrl.startsWith('http')) {
          if (imageUrl.startsWith('//')) imageUrl = 'https:' + imageUrl;
          else if (imageUrl.startsWith('/')) imageUrl = '' + imageUrl;
        }
      }

          let eventDate = null;
          if (dateText) {
            try {
              const parsed = new Date(dateText);
              if (!isNaN(parsed.getTime())) {
                eventDate = parsed.toISOString().split('T')[0];
              }
            } catch (e) {}
          }
          
          if (title && title.length > 2 && eventDate && !seen.has(title + eventDate)) {
            seen.add(title + eventDate);
            
            events.push({
              id: uuidv4(),
              title: title,
              date: eventDate,
              url: url && url.startsWith('http') ? url : (url ? 'https://www.timeout.com' + url : 'https://www.timeout.com/newyork'),
          imageUrl: imageUrl,
              venue: {
                name: venue || 'TBA',
                city: 'New York'
              },
              location: 'New York, NY',
              city: 'New York',
              description: `${title} - NYC nightlife event`,
              category: 'Nightlife',
              source: 'Time Out NYC'
            });
          }
        });
      } catch (e) {
        console.error(`Error scraping ${url}:`, e.message);
      }
    }
    
    console.log(`✅ Time Out NYC: ${events.length} events`);
    return events;
    
  } catch (error) {
    console.error('Error scraping Time Out NYC:', error.message);
    return [];
  }
}

module.exports = scrape;
