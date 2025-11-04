const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { parseDateText } = require('../../utils/city-util');

const EVENTS_URL = 'https://www.blogto.com/events/';
const VENUE_NAME = 'Distillery District';
const VENUE_ADDRESS = '55 Mill St, Toronto, ON M5A 3C4';

async function scrapeDistilleryDistrictEvents(city = 'Toronto') {
  if (city !== 'Toronto') {
    throw new Error(`City mismatch! Expected 'Toronto', got '${city}'`);
  }
  
  console.log(`� Scraping ${VENUE_NAME} events for ${city}...`);
  
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
    
    const containers = new Set();
    
    $('[datetime], time, .date, [class*="date"], [data-date]').each((i, el) => {
      containers.add($(el).parent()[0]);
      containers.add($(el).closest('article')[0]);
      containers.add($(el).closest('.event, [class*="event"]')[0]);
      containers.add($(el).closest('.card, .item, .listing')[0]);
      containers.add($(el).closest('li')[0]);
    });
    
    $('.event, [class*="event"], article, .card, .item, .listing, .program, .show, .performance, li.entry, .post').each((i, el) => {
      containers.add(el);
    });
    
    $('div:has(h1, h2, h3, h4), section:has(h1, h2, h3, h4)').each((i, el) => {
      if ($(el).text().match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i)) {
        containers.add(el);
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
        $event.find('strong, b').first().text().trim() ||
        $event.find('a').first().text().trim()
      );
      
      if (!title || title.length < 5 || title.length > 200) return;
      if (title.match(/^(Menu|Nav|Skip|Login|Subscribe|Search|Home|About)/i)) return;
      
      let dateText = '';
      dateText = $event.find('[datetime]').attr('datetime') || '';
      if (!dateText) dateText = $event.attr('datetime') || '';
      if (!dateText) {
        dateText = $event.find('[data-date]').attr('data-date') || '';
        if (!dateText) dateText = $event.attr('data-date') || '';
      }
      if (!dateText) {
        const selectors = [
          '.date', '.datetime', '.event-date', '.start-date', 
          '[class*="date"]', 'time', '.when', '.schedule', 
          '[class*="time"]', '.day', '.month', '.year'
        ];
        for (const sel of selectors) {
          dateText = $event.find(sel).first().text().trim();
          if (dateText && dateText.length > 4) break;
        }
      }
      if (!dateText || dateText.length < 4) {
        const allText = $event.text();
        const patterns = [
          /\d{4}-\d{2}-\d{2}/,
          /\d{1,2}\/\d{1,2}\/\d{4}/,
          /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}/i,
          /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}/i,
          /(Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*,?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}/i
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
        $event.find('.description, .desc, [class*="desc"]').first().text().trim() ||
        $event.find('p').first().text().trim() ||
        title
      ).substring(0, 500);
      
      const url = $event.find('a').first().attr('href') || EVENTS_URL;
      const fullUrl = url.startsWith('http') ? url : 
                     url.startsWith('/') ? `https://${EVENTS_URL.split('/')[2]}${url}` : 
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
        source: 'Web Scraper'
      });
    });
    
    console.log(`   ✅ Extracted ${events.length} events`);
    
  } catch (error) {
    if (error.response?.status === 404 || error.response?.status === 403 || error.code === 'ENOTFOUND') {
      return filterEvents([]);
    }
  }
  
  return filterEvents(events);
}

module.exports = scrapeDistilleryDistrictEvents;
