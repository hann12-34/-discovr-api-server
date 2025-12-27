/**
 * Twelve West Events Scraper
 * NO FALLBACKS - real data only
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

const TwelveWestEvents = {
  async scrape(city) {
    console.log('�� Scraping events from Twelve West...');
    const events = [];
    const seenTitles = new Set();

    try {
      const response = await axios.get('https://twelvewest.ca/collections/upcoming-events', {
        headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
        timeout: 30000
      });

      const $ = cheerio.load(response.data);

      // Find product URLs (Shopify store)
      const productUrls = new Set();
      $('a[href*="/products/"]').each((i, el) => {
        const href = $(el).attr('href');
        if (href && !href.includes('#')) {
          productUrls.add(href.startsWith('http') ? href : 'https://twelvewest.ca' + href);
        }
      });

      console.log(`  Found ${productUrls.size} product URLs`);

      for (const url of Array.from(productUrls)) {
        try {
          await new Promise(r => setTimeout(r, 300));
          const page = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
            timeout: 15000
          });

          const $p = cheerio.load(page.data);

          let title = $p('meta[property="og:title"]').attr('content') || $p('h1').first().text().trim();
          if (!title || title.length < 3 || seenTitles.has(title)) continue;
          // Skip generic weekly events
          if (title.includes('Famous Friday') || title.includes('Saturday')) continue;
          seenTitles.add(title);

          const image = $p('meta[property="og:image"]').attr('content') || null;

          // Extract date from title or page
          let dateText = null;
          const pageText = $p('body').text();
          
          const datePatterns = [
            /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?,?\s*\d{4}/gi,
            /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}(?:st|nd|rd|th)?,?\s*\d{4}/gi
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
            venue: { name: 'Twelve West', address: '1184 Denman Street, Vancouver, BC V6G 2M9', city: 'Vancouver' },
            city: 'Vancouver',
            image: image,
            source: 'Twelve West'
          });

          console.log(`  ✓ ${title} - ${dateText} ${image ? '📷' : ''}`);

        } catch (err) {}
      }

      console.log(`✅ Returning ${events.length} events from Twelve West`);
      return events;

    } catch (error) {
      console.error('Error scraping Twelve West:', error.message);
      return [];
    }
  }
};

module.exports = TwelveWestEvents.scrape;
