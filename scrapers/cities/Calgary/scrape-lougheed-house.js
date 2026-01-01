/**
 * Lougheed House Calgary Events Scraper
 * URL: https://www.lougheedhouse.com/events
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrape(city = 'Calgary') {
  console.log('🏛️ Scraping Lougheed House events...');

  try {
    const response = await axios.get('https://www.lougheedhouse.com/events', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
      timeout: 15000
    });

    const $ = cheerio.load(response.data);
    const events = [];
    const seenTitles = new Set();

    // Squarespace event blocks
    $('article, .eventlist-event, [class*="event"], .sqs-block').each((i, el) => {
      const $event = $(el);

      // Extract title
      let title = $event.find('h1, h2, h3, h4, [class*="title"]').first().text().trim();
      if (!title || title.length < 5) return;
      
      // Skip duplicates
      if (seenTitles.has(title.toLowerCase())) return;
      seenTitles.add(title.toLowerCase());

      // Extract date
      let eventDate = null;
      const $time = $event.find('time[datetime], [datetime]');
      if ($time.length) {
        const dt = $time.attr('datetime');
        if (dt) {
          try {
            const parsed = new Date(dt);
            if (!isNaN(parsed.getTime()) && parsed.getFullYear() >= 2025) {
              eventDate = parsed.toISOString().split('T')[0];
            }
          } catch (e) {}
        }
      }

      // Try to find date in text
      if (!eventDate) {
        const dateText = $event.text();
        const dateMatch = dateText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s*\d{4}/i);
        if (dateMatch) {
          try {
            const parsed = new Date(dateMatch[0]);
            if (!isNaN(parsed.getTime()) && parsed.getFullYear() >= 2025) {
              eventDate = parsed.toISOString().split('T')[0];
            }
          } catch (e) {}
        }
      }

      // Extract URL
      let eventUrl = $event.find('a').first().attr('href');
      if (eventUrl && !eventUrl.startsWith('http')) {
        eventUrl = 'https://www.lougheedhouse.com' + (eventUrl.startsWith('/') ? eventUrl : '/' + eventUrl);
      }

      // Extract image - Squarespace uses data-src
      let imageUrl = null;
      const img = $event.find('img').first();
      if (img.length) {
        imageUrl = img.attr('data-src') || img.attr('src') || img.attr('data-image');
        if (imageUrl && !imageUrl.startsWith('http')) {
          imageUrl = 'https:' + imageUrl;
        }
        // Filter out logos
        if (imageUrl && /logo|icon|favicon/i.test(imageUrl)) {
          imageUrl = null;
        }
      }

      if (title && (eventDate || eventUrl)) {
        events.push({
          id: uuidv4(),
          title: title,
          date: eventDate,
          url: eventUrl,
          image: imageUrl,
          imageUrl: imageUrl,
          venue: {
            name: 'Lougheed House',
            address: '707 13 Ave SW, Calgary, AB T2R 0K8',
            city: 'Calgary'
          },
          city: 'Calgary',
          category: 'Arts & Culture',
          source: 'Lougheed House'
        });
      }
    });

    console.log(`✅ Lougheed House: ${events.length} events`);
    return events;

  } catch (error) {
    console.error('  ⚠️ Lougheed House error:', error.message);
    return [];
  }
}

module.exports = scrape;
