/**
 * Canada Place Events Scraper
 * NO FALLBACKS - real data only
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

const CanadaPlaceEvents = {
  async scrape(city) {
    console.log('🔍 Scraping events from Canada Place...');
    const events = [];
    const seenTitles = new Set();

    try {
      const response = await axios.get('https://www.canadaplace.ca/events/', {
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml'
        },
        timeout: 30000
      });

      const $ = cheerio.load(response.data);

      // Find event URLs
      const eventUrls = new Set();
      $('a[href*="/events/"], a[href*="event"]').each((i, el) => {
        const href = $(el).attr('href');
        if (href && !href.endsWith('/events/') && !href.includes('#')) {
          eventUrls.add(href.startsWith('http') ? href : 'https://www.canadaplace.ca' + href);
        }
      });

      console.log(`  Found ${eventUrls.size} event URLs`);

      for (const url of Array.from(eventUrls)) {
        try {
          await new Promise(r => setTimeout(r, 300));
          const page = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
            timeout: 15000
          });

          const $p = cheerio.load(page.data);

          let title = $p('meta[property="og:title"]').attr('content') || $p('h1').first().text().trim();
          if (!title || title.length < 3 || seenTitles.has(title)) continue;
          if (['Canada Place', 'Events', 'Home'].includes(title)) continue;
          seenTitles.add(title);

          const image = $p('meta[property="og:image"]').attr('content') || null;

          let dateText = null;
          const pageText = $p('body').text();
          const datePatterns = [
            /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:\s*[-–]\s*\d{1,2})?,?\s*\d{4}/gi,
            /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}(?:\s*[-–]\s*\d{1,2})?,?\s*\d{4}/gi
          ];

          for (const pattern of datePatterns) {
            const match = pageText.match(pattern);
            if (match && match[0]) {
              dateText = match[0].trim();
              break;
            }
          }

          if (!dateText) continue;

          events.push({
            id: uuidv4(),
            title: title,
            date: dateText,
            url: url,
            venue: { name: 'Canada Place', address: '999 Canada Place, Vancouver, BC V6C 3B5', city: 'Vancouver' },
            city: 'Vancouver',
            image: image,
            source: 'Canada Place'
          });

          console.log(`  ✓ ${title} - ${dateText} ${image ? '📷' : ''}`);

        } catch (err) {}
      }

      console.log(`✅ Returning ${events.length} events from Canada Place`);
      return events;

    } catch (error) {
      console.error('Error scraping Canada Place:', error.message);
      return [];
    }
  }
};

module.exports = CanadaPlaceEvents.scrape;
