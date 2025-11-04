const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { parseDateText } = require('../../utils/city-util');

const EVENTS_URL = 'https://www.ticketweb.ca/search?pl=Toronto';
const VENUE_NAME = 'The Hideaway';
const VENUE_ADDRESS = '484 Ossington Ave, Toronto, ON M6G 3T5';

async function thehideawayEvents(city = 'Toronto') {
  if (city !== 'Toronto') {
    throw new Error(`City mismatch! Expected 'Toronto', got '${city}'`);
  }
  
  console.log(`🎪 Scraping ${VENUE_NAME} events for ${city}...`);
  
  const events = [];
  
  try {
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1500 + 500));
    
    const response = await axios.get(EVENTS_URL, {
      timeout: 20000,
      maxRedirects: 5,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    });
    
    const $ = cheerio.load(response.data);
    
    const containers = new Set();
    
    $('.event, [class*="event" i], [class*="Event" i], article, .show, [class*="show" i], .listing, .card, [class*="card" i], .item, [data-event], [data-testid*="event" i]').each((i, el) => {
      containers.add(el);
    });
    
    $('[datetime], time, .date, [class*="date" i]').each((i, el) => {
      let parent = $(el).parent()[0];
      for (let depth = 0; depth < 5 && parent; depth++) {
        containers.add(parent);
        parent = $(parent).parent()[0];
      }
    });
    
    $('div:has(h1, h2, h3, h4), section:has(h1, h2, h3, h4), li:has(h3, h4)').each((i, el) => {
      const text = $(el).text();
      if (text.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December)/i)) {
        containers.add(el);
      }
    });
    
    Array.from(containers).slice(0, 200).forEach((el) => {
      if (!el) return;
      const $event = $(el);
      
      const title = (
        $event.find('h1, h2, h3, h4').first().text().trim() ||
        $event.find('[class*="title" i], [class*="Title" i]').first().text().trim() ||
        $event.find('[class*="name" i], [class*="Name" i]').first().text().trim() ||
        $event.find('strong, b').first().text().trim() ||
        $event.find('a').first().text().trim()
      );
      
      if (!title || title.length < 5 || title.length > 200) return;
      if (title.match(/^(Menu|Nav|Skip|Login|Subscribe|Search|Home|About|Contact|Privacy|Terms|Cookie|View All|All Events|More|Load)/i)) return;
      
      let dateText = '';
      const dateEl = $event.find('[datetime]').first();
      if (dateEl.length) {
        dateText = dateEl.attr('datetime') || dateEl.text().trim();
      }
      
      if (!dateText) {
        const selectors = [
          'time', '.date', '[class*="date" i]', '[class*="Date" i]', 
          '.when', '.schedule', '[class*="time" i]', '[data-date]',
          '.day', '.month', '.year', '[class*="calendar" i]'
        ];
        for (const sel of selectors) {
          const el = $event.find(sel).first();
          if (el.length) {
            dateText = el.attr('datetime') || el.attr('data-date') || el.text().trim();
            if (dateText && dateText.length > 4) break;
          }
        }
      }
      
      if (!dateText || dateText.length < 4) {
        const allText = $event.text();
        const patterns = [
          /\d{4}-\d{2}-\d{2}/,
          /\d{1,2}\/\d{1,2}\/\d{4}/,
          /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}/i,
          /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}/i,
          /(Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*,?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}/i,
          /\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/
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
      
      const description = (
        $event.find('.description, .desc, [class*="desc" i], [class*="summary" i]').first().text().trim() ||
        $event.find('p').first().text().trim() ||
        title
      ).substring(0, 500);
      
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
        source: 'Mega Scraper'
      });
    });
    
    console.log(`   ✅ Extracted ${events.length} events`);
    
  } catch (error) {
    if (error.response?.status === 404 || error.response?.status === 403 || 
        error.response?.status === 429 || error.code === 'ENOTFOUND' || 
        error.code === 'ETIMEDOUT') {
      return filterEvents([]);
    }
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

module.exports = thehideawayEvents;
