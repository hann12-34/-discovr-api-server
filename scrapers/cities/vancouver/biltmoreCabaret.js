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

          // Extract description from detail page
          let description = $p('meta[property="og:description"]').attr('content') || '';
          if (!description || description.length < 20) {
            for (const sel of ['.event-description', '.description', '.entry-content', '.event-content', '.event-details', 'article p', '.content p']) {
              const t = $p(sel).first().text().trim();
              if (t && t.length > 30) { description = t; break; }
            }
          }
          if (description) {
            description = description.replace(/\s+/g, ' ').trim();
            if (description.length > 500) description = description.substring(0, 500) + '...';
          }

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
            description: description || '',
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

      // Fetch descriptions from event detail pages
      for (const event of events) {
        if (event.description || !event.url || !event.url.startsWith('http')) continue;
        try {
          const _r = await axios.get(event.url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
            timeout: 8000
          });
          const _$ = cheerio.load(_r.data);
          let _desc = _$('meta[property="og:description"]').attr('content') || '';
          if (!_desc || _desc.length < 20) {
            _desc = _$('meta[name="description"]').attr('content') || '';
          }
          if (!_desc || _desc.length < 20) {
            for (const _s of ['.event-description', '.event-content', '.entry-content p', '.description', 'article p', '.content p', '.page-content p']) {
              const _t = _$(_s).first().text().trim();
              if (_t && _t.length > 30) { _desc = _t; break; }
            }
          }
          if (_desc) {
            _desc = _desc.replace(/\s+/g, ' ').trim();
            if (_desc.length > 500) _desc = _desc.substring(0, 500) + '...';
            event.description = _desc;
          }
        } catch (_e) { /* skip */ }
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
