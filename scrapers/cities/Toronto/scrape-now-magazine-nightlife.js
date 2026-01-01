/**
 * NOW Magazine Events Scraper (EXPANDED)
 * Toronto's alternative weekly - ALL events
 * SAFE & LEGAL: Local media/news outlet (not competitor)
 * Covers music, nightlife, arts, food, festivals
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrape() {
  console.log('📰 Scraping NOW Magazine events (all categories)...');
  
  try {
    const events = [];
    const seen = new Set();
    
    // Scrape multiple event categories
    const urls = [
      'https://nowtoronto.com/events',
      'https://nowtoronto.com/music',
      'https://nowtoronto.com/culture',
      'https://nowtoronto.com/food-drink'
    ];
    
    for (const url of urls) {
      try {
        console.log(`  Fetching: ${url}`);
        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
          },
          timeout: 15000
        });
        
        const $ = cheerio.load(response.data);
    
    $('article, .event, .listing, [class*="post"]').each((i, el) => {
      const $el = $(el);
      
      const title = $el.find('h1, h2, h3, .title, .headline').first().text().trim();
      const venue = $el.find('.venue, .location').first().text().trim();
      const dateText = $el.find('time, .date').attr('datetime') || $el.find('time, .date').text().trim();
      const url = $el.find('a').first().attr('href');
      
      // Extract image
      const img = $el.find('img').first();
      let imageUrl = null;
      if (img.length) {
        imageUrl = img.attr('src') || img.attr('data-src') || img.attr('data-lazy-src');
        if (imageUrl && !imageUrl.startsWith('http')) {
          if (imageUrl.startsWith('//')) imageUrl = 'https:' + imageUrl;
          else if (imageUrl.startsWith('/')) imageUrl = 'https://nowtoronto.com' + imageUrl;
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
        
        // Categorize by URL/content
        let category = 'Events';
        if (url.includes('/music')) category = 'Music';
        else if (url.includes('/food-drink')) category = 'Food & Drink';
        else if (url.includes('/culture')) category = 'Arts & Culture';
        
        events.push({
          id: uuidv4(),
          title: title,
          date: eventDate,
          url: url && url.startsWith('http') ? url : (url ? 'https://nowtoronto.com' + url : 'https://nowtoronto.com'),
          imageUrl: imageUrl,
          venue: {
            name: venue || 'TBA',
            city: 'Toronto'
          },
          location: 'Toronto, ON',
          city: 'Toronto',
          description: null,
          category: category,
          source: 'NOW Magazine'
        });
      }
    });
        
      } catch (err) {
        console.log(`    ⚠️  Error on ${url}: ${err.message}`);
      }
    }
    
    console.log(`✅ NOW Magazine: ${events.length} total events`);
    return events;
    
  } catch (error) {
    console.error('Error scraping NOW Magazine:', error.message);
    return [];
  }
}

module.exports = scrape;
