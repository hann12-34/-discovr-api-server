/**
 * PNE Events Scraper
 * Scrapes events from PNE (Pacific National Exhibition)
 * NO FALLBACKS - real data only
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

const PNEEvents = {
  async scrape(city) {
    console.log('🔍 Scraping events from PNE...');
    const events = [];
    const seenTitles = new Set();

    try {
      const response = await axios.get('https://www.pne.ca/events/', {
        headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
        timeout: 30000
      });

      const $ = cheerio.load(response.data);

      // Find event URLs
      const eventUrls = new Set();
      $('a[href*="/events/"]').each((i, el) => {
        const href = $(el).attr('href');
        if (href && href.includes('/events/') && !href.endsWith('/events/') && !href.includes('#')) {
          eventUrls.add(href.startsWith('http') ? href : 'https://www.pne.ca' + href);
        }
      });

      console.log(`  Found ${eventUrls.size} event URLs`);

      // Fetch each event page
      for (const url of Array.from(eventUrls)) {
        try {
          await new Promise(r => setTimeout(r, 300));
          const page = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
            timeout: 15000
          });

          const $p = cheerio.load(page.data);

          // Get title
          let title = $p('meta[property="og:title"]').attr('content') || $p('h1').first().text().trim();
          if (!title || title.length < 3 || seenTitles.has(title)) continue;
          if (['PNE', 'Events', 'Home', 'Page not found'].includes(title)) continue;
          seenTitles.add(title);

          // Get image from og:image ONLY
          const image = $p('meta[property="og:image"]').attr('content') || null;

          // Extract date
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

          if (!dateText) {
            console.log(`  ⚠️ No valid date for: ${title}`);
            continue;
          }

          events.push({
            id: uuidv4(),
            title: title,
            date: dateText,
            url: url,
            venue: { name: 'PNE', address: '2901 East Hastings Street, Vancouver, BC V5K 5J1', city: 'Vancouver' },
            city: 'Vancouver',
            image: image,
            source: 'PNE'
          });

          console.log(`  ✓ ${title} - ${dateText} ${image ? '📷' : ''}`);

        } catch (err) {
          // Skip failed pages
        }
      }

      console.log(`✅ Returning ${events.length} events from PNE`);
      return events;

    } catch (error) {
      console.error('Error scraping PNE:', error.message);
      return [];
    }
  }
};

module.exports = PNEEvents.scrape;
