/**
 * Brooklyn Vegan Events Scraper
 * NYC music and nightlife blog - extensive event coverage
 * Focus: Concerts, nightlife, music events
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrape() {
  console.log('📰 Scraping Brooklyn Vegan events...');
  
  try {
    const response = await axios.get('https://www.brooklynvegan.com/events/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      timeout: 15000
    });
    
    const $ = cheerio.load(response.data);
    const events = [];
    const seen = new Set(); // PREVENT DUPLICATES
    
    $('article, .event, .show-listing, [class*="event"]').each((i, el) => {
      const $el = $(el);
      
      // Extract event details
      const title = $el.find('h1, h2, h3, .artist, .title, [class*="title"]').first().text().trim();
      const venue = $el.find('.venue, .location, [class*="venue"]').first().text().trim();
      
      // CAREFUL DATE PARSING
      const dateEl = $el.find('time, .date, [datetime]').first();
      let dateText = dateEl.attr('datetime') || dateEl.text().trim();
      
      const linkEl = $el.find('a').first();
      const eventUrl = linkEl.attr('href');
      
      // PARSE DATE CAREFULLY - Multiple attempts
      let eventDate = null;
      if (dateText) {
        try {
          // Try 1: Direct parse
          const parsed = new Date(dateText);
          if (!isNaN(parsed.getTime())) {
            eventDate = parsed.toISOString().split('T')[0];
          }
        } catch (e) {
          // Try 2: Pattern match
          const match = dateText.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/); // MM/DD/YYYY
          if (match) {
            try {
              const [_, month, day, year] = match;
              eventDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            } catch (e2) {}
          } else {
            // Try 3: Month name format
            const match2 = dateText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})/i);
            if (match2) {
              try {
                eventDate = new Date(dateText).toISOString().split('T')[0];
              } catch (e3) {}
            }
          }
        }
      }
      
      // VALIDATE before adding
      if (title && title.length > 3 && eventDate) {
        // DEDUPLICATION
        const dedupeKey = `${title.toLowerCase().trim()}|${eventDate}|${venue.toLowerCase().trim()}`;
        
        if (!seen.has(dedupeKey)) {
          seen.add(dedupeKey);
          
          // Determine borough/location
          let location = 'New York, NY';
          const venueLower = venue.toLowerCase();
          if (venueLower.includes('brooklyn')) location = 'Brooklyn, NY';
          else if (venueLower.includes('queens')) location = 'Queens, NY';
          else if (venueLower.includes('bronx')) location = 'Bronx, NY';
          
          // Category - Brooklyn Vegan is mostly concerts/nightlife
          let category = 'Concert';
          const titleLower = title.toLowerCase();
          if (titleLower.includes('dj') || titleLower.includes('club') || 
              titleLower.includes('night') || titleLower.includes('dance')) {
            category = 'Nightlife';
          }
          
          events.push({
            id: uuidv4(),
            title: title,
            date: eventDate, // ISO format
            url: eventUrl && eventUrl.startsWith('http') ? eventUrl : (eventUrl ? 'https://www.brooklynvegan.com' + eventUrl : 'https://www.brooklynvegan.com'),
          imageUrl: imageUrl,
            venue: {
              name: venue || 'TBA',
              city: 'New York'
            },
            location: location,
            city: 'New York',
            description: null,
            category: category,
            source: 'Brooklyn Vegan'
          });
        }
      }
    });
    
    console.log(`✅ Brooklyn Vegan: ${events.length} events (${events.filter(e => e.category === 'Nightlife').length} nightlife)`);
    return events;
    
  } catch (error) {
    console.error('Error scraping Brooklyn Vegan:', error.message);
    return [];
  }
}

module.exports = scrape;
