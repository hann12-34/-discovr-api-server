/**
 * Palace Theatre Calgary (Improved Squarespace Scraper)
 * Major Calgary music venue - categorized as Nightlife
 * URL: https://thepalacetheatre.ca/events/
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrape(city = 'Calgary') {
  console.log('🎪 Scraping Palace Theatre events...');

  try {
    const response = await axios.get('https://thepalacetheatre.ca/events/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml'
      },
      timeout: 15000
    });

    const $ = cheerio.load(response.data);
    const events = [];
    const seenUrls = new Set();

    // Squarespace eventlist
    $('.eventlist-event, .eventlist .event-item, article').each((i, el) => {
      const $event = $(el);

      // Extract title
      let title = $event.find('h1, h2, h3, .eventlist-title, [class*="title"]').first().text().trim();
      
      if (!title || title.length < 3) return;

      // Extract date - Squarespace format
      let eventDate = null;
      const $dateEl = $event.find('time[datetime], [datetime]');
      if ($dateEl.length) {
        const datetime = $dateEl.attr('datetime');
        if (datetime) {
          try {
            const parsed = new Date(datetime);
            if (!isNaN(parsed.getTime()) && parsed.getFullYear() >= 2025) {
              eventDate = parsed.toISOString().split('T')[0];
            }
          } catch (e) {}
        }
      }

      // Try date from eventlist-datetag
      if (!eventDate) {
        const month = $event.find('.eventlist-datetag-startdate--month').text().trim();
        const day = $event.find('.eventlist-datetag-startdate--day').text().trim();
        if (month && day) {
          const now = new Date();
          const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
          const monthNum = monthNames.indexOf(month.toLowerCase().slice(0, 3));
          if (monthNum >= 0) {
            const year = (monthNum < now.getMonth()) ? now.getFullYear() + 1 : now.getFullYear();
            eventDate = `${year}-${String(monthNum + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          }
        }
      }

      // Extract URL
      let eventUrl = $event.find('a').first().attr('href');
      if (eventUrl) {
        if (!eventUrl.startsWith('http')) {
          eventUrl = 'https://thepalacetheatre.ca' + (eventUrl.startsWith('/') ? eventUrl : '/' + eventUrl);
        }
      } else {
        eventUrl = 'https://thepalacetheatre.ca/events/';
      }

      // Skip duplicates
      if (seenUrls.has(eventUrl)) return;
      seenUrls.add(eventUrl);

      // Extract image
      const img = $event.find('img').first();
      let imageUrl = null;
      if (img.length) {
        imageUrl = img.attr('src') || img.attr('data-src') || img.attr('data-image');
        if (imageUrl && !imageUrl.startsWith('http')) {
          imageUrl = 'https://thepalacetheatre.ca' + (imageUrl.startsWith('/') ? imageUrl : '/' + imageUrl);
        }
      }

      events.push({
        id: uuidv4(),
        title: title,
        date: eventDate,
        url: eventUrl,
        imageUrl: imageUrl,
        venue: {
          name: 'Palace Theatre',
          address: '219 8 Ave SW, Calgary, AB T2P 1B5',
          city: 'Calgary'
        },
        city: 'Calgary',
        category: 'Nightlife',  // Categorize as Nightlife
        source: 'Palace Theatre'
      });
    });

    console.log(`✅ Palace Theatre: ${events.length} events`);
    return filterEvents(events);

  } catch (error) {
    console.error('  ⚠️  Palace Theatre error:', error.message);
    return [];
  }
}

module.exports = scrape;
