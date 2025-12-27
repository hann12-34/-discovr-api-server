/**
 * Bard on the Beach Scraper
 * Scrapes events from Bard on the Beach Shakespeare Festival
 * NO FALLBACKS - real data only
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

const BardOnTheBeachEvents = {
  async scrape(city) {
    console.log('🔍 Scraping events from Bard on the Beach...');
    const events = [];
    const seenTitles = new Set();

    try {
      // Get the shows page
      const response = await axios.get('https://bardonthebeach.org/whats-on/', {
        headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
        timeout: 30000
      });

      const $ = cheerio.load(response.data);
      
      // Find show URLs
      const showUrls = new Set();
      $('a[href*="/whats-on/"]').each((i, el) => {
        const href = $(el).attr('href');
        if (href && href.includes('/whats-on/') && !href.endsWith('/whats-on/') && !href.includes('#')) {
          showUrls.add(href.startsWith('http') ? href : 'https://bardonthebeach.org' + href);
        }
      });

      console.log(`  Found ${showUrls.size} show URLs`);

      // Fetch each show page for details
      for (const url of Array.from(showUrls)) {
        try {
          await new Promise(r => setTimeout(r, 300));
          const page = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
            timeout: 15000
          });

          const $p = cheerio.load(page.data);
          
          // Get title from og:title
          let title = $p('meta[property="og:title"]').attr('content');
          if (!title) title = $p('h1').first().text().trim();
          if (!title || title.length < 3 || seenTitles.has(title)) continue;
          if (['Bard on the Beach', 'What\'s On', 'Home'].includes(title)) continue;
          seenTitles.add(title);

          // Get image from og:image ONLY
          const image = $p('meta[property="og:image"]').attr('content') || null;

          // Extract date - look for specific date patterns
          let dateText = null;
          const pageText = $p('body').text();
          
          // Look for date range patterns: "June 5 - September 21, 2025"
          const datePatterns = [
            /(?:June|July|August|September)\s+\d{1,2}\s*[-–]\s*(?:June|July|August|September)?\s*\d{1,2},?\s*\d{4}/gi,
            /(?:June|July|August|September)\s+\d{1,2},?\s*\d{4}/gi
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
            venue: { name: 'Bard on the Beach', address: '1695 Whyte Avenue, Vancouver, BC V6J 1B3', city: 'Vancouver' },
            city: 'Vancouver',
            image: image,
            source: 'Bard on the Beach'
          });

          console.log(`  ✓ ${title} - ${dateText} ${image ? '��' : ''}`);

        } catch (err) {
          // Skip failed pages silently
        }
      }

      console.log(`✅ Returning ${events.length} events from Bard on the Beach`);
      return events;

    } catch (error) {
      console.error('Error scraping Bard on the Beach:', error.message);
      return [];
    }
  }
};

module.exports = BardOnTheBeachEvents.scrape;
