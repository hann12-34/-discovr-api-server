const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { parseDateText } = require('../../utils/city-util');

const EVENTS_URL = 'https://thepalacetheatre.ca/events/';
const VENUE_NAME = 'Palace Theatre';
const VENUE_ADDRESS = '219 8 Ave SW Calgary AB T2P 1B5';

async function palacetheatreEvents(city = 'Calgary') {
  if (city !== 'Calgary') {
    throw new Error(`City mismatch! Expected 'Calgary', got '${city}'`);
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
    
    $('.event, [class*="event"], article, .show, [class*="show"], .listing, .card, [class*="card"]').each((i, el) => {
      containers.add(el);
    });
    
    $('[datetime], time, .date, [class*="date"]').each((i, el) => {
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
      
      const description = (
        $event.find('.description, .desc, p').first().text().trim() ||
        title
      ).substring(0, 500);
      
      const url = $event.find('a').first().attr('href') || EVENTS_URL;
      const fullUrl = url.startsWith('http') ? url : 
                     url.startsWith('/') ? `https://${new URL(EVENTS_URL).hostname}${url}` : 
                     EVENTS_URL;
      
      events.push({
        title: title,
        date: parsedDate.startDate.toISOString(),
        venue: { name: VENUE_NAME, address: VENUE_ADDRESS, city: 'Calgary' },
        location: 'Calgary, AB',
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

module.exports = palacetheatreEvents;
