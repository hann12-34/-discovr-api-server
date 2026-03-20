/**
 * Discover Melbourne Events Scraper
 * URL: https://discovermelbourne.au/events
 * Melbourne events and concerts
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function scrapeDiscoverMelbourne(city = 'Melbourne') {
  console.log('🏙️ Scraping Discover Melbourne...');
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: 'new',
      protocolTimeout: 60000,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    
    await page.goto('https://discovermelbourne.au/events/', { waitUntil: 'networkidle2', timeout: 30000 });
    await delay(3000);

    const eventLinks = await page.evaluate(() => {
      const links = [];
      const anchors = document.querySelectorAll('a[href*="/event"], a[href*="discovermelbourne"]');
      anchors.forEach(a => {
        const href = a.getAttribute('href');
        if (href && !href.endsWith('/events') && !href.endsWith('/events/') && href.includes('discovermelbourne')) {
          if (!links.includes(href)) {
            links.push(href);
          }
        }
      });
      return links;
    });

    console.log(`  Found ${eventLinks.length} event links`);

    const events = [];
    const months = {
      'january': '01', 'february': '02', 'march': '03', 'april': '04',
      'may': '05', 'june': '06', 'july': '07', 'august': '08',
      'september': '09', 'october': '10', 'november': '11', 'december': '12',
      'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
      'jun': '06', 'jul': '07', 'aug': '08', 'sep': '09',
      'oct': '10', 'nov': '11', 'dec': '12'
    };

    for (const url of eventLinks) {
      let detailPage;
      try {
        // Use a fresh page per event to avoid protocol timeout from exhausted connections
        detailPage = await browser.newPage();
        await detailPage.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
        await detailPage.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });
        await delay(1000);

        const eventData = await detailPage.evaluate(() => {
          const titleEl = document.querySelector('h1, .event-title, [class*="title"]');
          const title = titleEl ? titleEl.textContent.trim() : null;
          const bodyText = document.body.innerText;
          const ogImage = document.querySelector('meta[property="og:image"]');
          const imageUrl = ogImage ? ogImage.getAttribute('content') : null;
          const descEl = document.querySelector('meta[property="og:description"], meta[name="description"]');
          const description = descEl ? descEl.getAttribute('content') : null;
          const locationEl = document.querySelector('[class*="location"], [class*="venue"]');
          const location = locationEl ? locationEl.textContent.trim() : null;
          return { title, bodyText, imageUrl, description, location };
        });

        if (!eventData.title || eventData.title.length < 3) continue;

        let isoDate = null;
        const currentYear = new Date().getFullYear();
        const datePatterns = [
          /(\d{1,2})(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s*(\d{4})?/i,
          /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/i
        ];

        for (const pattern of datePatterns) {
          const match = eventData.bodyText.match(pattern);
          if (match) {
            if (!isNaN(parseInt(match[1])) && match[1].length <= 2) {
              const day = match[1].padStart(2, '0');
              const month = months[match[2].toLowerCase()];
              const year = match[3] || currentYear.toString();
              if (month) isoDate = `${year}-${month}-${day}`;
            } else {
              const month = months[match[1].toLowerCase()];
              const day = match[2].padStart(2, '0');
              const year = match[3] || currentYear.toString();
              if (month) isoDate = `${year}-${month}-${day}`;
            }
            break;
          }
        }

        if (!isoDate) continue;
        const eventDate = new Date(isoDate);
        if (eventDate < new Date()) continue;

        events.push({
          id: uuidv4(),
          title: eventData.title,
          date: isoDate,
          url: url,
          imageUrl: eventData.imageUrl || null,
          description: eventData.description || null,
          venue: {
            name: eventData.location ? eventData.location.split(',')[0].trim() : 'Melbourne',
            address: eventData.location || 'Melbourne, VIC, Australia',
            city: 'Melbourne'
          },
          latitude: -37.8136,
          longitude: 144.9631,
          city: 'Melbourne',
          category: 'Festival',
          source: 'Discover Melbourne'
        });
      } catch (e) {
        // Skip failed event pages silently
      } finally {
        try { if (detailPage) await detailPage.close(); } catch (e) {}
      }
    }

    // Close the listing page too
    try { await page.close(); } catch (e) {}
    await browser.close();

    const unique = [];
    const seen = new Set();
    for (const e of events) {
      const key = `${e.title}|${e.date}`;
      if (!seen.has(key)) { seen.add(key); unique.push(e); }
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


    console.log(`  ✅ Found ${unique.length} Discover Melbourne events`);
    return unique;
  } catch (error) {
    console.error(`  ⚠️ Discover Melbourne error: ${error.message}`);
    try { if (browser) await browser.close(); } catch (e) {}
    return [];
  }
}

module.exports = scrapeDiscoverMelbourne;
