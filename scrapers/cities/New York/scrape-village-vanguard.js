const { filterEvents } = require('../../utils/eventFilter');

const VENUE_NAME = "Village Vanguard";
const VENUE_ADDRESS = '178 7th Ave S, New York, NY 10014';
const axios = require('axios');
const cheerio = require('cheerio');
const { parseDateText } = require('../../utils/city-util');

async function scrapeEvents(city = 'New York') {
  console.log('🎨 Scraping Village Vanguard events...');
  const events = [];
  
  try {
    const response = await axios.get('https://villagevanguard.com/', {
      timeout: 15000,
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }
    });
    
    const $ = cheerio.load(response.data);
    const containers = new Set();
    
    $('.event, [class*="event"], article, .exhibition, .show, .performance').each((i, el) => {
      if (i < 100) containers.add(el);
    });
    
    $('[datetime], time, .date, [class*="date"]').each((i, el) => {
      let p = $(el).parent()[0];
      for (let d = 0; d < 4 && p; d++) { containers.add(p); p = $(p).parent()[0]; }
    });
    
    Array.from(containers).forEach((el) => {
      const $e = $(el);
      const title = ($e.find('h1, h2, h3, h4').first().text().trim() || $e.find('.title, [class*="title"]').first().text().trim() || $e.find('a').first().text().trim());
      if (!title || title.length < 5 || title.length > 250) return;
      if (title.match(/^(Menu|Nav|Skip|Login|Subscribe|Search|Home)/i)) return;
      
      let dateText = $e.find('[datetime]').attr('datetime') || $e.find('time, .date, [class*="date"]').first().text().trim();
      if (!dateText) {
        const match = $e.text().match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:,?\s+\d{4})?/i);
        if (match) dateText = match[0];
      }
      
      if (!dateText || dateText.length < 4) return;
      const parsedDate = parseDateText(dateText);
      if (!parsedDate || !parsedDate.startDate) return;
      
      events.push({
        title, date: parsedDate.startDate.toISOString(),
        venue: { name: VENUE_NAME, address: VENUE_ADDRESS, city: 'New York' },
        location: 'New York, NY', description: title, url: 'https://villagevanguard.com/', category: 'Events'
      });
    });
    
    console.log(`   ✅ Extracted ${events.length} events`);
  } catch (error) {
    console.log(`   ⚠️  Error: ${error.message.substring(0, 50)}`);
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

module.exports = scrapeEvents;
