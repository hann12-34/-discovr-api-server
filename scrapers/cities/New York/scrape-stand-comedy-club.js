const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { parseDateText } = require('../../utils/city-util');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping The Stand NYC events...');
  const events = [];
  
  try {
    const response = await axios.get('https://thestandnyc.com/calendar/', {
      timeout: 15000,
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }
    });
    
    const $ = cheerio.load(response.data);
    $('.event, [class*="event"], article, .show, .performance, [data-event]').each((i, el) => {
      if (i > 50) return false;
      const $e = $(el);
      const title = ($e.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim() || $e.find('a').first().text().trim());
      if (!title || title.length < 5 || title.length > 250 || title.match(/^(Menu|Nav|Skip|Login)/i)) return;
      
      let dateText = $e.find('[datetime]').attr('datetime') || $e.find('time, .date').first().text().trim();
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
        title, date: parsedDate.startDate.toISOString(),
        venue: { name: 'The Stand NYC', address: '239 3rd Ave New York NY 10003', city: 'New York' },
        location: 'New York, NY', description: title, url: 'https://thestandnyc.com/calendar/', category: 'Events'
      });
    });
    
    console.log(`   ✅ Extracted ${events.length} events`);
  } catch (error) {
    console.log(`   ⚠️  Error: ${error.message.substring(0, 50)}`);
  }
  
  return filterEvents(events);
}

module.exports = scrapeEvents;
