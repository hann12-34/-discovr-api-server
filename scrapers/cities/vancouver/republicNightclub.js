/**
 * Republic Nightclub Events Scraper
 * Vancouver's largest nightclub
 * Categories: Nightlife, EDM, Dance
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrape() {
  console.log('🎉 Scraping Republic Nightclub events...');
  
  try {
    const response = await axios.get('https://www.republicvancouver.com/events', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      timeout: 15000
    });
    
    const $ = cheerio.load(response.data);
    const events = [];
    const seen = new Set();
    
    $('article, .event, .show, [class*="event-item"], .eventlist-event').each((i, el) => {
      const $el = $(el);
      
      const title = $el.find('h1, h2, h3, .title, .event-title, .eventlist-title').first().text().trim();
      const link = $el.find('a').first();
      const url = link.attr('href');
      
      let dateText = $el.find('time, .date, .event-date, [datetime]').attr('datetime') || 
                     $el.find('time, .date, .event-date').text().trim();
      
      let eventDate = null;
      if (dateText) {
        try {
          const parsed = new Date(dateText);
          if (!isNaN(parsed.getTime())) {
            eventDate = parsed.toISOString().split('T')[0];
          }
        } catch (e) {
          // Try to match pattern like "Nov 15, 2025"
          const match = dateText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})/i);
          if (match) {
            const parsed = new Date(dateText);
            if (!isNaN(parsed.getTime())) {
              eventDate = parsed.toISOString().split('T')[0];
            }
          }
        }
      }
      
      if (title && title.length > 2 && eventDate && !seen.has(title + eventDate)) {
        seen.add(title + eventDate);
        
        events.push({
          id: uuidv4(),
          title: title,
          date: eventDate,
          url: url && url.startsWith('http') ? url : (url ? 'https://www.republicvancouver.com' + url : 'https://www.republicvancouver.com'),
          venue: {
            name: 'Republic Nightclub',
            address: '958 Granville St, Vancouver, BC V6Z 1L2',
            city: 'Vancouver'
          },
          location: 'Vancouver, BC',
          city: 'Vancouver',
          description: null,
          category: 'Nightlife',
          source: 'Republic Nightclub'
        });
      }
    });
    
    console.log(`✅ Republic Nightclub: ${events.length} events`);
    return events;
    
  } catch (error) {
    console.error('Error scraping Republic Nightclub:', error.message);
    return [];
  }
}

module.exports = scrape;
