const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { parseDateText } = require('../../utils/city-util');

const VENUE_NAME = "Feinstein\'s/54 Below";
const VENUE_ADDRESS = '254 W 54th St, New York, NY 10019';

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping events...');
  const events = [];
  
  try {
    const response = await axios.get('https://54below.com/', {
      timeout: 15000,
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }
    });
    
    const $ = cheerio.load(response.data);
    $('.event, [class*="event"], article, .show').each((i, el) => {
      if (i > 30) return false;
      const $e = $(el);
      const title = ($e.find('h1, h2, h3, h4, .title').first().text().trim() || $e.find('a').first().text().trim());
      if (!title || title.length < 5 || title.length > 250) return;
      
      let dateText = $e.find('[datetime]').attr('datetime') || $e.find('time, .date').first().text().trim();
      if (!dateText) {
        const match = $e.text().match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}/i);
        if (match) dateText = match[0];
      }
      
      if (!dateText) return;
      const parsedDate = parseDateText(dateText);
      if (!parsedDate || !parsedDate.startDate) return;
      
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
        title, date: parsedDate.startDate.toISOString(),
        venue: { name: 'Feinstein\'s/54 Below', address: '254 W 54th St, New York, NY 10019', city: 'New York' },
        location: 'New York, NY', description: title, url: 'https://54below.com/', category: 'Events'
      });
    });
    
    console.log(`   ✅ Extracted ${events.length} events`);
  } catch (error) {
    console.log(`   ⚠️  0 events`);
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
