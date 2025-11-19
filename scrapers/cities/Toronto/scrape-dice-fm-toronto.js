/**
 * Dice.fm Toronto Scraper
 * Popular platform for electronic music and nightlife events
 * URL: https://dice.fm/city/toronto
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrape(city = 'Toronto') {
  console.log('🎲 Scraping Dice.fm Toronto events...');
  
  try {
    const response = await axios.get('https://dice.fm/city/toronto', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml'
      },
      timeout: 15000
    });
    
    const $ = cheerio.load(response.data);
    const events = [];
    const seenUrls = new Set();
    
    // Dice uses various selectors
    $('article, [class*="event"], [class*="card"], [data-testid*="event"]').each((i, el) => {
      const $event = $(el);
      
      // Extract title
      let title = $event.find('h1, h2, h3, h4, [class*="title"], [class*="name"], [class*="artist"]').first().text().trim();
      
      if (!title || title.length < 3) return;
      
      // Extract venue
      let venue = $event.find('[class*="venue"], [class*="location"]').first().text().trim() || '';
      
      // Extract date
      let eventDate = null;
      const $dateEl = $event.find('time, [datetime], [class*="date"]').first();
      let dateText = $dateEl.attr('datetime') || $dateEl.text().trim();
      
      if (dateText) {
        try {
          const parsed = new Date(dateText);
          if (!isNaN(parsed.getTime()) && parsed.getFullYear() >= 2025) {
            eventDate = parsed.toISOString().split('T')[0];
          }
        } catch (e) {}
      }
      
      // Extract URL
      let eventUrl = $event.find('a').first().attr('href');
      if (eventUrl) {
        if (!eventUrl.startsWith('http')) {
          eventUrl = 'https://dice.fm' + (eventUrl.startsWith('/') ? eventUrl : '/' + eventUrl);
        }
      } else {
        return;
      }
      
      // Skip duplicates
      if (seenUrls.has(eventUrl)) return;
      seenUrls.add(eventUrl);
      
      // Extract image
      const img = $event.find('img').first();
      let imageUrl = null;
      if (img.length) {
        imageUrl = img.attr('src') || img.attr('data-src') || img.attr('srcset')?.split(' ')[0] || null;
      }
      
      events.push({
        id: uuidv4(),
        title: title,
        date: eventDate,
        url: eventUrl,
        imageUrl: imageUrl,
        venue: {
          name: venue || 'Various Venues',
          address: '',
          city: 'Toronto'
        },
        city: city,
        category: 'Nightlife',
        source: 'Dice.fm'
      });
    });
    
    console.log(`✅ Dice.fm: ${events.length} events`);
    return filterEvents(events);
    
  } catch (error) {
    console.error('  ⚠️  Dice.fm error:', error.message);
    return [];
  }
}

module.exports = scrape;
