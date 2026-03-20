/**
 * The Cultch Events Scraper
 * Scrapes upcoming events from The Cultch
 * Vancouver's cultural centre for performing arts
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

const TheCultchEvents = {
  async scrape(city) {
    console.log('🔍 Scraping events from The Cultch...');

    try {
      const response = await axios.get('https://thecultch.com/whats-on/', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        timeout: 30000
      });

      const $ = cheerio.load(response.data);
      const events = [];
      const seenUrls = new Set();

      // Find all event links from the whats-on page
      $('a[href*="/event/"]').each((i, el) => {
        const url = $(el).attr('href');
        if (!url || seenUrls.has(url)) return;
        if (url.includes('event-and-venue-policy')) return;
        seenUrls.add(url);
      });

      console.log(`Found ${seenUrls.size} unique event URLs`);

      // Fetch each event page to get details
      const eventUrls = Array.from(seenUrls);
      for (const url of eventUrls.slice(0, 20)) { // Limit to 20 events
        try {
          await new Promise(r => setTimeout(r, 300)); // Rate limit
          const eventPage = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
            timeout: 15000
          });
          
          const $e = cheerio.load(eventPage.data);
          
          // Extract title from og:title or page title
          let title = $e('meta[property="og:title"]').attr('content') ||
                      $e('title').text().split('|')[0].split('–')[0].trim();
          
          // Skip generic pages
          if (!title || title.length < 3) continue;
          if (['What\'s On', 'Holiday Gift Guide', 'The Cultch', 'Events'].includes(title)) continue;
          
          // Extract image
          let image = null;
          const ogImage = $e('meta[property="og:image"]').attr('content');
          if (ogImage) {
            image = ogImage;
          } else {
            const firstImg = $e('img[src*="uploads"]').first().attr('src');
            if (firstImg) image = firstImg;
          }
          
          // Extract description from detail page
          let description = $e('meta[property="og:description"]').attr('content') || '';
          if (!description || description.length < 20) {
            for (const sel of ['.show-description', '.event-description', '.entry-content p', '.event-content', '.description', 'article p', '.content p', '.page-content p']) {
              const t = $e(sel).first().text().trim();
              if (t && t.length > 30) { description = t; break; }
            }
          }
          if (description) {
            description = description.replace(/\s+/g, ' ').trim();
            if (description.length > 500) description = description.substring(0, 500) + '...';
          }

          // Extract dates - look for date patterns in page text
          let dateText = null;
          const pageText = $e('body').text();
          
          // Look for date patterns like "December 5-22, 2024" or "Jan 15 - Feb 20, 2025"
          const datePatterns = [
            /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:\s*[-–]\s*(?:January|February|March|April|May|June|July|August|September|October|November|December)?\s*\d{1,2})?,?\s*\d{4}/gi,
            /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}(?:\s*[-–]\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)?\s*\d{1,2})?,?\s*\d{4}/gi,
            /\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}/gi
          ];
          
          for (const pattern of datePatterns) {
            const match = pageText.match(pattern);
            if (match && match[0]) {
              dateText = match[0].trim();
              break;
            }
          }
          
          // If no year found, try patterns without year and add current/next year
          if (!dateText) {
            const noYearPatterns = [
              /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:\s*[-–]\s*\d{1,2})?/gi
            ];
            for (const pattern of noYearPatterns) {
              const match = pageText.match(pattern);
              if (match && match[0]) {
                const currentYear = new Date().getFullYear();
                dateText = `${match[0].trim()}, ${currentYear}`;
                break;
              }
            }
          }
          
          if (!dateText) {
            console.log(`  ⚠️ No date found for: ${title}`);
            continue;
          }
          
          events.push({
            id: uuidv4(),
            title: title,
            description: description || '',
            date: dateText,
            url: url,
            venue: { name: 'The Cultch', address: '1895 Venables Street, Vancouver, BC V5L 2H6', city: 'Vancouver' },
            city: 'Vancouver',
            location: 'Vancouver, BC',
            image: image,
            source: 'The Cultch'
          });
          
          console.log(`  ✓ ${title} - ${dateText}`);
          
        } catch (err) {
          console.log(`  ✗ Failed to fetch: ${url}`);
        }
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


      console.log(`✅ Returning ${events.length} valid events from The Cultch`);
      return events;

    } catch (error) {
      console.error('Error scraping The Cultch events:', error.message);
      return [];
    }
  }
};

module.exports = TheCultchEvents.scrape;
