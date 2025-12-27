/**
 * Vancouver Civic Theatres Scraper
 * Scrapes events from Queen Elizabeth Theatre, Orpheum, Vancouver Playhouse, and ANNEX
 * Official source: vancouvercivictheatres.com
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

const VENUES = {
  'queen-elizabeth': {
    name: 'Queen Elizabeth Theatre',
    address: '630 Hamilton Street, Vancouver, BC V6B 5N6'
  },
  'orpheum': {
    name: 'Orpheum Theatre',
    address: '884 Granville Street, Vancouver, BC V6Z 1K3'
  },
  'playhouse': {
    name: 'Vancouver Playhouse',
    address: '600 Hamilton Street, Vancouver, BC V6B 2P1'
  },
  'annex': {
    name: 'The ANNEX',
    address: '823 Seymour Street, Vancouver, BC V6B 3L4'
  }
};

async function fetchEventDetails(eventUrl) {
  try {
    const response = await axios.get(eventUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html',
      },
      timeout: 15000
    });
    
    const $ = cheerio.load(response.data);
    
    // Extract date from page
    let dateText = null;
    const dateEl = $('time[datetime]').first();
    if (dateEl.length) {
      dateText = dateEl.attr('datetime');
    }
    
    // Try to find date in meta tags
    if (!dateText) {
      const metaDate = $('meta[property="event:start_time"]').attr('content');
      if (metaDate) dateText = metaDate;
    }
    
    // Try to extract from visible date elements
    if (!dateText) {
      const datePatterns = [
        /(\w+)\s+(\d{1,2}),?\s+(\d{4})/i,  // "January 15, 2026"
        /(\d{4})-(\d{2})-(\d{2})/,          // "2026-01-15"
      ];
      
      const pageText = $('body').text();
      for (const pattern of datePatterns) {
        const match = pageText.match(pattern);
        if (match) {
          if (match[0].match(/^\d{4}-\d{2}-\d{2}$/)) {
            dateText = match[0];
          } else {
            // Convert "January 15, 2026" to ISO format
            const months = ['january', 'february', 'march', 'april', 'may', 'june', 
                           'july', 'august', 'september', 'october', 'november', 'december'];
            const monthName = match[1].toLowerCase();
            const monthIndex = months.indexOf(monthName);
            if (monthIndex !== -1) {
              const day = match[2].padStart(2, '0');
              const year = match[3];
              dateText = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${day}`;
            }
          }
          break;
        }
      }
    }
    
    // Extract image
    let image = $('meta[property="og:image"]').attr('content');
    if (!image) {
      image = $('.event-image img, .hero-image img, .featured-image img').first().attr('src');
    }
    
    // Extract description
    let description = $('meta[property="og:description"]').attr('content');
    if (!description) {
      description = $('meta[name="description"]').attr('content');
    }
    
    // Determine venue from URL or page content
    let venue = VENUES['queen-elizabeth']; // default
    const urlLower = eventUrl.toLowerCase();
    const pageTextLower = $('body').text().toLowerCase();
    
    if (urlLower.includes('orpheum') || pageTextLower.includes('orpheum theatre')) {
      venue = VENUES['orpheum'];
    } else if (urlLower.includes('playhouse') || pageTextLower.includes('vancouver playhouse')) {
      venue = VENUES['playhouse'];
    } else if (urlLower.includes('annex') || pageTextLower.includes('the annex')) {
      venue = VENUES['annex'];
    }
    
    return { dateText, image, description, venue };
  } catch (error) {
    return { dateText: null, image: null, description: null, venue: VENUES['queen-elizabeth'] };
  }
}

const VancouverCivicTheatresEvents = {
  async scrape(city) {
    console.log('🔍 Scraping events from Vancouver Civic Theatres...');

    try {
      const response = await axios.get('https://vancouvercivictheatres.com/', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'text/html',
        },
        timeout: 30000
      });

      const $ = cheerio.load(response.data);
      const events = [];
      const seenUrls = new Set();
      const eventUrls = [];

      // Find all event links
      $('a[href*="/events/"]').each((i, el) => {
        const href = $(el).attr('href');
        if (!href) return;
        
        let url = href;
        if (!url.startsWith('http')) {
          url = 'https://vancouvercivictheatres.com' + url;
        }
        
        // Skip generic pages
        if (url === 'https://vancouvercivictheatres.com/events/' || 
            url === 'https://vancouvercivictheatres.com/events') {
          return;
        }
        
        if (!seenUrls.has(url)) {
          seenUrls.add(url);
          eventUrls.push(url);
        }
      });

      console.log(`  Found ${eventUrls.length} event URLs`);

      // Fetch details for each event (limit concurrent requests)
      for (const eventUrl of eventUrls.slice(0, 50)) {
        try {
          // Extract title from URL
          const urlMatch = eventUrl.match(/\/events\/([^\/]+)/);
          if (!urlMatch) continue;
          
          let title = urlMatch[1]
            .replace(/vct-presents?-/gi, '')
            .replace(/vct-/gi, '')
            .replace(/-\d{4}(-\d{4})?(-season)?$/i, '') // Remove year suffixes
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')
            .trim();
          
          if (title.length < 3) continue;
          
          // Fetch event page for details
          const details = await fetchEventDetails(eventUrl);
          
          // Skip if no date found
          if (!details.dateText) {
            // Try to extract date from URL (e.g., mar-2-2026)
            const urlDateMatch = eventUrl.match(/(\w{3})-(\d{1,2})-(\d{4})/i);
            if (urlDateMatch) {
              const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
              const monthIndex = months.indexOf(urlDateMatch[1].toLowerCase());
              if (monthIndex !== -1) {
                details.dateText = `${urlDateMatch[3]}-${String(monthIndex + 1).padStart(2, '0')}-${urlDateMatch[2].padStart(2, '0')}`;
              }
            }
          }
          
          if (!details.dateText) {
            console.log(`  ⚠️ No date for: ${title}`);
            continue;
          }
          
          events.push({
            id: uuidv4(),
            title: title,
            date: details.dateText,
            url: eventUrl,
            venue: details.venue,
            city: 'Vancouver',
            description: details.description || null,
            image: details.image || null,
            source: details.venue.name
          });
          
        } catch (err) {
          // Continue with next event
        }
      }

      console.log(`Found ${events.length} total events from Vancouver Civic Theatres`);
      const filtered = filterEvents(events);
      console.log(`✅ Returning ${filtered.length} valid events after filtering`);
      return filtered;

    } catch (error) {
      console.error('Error scraping Vancouver Civic Theatres:', error.message);
      return [];
    }
  }
};

module.exports = VancouverCivicTheatresEvents.scrape;
