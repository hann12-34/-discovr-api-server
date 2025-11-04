const { filterEvents } = require('../../utils/eventFilter');

const VENUE_NAME = "Mercury Lounge";
const VENUE_ADDRESS = '217 E Houston St, New York, NY 10002';
const axios = require('axios');
const cheerio = require('cheerio');
const { parseDateText } = require('../../utils/city-util');

async function scrapeEvents(city = 'New York') {
  console.log('🎵 Scraping Mercury Lounge events...');
  
  const events = [];
  
  try {
    const response = await axios.get('https://www.mercuryloungenyc.com/events', {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html'
      }
    });
    
    const $ = cheerio.load(response.data);
    const containers = new Set();
    
    $('.event, [class*="event"], article, .show, .performance').each((i, el) => containers.add(el));
    $('[datetime], time, .date').each((i, el) => {
      let p = $(el).parent()[0];
      for (let d = 0; d < 4 && p; d++) {
        containers.add(p);
        p = $(p).parent()[0];
      }
    });
    
    Array.from(containers).forEach((el) => {
      const $e = $(el);
      const title = ($e.find('h1, h2, h3, h4').first().text().trim() || $e.find('.title').first().text().trim() || $e.find('a').first().text().trim());
      if (!title || title.length < 5 || title.length > 200) return;
      
      let dateText = '';
      const dateEl = $e.find('[datetime]').first();
      if (dateEl.length) {
        dateText = dateEl.attr('datetime') || dateEl.text().trim();
      } else {
        dateText = $e.find('time, .date').first().text().trim();
      }
      
      if (!dateText) {
        const match = $e.text().match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}/i);
        if (match) dateText = match[0];
      }
      
      if (!dateText || dateText.length < 4) return;
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
        title,
        date: parsedDate.startDate.toISOString(),
        venue: { name: VENUE_NAME, address: VENUE_ADDRESS, city: 'New York' },
        location: 'New York, NY',
        description: title,
        url: 'https://www.mercuryloungenyc.com/events',
        category: 'Events'
      });
    });
    
    console.log(`   ✅ Extracted ${events.length} events`);
  } catch (error) {
    console.log(`   ⚠️  Error: ${error.message.substring(0, 50)}`);
  }
  
  return filterEvents(events);
}

module.exports = scrapeEvents;
