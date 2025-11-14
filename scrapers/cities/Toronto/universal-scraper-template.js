const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

/**
 * Universal scraper template that works for many venue websites
 * Usage: createScraper('Venue Name', 'https://venue.com/events', 'Address, City, State ZIP')
 */
function createUniversalScraper(venueName, url, address) {
  return async function scrape(city = 'New York') {
    // BLACKLIST: Only news sites and aggregators
    // DO NOT block universities/venues - we'll filter junk events by title instead
    const blacklist = [
      // NEWS SITES (article headlines, not events)
      'thestar.com',
      'blogto.com',
      'nowtoronto.com',
      'citynews.ca',
      
      // AGGREGATORS (we have direct venue scrapers instead)
      'google.com',
      'ticketmaster.ca',
      'songkick.com',
      'allevents.in',
      'eventbrite.ca/d/canada--toronto'
    ];
    
    // Check if this URL is blacklisted
    const isBlacklisted = blacklist.some(domain => url.toLowerCase().includes(domain));
    
    if (isBlacklisted) {
      // Silently return empty array for blacklisted websites
      return [];
    }
    
    let events = [];
    
    try {
      const response = await axios.get(url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'text/html'
        }
      });
      
      const $ = cheerio.load(response.data);
      
      // Try EXTENSIVE event container selectors
      const containers = new Set();
      const selectors = [
        // Event classes
        '.event', '[class*="event"]', '[class*="Event"]', '[id*="event"]',
        '.show', '[class*="show"]', '[class*="Show"]',
        '.concert', '[class*="concert"]', '.performance', '[class*="performance"]',
        '.listing', '[class*="listing"]', '.list-item',
        
        // Card/container patterns
        'article', '.card', '[class*="card"]', '[class*="Card"]',
        '.item', '[class*="item"]', 'li[class*="item"]',
        '.entry', '[class*="entry"]', '.post',
        
        // Grid/list patterns
        '.grid-item', '[class*="grid"]', '.list-group-item',
        '.row', '[class*="row"]', '.col',
        
        // Data attributes
        '[data-event]', '[data-show]', '[data-performance]',
        '[data-date]', '[data-title]',
        
        // Date-containing elements (work backwards)
        'time', '[datetime]', '.date', '[class*="date"]',
        '.when', '.schedule', '.calendar'
      ];
      
      // First pass: direct selectors
      selectors.forEach(sel => {
        try {
          $(sel).each((i, el) => {
            if (i < 100) containers.add(el);
          });
        } catch (e) {}
      });
      
      // Second pass: find parents of date elements
      $('time, [datetime], .date, [class*="date"]').each((i, el) => {
        if (i < 50) {
          let parent = $(el).parent()[0];
          for (let depth = 0; depth < 4 && parent; depth++) {
            containers.add(parent);
            parent = $(parent).parent()[0];
          }
        }
      });
      
      Array.from(containers).forEach((el) => {
        const $e = $(el);
        
        // Extract title - try MANY patterns
        let title = '';
        const titleSelectors = [
          'h1', 'h2', 'h3', 'h4', 'h5',
          '.title', '[class*="title"]', '[class*="Title"]',
          '.name', '[class*="name"]', '[class*="Name"]',
          '.headline', '[class*="headline"]',
          '.event-title', '.show-title', '.performance-title',
          'a[href*="/event"]', 'a[href*="/show"]',
          'strong', 'b', '.artist', '[class*="artist"]',
          'a'
        ];
        
        for (const sel of titleSelectors) {
          let text = $e.find(sel).first().text().trim();
          
          // Clean the text: stop at first newline, long dash, or description marker
          text = text.split(/\n/)[0];  // Take only first line
          text = text.split(/\s+—\s+/)[0];  // Stop at em dash
          text = text.split(/\|\s+/)[0];  // Stop at pipe separator
          text = text.replace(/\s+/g, ' ').trim();  // Clean whitespace
          
          // Title must be reasonable length
          if (text && text.length >= 5 && text.length <= 150) {
            title = text;
            break;
          }
        }
        
        if (!title || title.length < 5) return;
        
        // STRICT junk filtering - reject common non-event patterns
        const junkPatterns = [
          // UI ELEMENTS
          /^(Menu|Nav|Skip|Login|Subscribe|Search|Home|View All|Load More|Filter|Sort|Click|Read More|Learn More|See All)/i,
          /^(Stay in the Know|Join|Sign Up|Newsletter|Follow|Connect|Share)/i,
          /^(Today|Tomorrow|This Week|This Month|Upcoming|Past|Calendar)$/i,
          /^[A-Z][a-z]+$/,  // Single capitalized word only
          /\*SOLD OUT\*/i,  // Remove sold out markers
          /^Events at Our/i,  // Generic venue listings
          /^Latest Past Events/i,  // Navigation links
          /^(Past|Upcoming|All) Events$/i,
          /^See All Events/i,
          /^View All Events/i,
          /^List of events/i,
          /^Unionnale:/i,
          /^Fresh Mart:/i,
          /^Westerly Winds/i,
          /^ICYMI:/i,
          /^OTTB Spotlight/i,
          // DATE-ONLY TITLES (not real event names)
          /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}/i,  // "Nov 11, 2025..." or "November 22, 20254x2"
          /^\d{1,2}\/\d{1,2}\/\d{2,4}$/,  // "11/11/2025"
          /^\d{4}-\d{2}-\d{2}$/,  // "2025-11-11"
          /^20\d{2}\s/,  // "2025 ..." (year-prefixed titles like "2025 Duende Festival")
          
          // INTERNAL UNIVERSITY/COLLEGE EVENTS (not public shows)
          // Allow: "Concert at Faculty of Music" ✅
          // Block: "Information Session" ❌
          /Information Session/i,
          /Orientation Session/i,
          /Open House/i,
          /Alumni[- ]Student Mentorship/i,
          /Career (Café|Cafe|Fair|Workshop|Centre)/i,
          /^Lunch (with|and|Series)/i,
          /Mindfulness (Practice|Session)/i,
          /^(Online|Virtual) Tours?$/i,
          /^Wake Up Toronto/i,
          /^Cabot Cape Breton Information/i,
          /^Let's Talk!/i,  // George Brown internal sessions
          /^Rec tournament/i,  // George Brown rec activities
          /^Black Student (Summit|Network|Speaker Series|Success Network)/i,  // Internal student events
          /Wellness (Tuesday|Wednesday|Thursday|Friday|Monday|Session)/i,  // Student wellness sessions
          /Overcoming Imposter Syndrome/i,  // Student support sessions
          /^Union Samples/i,  // Generic union events
          /^Dance Curation/i,  // Generic workshop titles
          
          // ACADEMIC ADMIN (not public events)
          /^(Graduate|Undergrad|PhD|Masters|MBA) Studies/i,
          /^Engineering Graduate Studies/i,
          /^Faculty of .+ Studies$/i,  // "Faculty of Kinesiology Studies" but allow "Concert at Faculty"
          
          // HOSPITAL/FITNESS CLASSES (not public events)
          /^TAHSN Fitness Class/i,
          /^Fitness Class:/i,
          /Strength and Conditioning/i,
          /Patient (Education|Support|Care)/i,
          
          // GENERIC WORKSHOPS (not entertainment)
          /^Resume Workshop/i,
          /^Job Search Project/i,
          /^DIY Marketing/i,
          /^Black (Student|Research) Network$/i,
          /^Intersectional Gaming:/i,
          /^Trinity Minds on Hot Topics/i,
          /Using AI Responsibly$/i,
          
          // NEWS SITE JUNK
          /^Here's what's open and closed/i,
          /^You can squeeze in one last/i,
          /^How to bet the/i,
          /^Watch Races$/i,
          /^WOT:/i,
          /^INSIDE THE NUMBERS:/i
        ];
        
        if (junkPatterns.some(pattern => pattern.test(title))) return;
        
        // Extract date - try MANY patterns
        let dateText = '';
        
        // Try datetime attribute first
        const dateEl = $e.find('[datetime]').first();
        if (dateEl.length) {
          dateText = dateEl.attr('datetime') || dateEl.text().trim();
        }
        
        // Try common date selectors
        if (!dateText) {
          const dateSelectors = [
            'time', '.date', '[class*="date"]', '[class*="Date"]',
            '.when', '.schedule', '.datetime',
            '[class*="time"]', '[class*="day"]',
            '.event-date', '.show-date', '.concert-date'
          ];
          
          for (const sel of dateSelectors) {
            const text = $e.find(sel).first().text().trim();
            if (text && text.length >= 4) {
              dateText = text;
              break;
            }
          }
        }
        
        // Try regex patterns in full text
        if (!dateText) {
          const fullText = $e.text();
          const patterns = [
            // Full date formats
            /(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s,]+\d{1,2}(?:st|nd|rd|th)?[\s,]+\d{4}/i,
            /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:,?\s+\d{4})?/i,
            // Numeric formats
            /\d{1,2}\/\d{1,2}\/\d{2,4}/,
            /\d{4}-\d{2}-\d{2}/,
            /\d{1,2}-\d{1,2}-\d{4}/,
            // Day, Month Day patterns
            /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*,?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}/i
          ];
          
          for (const pattern of patterns) {
            const match = fullText.match(pattern);
            if (match) {
              dateText = match[0];
              break;
            }
          }
        }
        
        if (!dateText || dateText.length < 4) return;
        
        // AGGRESSIVE FILTERING: Reject dates without full 4-digit year
        // This prevents scraping "Last Updated: Nov 8" as event dates
        const hasFull4DigitYear = /\d{4}/.test(dateText);
        
        if (!hasFull4DigitYear) {
          // NO YEAR = likely a page header/timestamp, NOT an event date
          // Real events always have full dates like "Nov 8, 2025"
          return;
        }
        
        // ALSO reject if it matches today's date (could be "last updated")
        const today = new Date();
        const todayMonthDay = `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][today.getMonth()]} ${today.getDate()}`;
        
        if (dateText.toLowerCase().includes(todayMonthDay.toLowerCase())) {
          // Even with a year, if it's today's date, it's suspicious
          // (unless the event has other indicators it's real)
          const hasEventKeywords = /(concert|show|performance|tour|festival|live|presents)/i.test(title);
          if (!hasEventKeywords) {
            return; // Likely a "last updated" timestamp
          }
        }
        
        // Normalize and clean date
        dateText = String(dateText)
          .split(/\n/)[0]  // Take only first line
          .split(/\|\s+/)[0]  // Stop at pipe
          .split(/Buy Tickets/i)[0]  // Stop at "Buy Tickets"
          .split(/View Event/i)[0]  // Stop at "View Event"
          .split(/Daily/i)[0]  // Stop at "Daily"  
          .replace(/\n/g, ' ')
          .replace(/\s+/g, ' ')
          .replace(/(\d+)(st|nd|rd|th)/gi, '$1')
          .replace(/\d{1,2}:\d{2}\s*(AM|PM)\d{1,2}:\d{2}/gi, '')
          .trim();
        
        // Limit date text length (dates shouldn't be super long)
        if (dateText.length > 100) {
          dateText = dateText.substring(0, 100);
        }
          
        if (!/\d{4}/.test(dateText)) {
          const currentYear = new Date().getFullYear();
          const currentMonth = new Date().getMonth();
          const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
          const dateLower = dateText.toLowerCase();
          const monthIndex = months.findIndex(m => dateLower.includes(m));
          if (monthIndex !== -1) {
            const year = monthIndex < currentMonth ? currentYear + 1 : currentYear;
            dateText = `${dateText}, ${year}`;
          }
        }
        
        const eventUrl = $e.find('a').first().attr('href') || url;
        const fullUrl = eventUrl.startsWith('http') ? eventUrl : 
                       eventUrl.startsWith('/') ? new URL(url).origin + eventUrl : url;
        
        // Extract image
        const img = $e.find('img').first();
        let imageUrl = null;
        if (img.length) {
          imageUrl = img.attr('src') || img.attr('data-src') || img.attr('data-lazy-src') || img.attr('data-original');
          if (imageUrl && !imageUrl.startsWith('http')) {
            if (imageUrl.startsWith('//')) {
              imageUrl = 'https:' + imageUrl;
            } else if (imageUrl.startsWith('/')) {
              try {
                imageUrl = new URL(url).origin + imageUrl;
              } catch (e) {
                imageUrl = null;
              }
            }
          }
          // Filter out tiny/placeholder images
          if (imageUrl && (imageUrl.includes('1x1') || imageUrl.includes('placeholder') || imageUrl.includes('spinner'))) {
            imageUrl = null;
          }
        }
        
        // QUALITY CHECK: Event must have meaningful content
        // Reject if title is just 1-2 words without context (likely junk)
        const wordCount = title.split(/\s+/).length;
        if (wordCount === 1 && title.length < 15) return;  // Single short word = junk
        
        // Reject generic museum/gallery titles without event context
        if (/^(Beach Boys|Bugonia|LunAtico|Sublime|Blink 183)$/i.test(title)) return;
        
        // Must have either:
        // 1. A full year in the date (YYYY format), OR
        // 2. Specific event indicators in title (concert, show, performance, tour, etc.)
        const hasFullDate = /\d{4}/.test(dateText);
        const hasEventKeywords = /(concert|show|performance|tour|festival|night|live|presents|featuring|with|vs\.)/i.test(title);
        
        if (!hasFullDate && !hasEventKeywords) {
          // Likely not a real event - just generic content with a date
          return;
        }
        
        events.push({
          id: uuidv4(),
          title,
          date: dateText,
          venue: { name: venueName, address: address, city: city },
          url: fullUrl,
          imageUrl: imageUrl,
          source: venueName,
          category: 'Events'
        });
      });
      
    } catch (error) {
      // Silent failure
    }
    
    // DEDUPLICATION: Remove duplicate events by title + date + venue
    const seen = new Set();
    const uniqueEvents = [];
    
    for (const event of events) {
      // Clean title: remove excess whitespace, truncate if too long
      let cleanTitle = event.title
        .replace(/\s+/g, ' ')
        .replace(/\n/g, ' ')
        .trim();
      
      // Truncate long titles (likely include descriptions)
      if (cleanTitle.length > 100) {
        cleanTitle = cleanTitle.substring(0, 97) + '...';
      }
      
      event.title = cleanTitle;
      
      // Create unique key
      const key = `${cleanTitle.toLowerCase()}|${event.date}|${event.venue.name}`;
      
      if (!seen.has(key)) {
        seen.add(key);
        uniqueEvents.push(event);
      }
    }
    
    return filterEvents(uniqueEvents);
  };
}

module.exports = createUniversalScraper;
