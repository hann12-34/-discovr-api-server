const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { parseDateText } = require('../../utils/city-util');

async function scrapeEvents(city = 'New York') {
  console.log('🎵 Scraping Knitting Factory events...');
  const events = [];
  
  try {
    const response = await axios.get('https://bk.knittingfactory.com/calendar/', {
      timeout: 15000,
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }
    });
    
    const $ = cheerio.load(response.data);
    $('.event, [class*="event"], article, .show').each((i, el) => {
      if (i > 50) return false;
      const $e = $(el);
      const title = ($e.find('h1, h2, h3, h4').first().text().trim() || $e.find('.title').first().text().trim());
      if (!title || title.length < 5) return;
      
      let dateText = $e.find('[datetime]').attr('datetime') || $e.find('time, .date').first().text().trim();
      if (!dateText) {
        const match = $e.text().match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}/i);
        if (match) dateText = match[0];
      }
      
      if (!dateText) return;
      const parsedDate = parseDateText(dateText);
      if (!parsedDate || !parsedDate.startDate) return;
      
      events.push({
        title, date: parsedDate.startDate.toISOString(),
        venue: { name: 'Knitting Factory Brooklyn', address: '361 Metropolitan Ave, Brooklyn, NY 11211', city: 'New York' },
        location: 'New York, NY', description: title,
        url: 'https://bk.knittingfactory.com/calendar/', category: 'Events'
      });
    });
    
    console.log(`   ✅ Extracted ${events.length} events`);
  } catch (error) {
    console.log(`   ⚠️  Error: ${error.message.substring(0, 50)}`);
  }
  
  return filterEvents(events);
}

module.exports = scrapeEvents;
