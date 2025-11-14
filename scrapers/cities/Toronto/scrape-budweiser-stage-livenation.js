const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎸 Scraping Budweiser Stage (LiveNation) events...');
  const events = [];
  const seenTitles = new Set();

  try {
    const response = await axios.get('https://www.livenation.com/venue/KovZpZAEkkIA/budweiser-stage-events', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 15000
    });

    const $ = cheerio.load(response.data);
    
    // LiveNation structure - find event cards
    $('[class*="EventCard"], [class*="event"], article, .event-item').each((i, elem) => {
      try {
        const $event = $(elem);
        
        // Extract title
        let title = $event.find('h3, h4, .event-name, [class*="title"], [class*="name"]').first().text().trim();
        
        if (!title || title.length < 3 || title.length > 150) return;
        
        // Clean title
        title = title.split(/\n/)[0].trim();
        
        // Skip junk
        const junkPatterns = [
          /^(View|Show|Event|More|See All|Filter|Sort|Menu|Buy)/i,
          /^(Today|Tomorrow|This Week)/i,
          /^Advertisement$/i
        ];
        
        if (junkPatterns.some(p => p.test(title))) return;
        
        // Avoid duplicates
        const titleKey = title.toLowerCase().trim();
        if (seenTitles.has(titleKey)) return;
        seenTitles.add(titleKey);
        
        // Extract date
        let dateText = $event.find('time, .event-date, [class*="date"]').first().text().trim();
        
        if (!dateText) {
          // Try datetime attribute
          const timeEl = $event.find('[datetime]').first();
          if (timeEl.length) {
            dateText = timeEl.attr('datetime') || timeEl.text().trim();
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
          url = 'https://www.livenation.com' + url;
        }
        if (!url) url = 'https://www.budweiser-stage.com/';
        
        events.push({
          id: uuidv4(),
          title: title,
          date: dateText,
          venue: { 
            name: 'Budweiser Stage', 
            address: '909 Lake Shore Blvd W, Toronto, ON M6K 3L3',
            city: city 
          },
          url: url,
          source: 'Budweiser Stage',
          categories: ['Concert', 'Music']
        });
      } catch (err) {
        // Skip
      }
    });

    console.log(`✅ Budweiser Stage: ${events.length} events`);
    return events;

  } catch (error) {
    console.error('Error scraping Budweiser Stage:', error.message);
    return [];
  }
}

module.exports = scrapeEvents;
