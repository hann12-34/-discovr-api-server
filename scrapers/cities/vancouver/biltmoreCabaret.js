/**
 * Biltmore Cabaret Events Scraper
 * NO FALLBACKS - real data only
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

const BiltmoreCabaretEvents = {
  async scrape(city) {
    console.log('🔍 Scraping events from Biltmore Cabaret...');
    const events = [];
    const seenTitles = new Set();

    try {
      const response = await axios.get('https://biltmorecabaret.com/', {
        headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
        timeout: 30000
      });

      const $ = cheerio.load(response.data);

      // Find event links
      const eventUrls = new Set();
      $('a[href*="/event/"], a[href*="/events/"], a[href*="/show/"]').each((i, el) => {
        const href = $(el).attr('href');
        if (href && !href.includes('#')) {
          eventUrls.add(href.startsWith('http') ? href : 'https://biltmorecabaret.com' + href);
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
            venue: { name: 'Biltmore Cabaret', address: '2755 Prince Edward Street, Vancouver, BC V5T 3L5', city: 'Vancouver' },
            city: 'Vancouver',
            image: image,
            source: 'Biltmore Cabaret'
          });

          console.log(`  ✓ ${title} - ${dateText} ${image ? '📷' : ''}`);

        } catch (err) {}
      }

      console.log(`✅ Returning ${events.length} events from Biltmore Cabaret`);
      return events;

    } catch (error) {
      console.error('Error scraping Biltmore Cabaret:', error.message);
      return [];
    }
  }
};

module.exports = BiltmoreCabaretEvents.scrape;
