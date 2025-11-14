const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎸 Scraping Budweiser Stage events...');
  const events = [];
  const seenUrls = new Set();

  try {
    const response = await axios.get('https://www.livenation.com/venue/KovZpZAEA6vA/budweiser-stage-events', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 15000
    });

    const $ = cheerio.load(response.data);
    
    $('.event-card, .event-listing, [class*="event"]').each((i, elem) => {
      try {
        const $event = $(elem);
        
        let title = $event.find('.event-name, .event-title, h2, h3, [class*="title"]').first().text().trim();
        let url = $event.find('a').first().attr('href');
        let dateText = $event.find('.event-date, time, [class*="date"]').first().text().trim();
        
        if (!title || !url || title.length < 3) return;
        
        if (url && !url.startsWith('http')) {
          url = 'https://www.livenation.com' + url;
        }
        
        if (seenUrls.has(url)) return;
        seenUrls.add(url);
        
        // Clean and add year to date
        if (dateText) {
          dateText = dateText
            .replace(/\n/g, ' ')
            .replace(/\s+/g, ' ')
            .replace(/(\d+)(st|nd|rd|th)/gi, '$1')
            .trim();
          
          if (!/\d{4}/.test(dateText)) {
            const currentYear = new Date().getFullYear();
            const currentMonth = new Date().getMonth();
            const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
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

        events.push({
          id: uuidv4(),
          title: title,
          url: url,
          date: dateText || 'TBA',
          venue: {
            name: 'Budweiser Stage',
            address: '909 Lake Shore Blvd W, Toronto, ON M6K 3L3',
            city: 'Toronto'
          },
          city: city,
          source: 'Budweiser Stage',
          categories: ['Concert', 'Music']
        });
      } catch (err) {
        // Skip
      }
    });

    console.log(`✅ Budweiser Stage: ${events.length} events`);
    return filterEvents(events);

  } catch (error) {
    console.error('Error scraping Budweiser Stage:', error.message);
    return [];
  }
}

module.exports = scrapeEvents;
