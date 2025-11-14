const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎵 Scraping Lee\'s Palace events...');
  const events = [];
  const seenUrls = new Set();

  try {
    const response = await axios.get('https://www.leespalace.com/events', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 15000
    });

    const $ = cheerio.load(response.data);
    
    $('.event, .show, [class*="event-list"]').each((i, elem) => {
      try {
        const $event = $(elem);
        
        let title = $event.find('.event-title, .headliners, h2, h3, [class*="title"]').first().text().trim();
        let url = $event.find('a').first().attr('href');
        let dateText = $event.find('.date, time, [class*="date"]').first().text().trim();
        
        if (!title || !url || title.length < 3) return;
        
        if (url && !url.startsWith('http')) {
          url = 'https://www.leespalace.com' + url;
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
            name: 'Lee\'s Palace',
            address: '529 Bloor St W, Toronto, ON M5S 1Y5',
            city: 'Toronto'
          },
          city: city,
          source: 'Lee\'s Palace',
          categories: ['Concert', 'Music', 'Nightlife']
        });
      } catch (err) {
        // Skip
      }
    });

    console.log(`✅ Lee's Palace: ${events.length} events`);
    return filterEvents(events);

  } catch (error) {
    console.error('Error scraping Lee\'s Palace:', error.message);
    return [];
  }
}

module.exports = scrapeEvents;
