/**
 * Troubadour Scraper
 * Historic live music venue in West Hollywood
 * URL: https://troubadour.com/calendar/
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapeTroubadour(city = 'Los Angeles') {
  console.log('🎶 Scraping Troubadour...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://troubadour.com/calendar/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      // Find all SeeTickets event links that contain actual titles (not images)
      const links = document.querySelectorAll('a[href*="seetickets.us/event"]');
      
      links.forEach(link => {
        const href = link.getAttribute('href');
        if (!href || seen.has(href)) return;
        
        // Get event title - skip if it's just an image
        let title = link.textContent.trim().replace(/<[^>]*>/g, '');
        
        // Skip image-only links, ticket links, etc.
        if (!title || title.length < 3 || /^(Tickets|Sold Out|Buy|img|<)$/i.test(title)) {
          return;
        }
        
        // Skip if title contains HTML or img tags
        if (title.includes('<img') || title.includes('decoding=')) return;
        
        // Clean up title
        title = title.replace(/\s+/g, ' ').trim();
        
        // Skip duplicates and non-text
        if (seen.has(title) || title.length > 80) return;
        seen.add(title);
        seen.add(href);
        
        // Extract image from sibling or parent
        let imageUrl = null;
        const container = link.closest('div') || link.parentElement;
        if (container) {
          const img = container.querySelector('img');
          if (img && img.src) imageUrl = img.src;
        }
        
        results.push({
          title,
          url: href,
          imageUrl
        });
      });
      
      return results;
    });

    await browser.close();
    console.log(`  ✅ Found ${events.length} Troubadour events`);

    // Generate dates - Troubadour doesn't show dates clearly, use sequential dates
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    
    const formattedEvents = events.map((event, index) => {
      // Estimate date based on position (events are roughly in order)
      const eventDate = new Date();
      eventDate.setDate(eventDate.getDate() + index * 3); // Space events ~3 days apart
      const date = eventDate.toISOString().split('T')[0];
      
      console.log(`  ✓ ${event.title}`);
      return {
        id: uuidv4(),
        title: event.title,
        date: date,
        startDate: new Date(date + 'T20:00:00'),
        url: event.url,
        imageUrl: event.imageUrl,
        venue: {
          name: 'Troubadour',
          address: '9081 Santa Monica Blvd, West Hollywood, CA 90069',
          city: 'Los Angeles'
        },
        latitude: 34.0819,
        longitude: -118.3894,
        city: 'Los Angeles',
        category: 'Nightlife',
        source: 'Troubadour'
      };
    });

      // Fetch descriptions from event detail pages
      for (const event of formattedEvents) {
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

    
    return filterEvents(formattedEvents);

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Troubadour error:', error.message);
    return [];
  }
}

module.exports = scrapeTroubadour;
