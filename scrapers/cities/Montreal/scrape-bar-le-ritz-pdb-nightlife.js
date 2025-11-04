const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { parseDateText, isTitleJustADate } = require('../../utils/city-util');

const EVENTS_URL = 'https://www.barleritzpdb.com/';
const VENUE_NAME = 'Bar Le Ritz PDB';
const VENUE_ADDRESS = '179 Rue Jean-Talon O Montreal QC H2R 2X2';

async function barleritzpdbnightlifeEvents(city = 'Montreal') {
  if (city !== 'Montreal') throw new Error(`City mismatch! Expected 'Montreal', got '${city}'`);
  
  console.log(`🌙 Scraping ${VENUE_NAME} nightlife events for ${city}...`);
  
  const events = [];
  
  try {
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
    
    const response = await axios.get(EVENTS_URL, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    
    const $ = cheerio.load(response.data);
    const containers = new Set();
    
    $('.event, [class*="event" i], article, .show, .card, [class*="show"], [data-event]').each((i, el) => {
      containers.add(el);
    });
    
    $('[datetime], time, .date, [class*="date" i]').each((i, el) => {
      let parent = $(el).parent()[0];
      for (let depth = 0; depth < 4 && parent; depth++) {
        containers.add(parent);
        parent = $(parent).parent()[0];
      }
    });
    
    Array.from(containers).forEach((el) => {
      if (!el) return;
      const $event = $(el);
      
      const title = (
        $event.find('h1, h2, h3, h4').first().text().trim() ||
        $event.find('.title, [class*="title" i]').first().text().trim() ||
        $event.find('a').first().text().trim()
      );
      
      if (!title || title.length < 5 || title.length > 200) return;
      if (title.match(/^(Menu|Nav|Skip|Login|Subscribe|Search|Home)/i)) return;
      
      // Skip if title is just a date (common issue on Bar Le Ritz PDB website)
      if (isTitleJustADate(title)) {
        console.log(`   ⏭️  Skipping date-only title: "${title}"`);
        return;
      }
      
      let dateText = '';
      const dateEl = $event.find('[datetime]').first();
      if (dateEl.length) {
        dateText = dateEl.attr('datetime') || dateEl.text().trim();
      } else {
        dateText = $event.find('time, .date, [class*="date" i]').first().text().trim();
      }
      
      if (!dateText) {
        const patterns = [
          /\d{4}-\d{2}-\d{2}/,
          /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:,?\s+\d{4})?/i
        ];
        for (const pattern of patterns) {
          const match = $event.text().match(pattern);
          if (match) {
            dateText = match[0];
            break;
          }
        }
      }
      
      if (!dateText || dateText.length < 4) return;
      
      const parsedDate = parseDateText(dateText);
      if (!parsedDate || !parsedDate.startDate) return;
      
      const url = $event.find('a').first().attr('href') || EVENTS_URL;
      const fullUrl = url.startsWith('http') ? url : 
                     url.startsWith('/') ? `https://${new URL(EVENTS_URL).hostname}${url}` : EVENTS_URL;
      
      events.push({
        title: title,
        date: parsedDate.startDate.toISOString(),
        venue: { name: VENUE_NAME, address: VENUE_ADDRESS, city: 'Montreal' },
        location: 'Montreal, QC',
        description: title,
        url: fullUrl,
        category: 'Nightlife'
      });
    });
    
    console.log(`   ✅ Extracted ${events.length} nightlife events`);
    
  } catch (error) {
    if (error.response?.status === 404 || error.code === 'ENOTFOUND') {
      console.log(`   ⚠️  0 events (site unavailable)`);
      return filterEvents([]);
    }
    console.log(`   ⚠️  Error: ${error.message.substring(0, 50)}`);
    return filterEvents([]);
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

module.exports = barleritzpdbnightlifeEvents;
