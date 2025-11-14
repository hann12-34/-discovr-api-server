const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎵 Scraping Massey Hall & Roy Thomson Hall events...');
  const events = [];
  const seenTitles = new Set();

  try {
    const response = await axios.get('https://roythomsonhall.mhrth.com/tickets/', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 15000
    });

    const $ = cheerio.load(response.data);
    
    // Find all event cards
    $('[class*="show"], [class*="event"], article, .card').each((i, elem) => {
      try {
        const $event = $(elem);
        
        // Extract title
        let title = $event.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
        
        if (!title || title.length < 3 || title.length > 150) return;
        
        // Skip junk titles
        const junkPatterns = [
          /^(View|Show|Event|More|See All|Filter|Sort)/i,
          /^(Today|Tomorrow|This Week)/i
        ];
        
        if (junkPatterns.some(p => p.test(title))) return;
        
        // Avoid duplicates
        const titleKey = title.toLowerCase().trim();
        if (seenTitles.has(titleKey)) return;
        seenTitles.add(titleKey);
        
        // Extract date
        let dateText = $event.find('time, .date, [class*="date"], [datetime]').first().text().trim();
        if (!dateText) {
          dateText = $event.find('[class*="when"]').first().text().trim();
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
            }
          }
        }
        
        if (!dateText || dateText.length < 5) return;
        
        // Extract URL
        let url = $event.find('a').first().attr('href');
        if (url && !url.startsWith('http')) {
          url = 'https://roythomsonhall.mhrth.com' + url;
        }
        if (!url) url = 'https://roythomsonhall.mhrth.com/tickets/';
        
        // Determine venue from title/content
        const isRTH = title.toLowerCase().includes('tso') || 
                      title.toLowerCase().includes('symphony') ||
                      title.toLowerCase().includes('orchestra') ||
                      $event.text().toLowerCase().includes('roy thomson');
        
        const venueName = isRTH ? 'Roy Thomson Hall' : 'Massey Hall';
        const address = isRTH ? '60 Simcoe St, Toronto, ON M5J 2H5' : '178 Victoria St, Toronto, ON M5B 1T7';
        
        events.push({
          id: uuidv4(),
          title: title,
          date: dateText,
          venue: { name: venueName, address: address, city: city },
          url: url,
          source: venueName,
          categories: ['Music', 'Concert']
        });
      } catch (err) {
        // Skip
      }
    });

    console.log(`✅ MHRTH: ${events.length} events`);
    return events;

  } catch (error) {
    console.error('Error scraping MHRTH:', error.message);
    return [];
  }
}

module.exports = scrapeEvents;
