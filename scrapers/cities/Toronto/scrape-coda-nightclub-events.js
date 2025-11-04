const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { parseDateText } = require('../../utils/city-util');

const EVENTS_URL = 'https://codatoronto.com/';
const VENUE_NAME = 'Coda';
const VENUE_ADDRESS = '794 Bathurst St, Toronto, ON M5R 3G1';

async function codanightclubEvents(city = 'Toronto') {
  if (city !== 'Toronto') {
    throw new Error(`City mismatch! Expected 'Toronto', got '${city}'`);
  }
  
  console.log(`🌙 Scraping ${VENUE_NAME} nightlife events for ${city}...`);
  
  const events = [];
  
  try {
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
    
    const response = await axios.get(EVENTS_URL, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });
    
    const $ = cheerio.load(response.data);
    
    // Find event containers
    const containers = new Set();
    
    // Look for event-specific elements
    $('.event, [class*="event"], article, .show, [class*="show"], .listing, .card, [class*="card"]').each((i, el) => {
      containers.add(el);
    });
    
    // Look for date elements and find their parent containers
    $('[datetime], time, .date, [class*="date"]').each((i, el) => {
      let parent = $(el).parent()[0];
      for (let depth = 0; depth < 4 && parent; depth++) {
        containers.add(parent);
        parent = $(parent).parent()[0];
      }
    });
    
    // Process each container
    Array.from(containers).forEach((el) => {
      if (!el) return;
      const $event = $(el);
      
      // Extract title
      const title = (
        $event.find('h1').first().text().trim() ||
        $event.find('h2').first().text().trim() ||
        $event.find('h3').first().text().trim() ||
        $event.find('h4').first().text().trim() ||
        $event.find('.title, [class*="title"]').first().text().trim() ||
        $event.find('.name, [class*="name"]').first().text().trim() ||
        $event.find('a').first().text().trim()
      );
      
      if (!title || title.length < 5 || title.length > 200) return;
      if (title.match(/^(Menu|Nav|Skip|Login|Subscribe|Search|Home|About|Contact|View All)/i)) return;
      
      // Extract date
      let dateText = '';
      const dateEl = $event.find('[datetime]').first();
      if (dateEl.length) {
        dateText = dateEl.attr('datetime') || dateEl.text().trim();
      } else {
        const selectors = ['time', '.date', '[class*="date"]', '.when', '.schedule'];
        for (const sel of selectors) {
          dateText = $event.find(sel).first().text().trim();
          if (dateText && dateText.length > 4) break;
        }
      }
      
      if (!dateText) {
        const allText = $event.text();
        const patterns = [
          /\d{4}-\d{2}-\d{2}/,
          /\d{1,2}\/\d{1,2}\/\d{4}/,
          /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}/i,
          /(Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*,?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}/i
        ];
        for (const pattern of patterns) {
          const match = allText.match(pattern);
          if (match) {
            dateText = match[0];
            break;
          }
        }
      }
      
      if (!dateText || dateText.length < 4) return;
      
      const parsedDate = parseDateText(dateText);
      if (!parsedDate || !parsedDate.startDate) return;
      
      // Extract description
      const description = (
        $event.find('.description, .desc, p').first().text().trim() ||
        title
      ).substring(0, 500);
      
      // Extract URL
      const url = $event.find('a').first().attr('href') || EVENTS_URL;
      const fullUrl = url.startsWith('http') ? url : 
                     url.startsWith('/') ? `https://${new URL(EVENTS_URL).hostname}${url}` : 
                     EVENTS_URL;
      
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
        title: title,
        date: parsedDate.startDate.toISOString(),
        venue: { name: VENUE_NAME, address: VENUE_ADDRESS, city: 'Toronto' },
        location: 'Toronto, ON',
        description: description,
        url: fullUrl,
        category: 'Nightlife',
        source: 'Nightlife Scraper'
      });
    });
    
    console.log(`   🌙 Extracted ${events.length} nightlife events`);
    
  } catch (error) {
    if (error.response?.status === 404 || error.response?.status === 403 || error.code === 'ENOTFOUND') {
      console.log(`   ⚠️  0 events (venue site unavailable)`);
      return filterEvents([]);
    }
    throw error;
  }
  
  
  // AGGRESSIVE DEDUPLICATION
  const seenKeys = new Set();
  const dedupedEvents = [];
  
  for (const event of events) {
    const key = `${event.title?.toLowerCase().trim()}|${event.date}`;
    
    // Skip if duplicate, NULL date, or junk
    if (seenKeys.has(key)) continue;
    if (!event.date || event.date === null) continue;
    if (!event.title || event.title.length < 10) continue;
    
    const title = event.title.toLowerCase();
    if (title === 'featured' || title === 'learn more' || 
        title === 'buy tickets' || title === 'view all' ||
        /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{1,2}$/i.test(title) ||
        /^\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(title)) {
      continue;
    }
    
    seenKeys.add(key);
    dedupedEvents.push(event);
  }
  
  events = dedupedEvents;

  return filterEvents(events);
}

module.exports = codanightclubEvents;
