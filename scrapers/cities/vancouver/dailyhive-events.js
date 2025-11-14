/**
 * Daily Hive Vancouver Events Scraper
 * Major Vancouver news/events site (formerly Vancity Buzz)
 * Covers nightlife, concerts, festivals, local events
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrape() {
  console.log('📰 Scraping Daily Hive Vancouver events...');
  
  try {
    const urls = [
      'https://dailyhive.com/vancouver/events',
      'https://dailyhive.com/vancouver/entertainment'
    ];
    
    const events = [];
    const seen = new Set(); // DUPLICATE PREVENTION
    
    for (const url of urls) {
      try {
        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
          },
          timeout: 15000
        });
        
        const $ = cheerio.load(response.data);
        
        $('article, .event, .post-item, [class*="card"]').each((i, el) => {
          const $el = $(el);
          
          const title = $el.find('h1, h2, h3, .title, [class*="title"]').first().text().trim();
          const venue = $el.find('.venue, .location').first().text().trim();
          
          // CAREFUL DATE EXTRACTION
          const dateEl = $el.find('time, .date, [datetime]').first();
          let dateText = dateEl.attr('datetime') || dateEl.text().trim();
          
          const linkEl = $el.find('a').first();
          const eventUrl = linkEl.attr('href');
          
          // ROBUST DATE PARSING
          let eventDate = null;
          if (dateText) {
            try {
              const parsed = new Date(dateText);
              if (!isNaN(parsed.getTime())) {
                eventDate = parsed.toISOString().split('T')[0]; // ISO: YYYY-MM-DD
              }
            } catch (e) {
              // Pattern fallback
              const match = dateText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\.?\\s+(\\d{1,2}),?\\s+(\\d{4})/i);
              if (match) {
                try {
                  eventDate = new Date(dateText).toISOString().split('T')[0];
                } catch (e2) {}
              }
            }
          }
          
          // VALIDATE before adding
          if (title && title.length > 3 && eventDate) {
            // DEDUPLICATION KEY
            const dedupeKey = `${title.toLowerCase().trim()}|${eventDate}`;
            
            if (!seen.has(dedupeKey)) {
              seen.add(dedupeKey);
              
              // Category detection
              let category = 'Events';
              const titleLower = title.toLowerCase();
              
              if (titleLower.includes('night') || titleLower.includes('club') || 
                  titleLower.includes('dj') || titleLower.includes('dance') ||
                  titleLower.includes('party')) {
                category = 'Nightlife';
              } else if (titleLower.includes('concert') || titleLower.includes('show')) {
                category = 'Concert';
              }
              
              events.push({
                id: uuidv4(),
                title: title,
                date: eventDate,
                url: eventUrl && eventUrl.startsWith('http') ? eventUrl : (eventUrl ? 'https://dailyhive.com' + eventUrl : 'https://dailyhive.com/vancouver'),
                venue: {
                  name: venue || 'TBA',
                  city: 'Vancouver'
                },
                location: 'Vancouver, BC',
                city: 'Vancouver',
                description: `${title} - Vancouver event`,
                category: category,
                source: 'Daily Hive'
              });
            }
          }
        });
      } catch (e) {
        console.error(`Error scraping ${url}:`, e.message);
      }
    }
    
    console.log(`✅ Daily Hive: ${events.length} events (${events.filter(e => e.category === 'Nightlife').length} nightlife)`);
    return events;
    
  } catch (error) {
    console.error('Error scraping Daily Hive:', error.message);
    return [];
  }
}

module.exports = scrape;
