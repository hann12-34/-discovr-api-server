const { filterEvents } = require('../../utils/eventFilter');

const VENUE_NAME = "Javits Center";
const VENUE_ADDRESS = '429 11th Ave, New York, NY 10001';
const axios = require('axios');
const cheerio = require('cheerio');
const { parseDateText } = require('../../utils/city-util');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping NYC events...');
  let events = [];
  
  try {
    const url = 'https://www.javitscenter.com/events/';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html'
      }
    });
    
    const $ = cheerio.load(response.data);
    
    // Cast very wide net for events
    const selectors = [
      '.event', '[class*="event" i]', '[class*="Event"]',
      'article', '.show', '[class*="show" i]',
      '.card', '[class*="card" i]',
      '.listing', '[class*="listing" i]',
      'li[class*="item" i]', '[data-event]',
      '.performance', '.concert', '.game'
    ];
    
    const containers = new Set();
    selectors.forEach(sel => {
      $(sel).each((i, el) => {
        if (i < 100) containers.add(el);
      });
    });
    
    // Also find by date elements
    $('[datetime], time, .date, [class*="date" i]').each((i, el) => {
      let parent = $(el).parent()[0];
      for (let depth = 0; depth < 5 && parent; depth++) {
        containers.add(parent);
        parent = $(parent).parent()[0];
      }
    });
    
    Array.from(containers).forEach((el) => {
      const $e = $(el);
      
      // Extract title
      const title = (
        $e.find('h1').first().text().trim() ||
        $e.find('h2').first().text().trim() ||
        $e.find('h3').first().text().trim() ||
        $e.find('h4').first().text().trim() ||
        $e.find('.title, [class*="title" i]').first().text().trim() ||
        $e.find('.name, [class*="name" i]').first().text().trim() ||
        $e.find('a').first().text().trim()
      );
      
      if (!title || title.length < 5 || title.length > 250) return;
      if (title.match(/^(Menu|Nav|Skip|Login|Subscribe|Search|Home|View All|Load More|Filter|Sort)/i)) return;
      
      // Extract date
      let dateText = '';
      const dateEl = $e.find('[datetime]').first();
      if (dateEl.length) {
        dateText = dateEl.attr('datetime') || dateEl.text().trim();
      }
      
      if (!dateText) {
        dateText = $e.find('time, .date, [class*="date" i], .when, .schedule').first().text().trim();
      }
      
      if (!dateText) {
        const patterns = [
          /\d{4}-\d{2}-\d{2}/,
          /(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:,?\s+\d{4})?/i,
          /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*,?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}/i,
          /\d{1,2}\/\d{1,2}\/\d{2,4}/
        ];
        
        for (const pattern of patterns) {
          const match = $e.text().match(pattern);
          if (match) {
            dateText = match[0];
            break;
          }
        }
      }
      
      if (!dateText || dateText.length < 4) return;
      
      const parsedDate = parseDateText(dateText);
      if (!parsedDate || !parsedDate.startDate) return;
      
      const eventUrl = $e.find('a').first().attr('href') || url;
      const fullUrl = eventUrl.startsWith('http') ? eventUrl : 
                     eventUrl.startsWith('/') ? `https://${new URL(url).hostname}${eventUrl}` : url;
      
      // Normalize date
      if (dateText) {
        dateText = String(dateText)
          .replace(/\n/g, ' ')
          .replace(/\s+/g, ' ')
          .replace(/(\d+)(st|nd|rd|th)/gi, '$1')
          .replace(/\d{1,2}:\d{2}\s*(AM|PM)\d{1,2}:\d{2}/gi, '')
          .trim();
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
      }

      events.push({
        title,
        date: parsedDate.startDate.toISOString(),
        venue: { name: VENUE_NAME, address: VENUE_ADDRESS, city: 'New York' },
        location: 'New York, NY',
        description: title,
        url: fullUrl,
        category: 'Events'
      });
    });
    
    console.log(`   ✅ Extracted ${events.length} events`);
    
  } catch (error) {
    console.log(`   ⚠️  Error: ${error.message.substring(0, 50)}`);
  }
  
  
  // DEDUPLICATION: Track seen events
  const seenEvents = new Set();
  const dedupedEvents = [];
  
  for (const event of events) {
    // Create unique key from title + date + venue
    const key = `${event.title?.toLowerCase().trim()}|${event.date}|${event.venue?.name}`;
    
    if (!seenEvents.has(key)) {
      seenEvents.add(key);
      
      // Additional junk filtering
      const title = event.title || '';
      if (title.length >= 10 &&  // Min length
          !/^(tickets?|cancelled|buy|view|show|info|more|home|menu)$/i.test(title) &&  // Junk words
          !/^\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(title) &&  // Date-only titles
          event.date &&  // Must have date
          event.date !== null) {  // No NULL
        dedupedEvents.push(event);
      }
    }
  }
  
  events = dedupedEvents;

  return filterEvents(events);
}

module.exports = scrapeEvents;
