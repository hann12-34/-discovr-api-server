const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

const FoxCabaretEvents = {
  async scrape(city) {
    console.log('🔍 Scraping Fox Cabaret...');
    
    try {
      const response = await axios.get('https://www.foxcabaret.com/monthly-calendar-list', {
        headers: {'User-Agent': 'Mozilla/5.0'},
        timeout: 15000
      });
      
      const $ = cheerio.load(response.data);
      const events = [];
      const seen = new Set();
      
      $('article.eventlist-event').each((i, el) => {
        const $el = $(el);
        
        // Get event name
        const titleEl = $el.find('.eventlist-title, h1, .title').first();
        const title = titleEl.text().trim();
        
        // Get date
        const dateEl = $el.find('.eventlist-datetag-startdate, .event-date, time').first();
        const dateText = dateEl.text().trim();
        
        // Get time  
        const timeEl = $el.find('.eventlist-datetag-time, .event-time').first();
        const timeText = timeEl.text().trim();
        
        // Get URL
        const linkEl = $el.find('a').first();
        const url = linkEl.attr('href');
        
        // Parse date from text like "Oct 2" or "Oct\n2"
        const fullText = $el.text();
        const dateMatch = fullText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{1,2})/i);
        
        let eventDate = null;
        if (dateMatch) {
          const months = {jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12'};
          const month = months[dateMatch[1].toLowerCase().substring(0,3)];
          const day = dateMatch[2].padStart(2, '0');
          const year = new Date().getFullYear();
          eventDate = `${year}-${month}-${day}`;
        }
        
        // Use title or fallback to date+time
        const eventTitle = title || (dateText + ' ' + timeText).trim() || `Fox Cabaret Event ${eventDate}`;
        
        if (eventTitle && eventTitle.length > 2 && !seen.has(eventTitle + eventDate)) {
          seen.add(eventTitle + eventDate);
          
          events.push({
            id: uuidv4(),
            title: eventTitle,
            description: eventTitle + ' at Fox Cabaret Vancouver.',
            date: eventDate,
            url: url && url.startsWith('http') ? url : (url ? 'https://www.foxcabaret.com' + url : 'https://www.foxcabaret.com'),
            venue: { name: 'Fox Cabaret', address: 'Vancouver', city: 'Vancouver' },
            city: 'Vancouver',
            source: 'Fox Cabaret'
          });
          
          console.log(`✓ ${eventTitle} | ${eventDate || 'NO DATE'}`);
        }
      });
      
      console.log(`\n✅ Found ${events.length} Fox Cabaret events`);
      return events;
      
    } catch (error) {
      console.error('Error:', error.message);
      return [];
    }
  }
};

module.exports = FoxCabaretEvents;
