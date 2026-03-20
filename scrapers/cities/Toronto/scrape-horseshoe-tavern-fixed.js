const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrapeEvents(city = 'Toronto') {
  console.log('🐴 Scraping Horseshoe Tavern events...');
  const events = [];
  const seenTitles = new Set();

  try {
    const response = await axios.get('https://www.horseshoetavern.com/events', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 15000
    });

    const $ = cheerio.load(response.data);
    
    // Find all event cards - they have class containing "event"
    $('[class*="event"]').each((i, elem) => {
      try {
        const $event = $(elem);
        
        // Get full text and parse it
        const fullText = $event.text().trim();
        
        if (!fullText || fullText.length < 10) return;
        
        // Extract title (first line before date/door time)
        const lines = fullText.split(/\n/).map(l => l.trim()).filter(l => l);
        let title = lines[0];
        
        if (!title || title.length < 3 || title.length > 150) return;
        
        // Clean title - remove date patterns
        title = title.replace(/\s+(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),.*$/i, '').trim();
        title = title.replace(/\s+\d{1,2}\/\d{1,2}\/\d{4}.*$/i, '').trim();
        
        // Clean title
        title = title.split(/\n/)[0].split('–')[0].split('-')[0].trim();
        
        // Skip junk
        const junkPatterns = [
          /^(View|Show|Event|More|See All|Filter|Sort|Menu|Buy)/i,
          /^(Today|Tomorrow|This Week)/i,
          /^(Past|Upcoming) Events?$/i,
          /^All Events$/i,
          /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s/i, // Date-only titles
          /Door Time:/i,  // Partial event text
          /\$\d+\.\d+/,  // Just a price
          /TicketsSold/i  // Ticket info leaked into title
        ];
        
        if (junkPatterns.some(p => p.test(title))) return;
        
        // Additional validation - must have letters
        // Note: Don't filter by length - many artists have short names (Beck, Tool, etc.)
        if (!/[a-zA-Z]{2,}/.test(title)) {
          return;
        }
        
        // Avoid duplicates
        const titleKey = title.toLowerCase().trim();
        if (seenTitles.has(titleKey)) return;
        seenTitles.add(titleKey);
        
        // Extract date from text - look for day name followed by date
        let dateText = '';
        const dateMatch = fullText.match(/(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+([A-Za-z]+\s+\d{1,2},\s+\d{4})/i);
        
        if (dateMatch) {
          dateText = dateMatch[2]; // Just the "November 10, 2025" part
        } else {
          // Try to find any date pattern
          const dateMatch2 = fullText.match(/([A-Za-z]+\s+\d{1,2},\s+\d{4})/);
          if (dateMatch2) {
            dateText = dateMatch2[1];
          }
        }
        
        // Clean date
        if (dateText) {
          dateText = dateText
            .split(/\n/)[0]
            .replace(/(\d+)(st|nd|rd|th)/gi, '$1')
            .replace(/\s+/g, ' ')
            .trim();
          
          // Add year if missing
          if (!/\d{4}/.test(dateText)) {
            const currentYear = new Date().getFullYear();
            const currentMonth = new Date().getMonth();
            const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
            const dateLower = dateText.toLowerCase();
            const monthIndex = months.findIndex(m => dateLower.includes(m));
            if (monthIndex !== -1) {
              const year = monthIndex < currentMonth ? currentYear + 1 : currentYear;
              dateText = `${dateText}, ${year}`;
            } else {
              dateText = `${dateText}, ${currentYear}`;
            }
          }
        }
        
        if (!dateText || dateText.length < 5) return;
        
        // Extract URL
        let url = $event.find('a').first().attr('href');
        if (url && !url.startsWith('http')) {
          url = 'https://www.horseshoetavern.com' + url;
        }
        if (!url) url = 'https://www.horseshoetavern.com/events';
        
        events.push({
          id: uuidv4(),
          title: title,
            description: '',
          date: dateText,
          venue: { 
            name: 'Horseshoe Tavern', 
            address: '370 Queen St W, Toronto, ON M5V 2A2',
            city: city 
          },
          url: url,
          source: 'Horseshoe Tavern',
          categories: ['Music', 'Live Performance']
        });
      } catch (err) {
        // Skip
      }
    });

      // Fetch descriptions from event detail pages
      for (const event of events) {
        if (event.description || !event.url || !event.url.startsWith('http')) continue;
        try {
          const _r = await axios.get(event.url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
            timeout: 8000
          });
          const _$ = cheerio.load(_r.data);
          let _desc = _$('meta[property="og:description"]').attr('content') || '';
          if (!_desc || _desc.length < 20) {
            _desc = _$('meta[name="description"]').attr('content') || '';
          }
          if (!_desc || _desc.length < 20) {
            for (const _s of ['.event-description', '.event-content', '.entry-content p', '.description', 'article p', '.content p', '.page-content p']) {
              const _t = _$(_s).first().text().trim();
              if (_t && _t.length > 30) { _desc = _t; break; }
            }
          }
          if (_desc) {
            _desc = _desc.replace(/\s+/g, ' ').trim();
            if (_desc.length > 500) _desc = _desc.substring(0, 500) + '...';
            event.description = _desc;
          }
        } catch (_e) { /* skip */ }
      }


    console.log(`✅ Horseshoe Tavern: ${events.length} events`);
    return events;

  } catch (error) {
    console.error('Error scraping Horseshoe Tavern:', error.message);
    return [];
  }
}

module.exports = scrapeEvents;
