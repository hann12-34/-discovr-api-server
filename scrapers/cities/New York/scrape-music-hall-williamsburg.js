/**
 * Music Hall of Williamsburg Events Scraper
 * Popular Brooklyn music venue
 * Category: Concert, Nightlife
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrape() {
  console.log('🎵 Scraping Music Hall of Williamsburg events...');
  
  try {
    const response = await axios.get('https://www.musichallofwilliamsburg.com/calendar/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      timeout: 15000
    });
    
    const $ = cheerio.load(response.data);
    const events = [];
    const seen = new Set();
    
    $('.event, article, .show, [class*="event"]').each((i, el) => {
      const $el = $(el);
      
      const title = $el.find('h1, h2, h3, .title, .artist').first().text().trim();
      const dateEl = $el.find('time, .date, [datetime]').first();
      const dateText = dateEl.attr('datetime') || dateEl.text().trim();
      const url = $el.find('a').first().attr('href');
      // Extract image
      const img = $event.find('img').first();
      let imageUrl = null;
      if (img.length) {
        imageUrl = img.attr('src') || img.attr('data-src') || img.attr('data-lazy-src');
        if (imageUrl && !imageUrl.startsWith('http')) {
          if (imageUrl.startsWith('//')) imageUrl = 'https:' + imageUrl;
          else if (imageUrl.startsWith('/')) imageUrl = 'https://www.musichallofwilliamsburg.com' + imageUrl;
        }
      }

      let eventDate = null;
      if (dateText) {
        try {
          const parsed = new Date(dateText);
          if (!isNaN(parsed.getTime())) {
            eventDate = parsed.toISOString().split('T')[0];
          }
        } catch (e) {
          const match = dateText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})/i);
          if (match) {
            try {
              eventDate = new Date(dateText).toISOString().split('T')[0];
            } catch (e2) {}
          }
        }
      }
      
      if (title && title.length > 3 && eventDate) {
        const dedupeKey = `${title.toLowerCase().trim()}|${eventDate}`;
        
        if (!seen.has(dedupeKey)) {
          seen.add(dedupeKey);
          
          let category = 'Concert';
          const titleLower = title.toLowerCase();
          if (titleLower.includes('dj') || titleLower.includes('night') || 
              titleLower.includes('dance')) {
            category = 'Nightlife';
          }
          
          events.push({
            id: uuidv4(),
            title: title,
            date: eventDate,
            url: url && url.startsWith('http') ? url : (url ? 'https://www.musichallofwilliamsburg.com' + url : 'https://www.musichallofwilliamsburg.com'),
          imageUrl: imageUrl,
            venue: {
              name: 'Music Hall of Williamsburg',
              address: '66 N 6th St, Brooklyn, NY 11249',
              city: 'New York'
            },
            location: 'Brooklyn, NY',
            city: 'New York',
            description: null,
            category: category,
            source: 'Music Hall of Williamsburg'
          });
        }
      }
    });
    
    console.log(`✅ Music Hall of Williamsburg: ${events.length} events`);
    return events;
    
  } catch (error) {
    console.error(`Music Hall of Williamsburg error: ${error.message}`);
    return [];
  }
}

module.exports = scrape;
