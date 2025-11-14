/**
 * Bowery Ballroom Events Scraper
 * Historic Manhattan music venue
 * Category: Concert, Nightlife
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrape() {
  console.log('🎵 Scraping Bowery Ballroom events...');
  
  try {
    const response = await axios.get('https://mercuryeastpresents.com/calendar-bw/', {
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
      
      const title = $el.find('h1, h2, h3, .title, .artist, .headliner').first().text().trim();
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
          else if (imageUrl.startsWith('/')) imageUrl = 'https://mercuryeastpresents.com' + imageUrl;
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
            url: url && url.startsWith('http') ? url : (url ? 'https://www.boweryballroom.com' + url : 'https://www.boweryballroom.com'),
          imageUrl: imageUrl,
            venue: {
              name: 'Bowery Ballroom',
              address: '6 Delancey St, New York, NY 10002',
              city: 'New York'
            },
            location: 'Manhattan, NY',
            city: 'New York',
            description: `${title} at Bowery Ballroom`,
            category: category,
            source: 'Bowery Ballroom'
          });
        }
      }
    });
    
    console.log(`✅ Bowery Ballroom: ${events.length} events`);
    return events;
    
  } catch (error) {
    console.error(`Bowery Ballroom error: ${error.message}`);
    return [];
  }
}

module.exports = scrape;
