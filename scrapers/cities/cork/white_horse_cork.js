/**
 * White Horse Cork Events Scraper
 * URL: https://whitehorse.ie/whats-on/
 * Live music venue in Cork, Ireland
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function scrapeWhiteHorseCork(city = 'Cork') {
  console.log('🎵 Scraping White Horse Cork...');
  let browser;

  try {
    browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    
    await page.goto('https://whitehorse.ie/whats-on/', { waitUntil: 'networkidle2', timeout: 30000 });
    await delay(2000);

    const eventLinks = await page.evaluate(() => {
      const links = [];
      const anchors = document.querySelectorAll('a[href*="/event/"], a[href*="/gig/"], a[href*="whitehorse.ie"]');
      anchors.forEach(a => {
        const href = a.getAttribute('href');
        if (!href) return;
        // Skip mailto, tel, javascript, and anchor-only links
        if (href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:') || href === '#') return;
        // Must be an http(s) link on whitehorse.ie
        if (!href.startsWith('http')) return;
        if (!href.includes('whitehorse.ie')) return;
        // Skip listing/home pages
        if (href.endsWith('/whats-on/') || href.endsWith('/whats-on') || href.endsWith('/contact/') || href.endsWith('/contact')) return;
        if (href === 'https://whitehorse.ie/' || href === 'https://whitehorse.ie') return;
        if (!links.includes(href)) {
          links.push(href);
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

    // Visit each event page to extract details
    for (const url of eventLinks) {
      try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });
        await delay(800);

        const eventData = await page.evaluate(() => {
          const titleEl = document.querySelector('h1, h2, .event-title, [class*="title"]');
          const title = titleEl ? titleEl.textContent.trim() : null;
          const bodyText = document.body.innerText;
          const ogImage = document.querySelector('meta[property="og:image"]');
          const imageUrl = ogImage ? ogImage.getAttribute('content') : null;
          const descEl = document.querySelector('meta[property="og:description"]');
          const description = descEl ? descEl.getAttribute('content') : null;
          return { title, bodyText, imageUrl, description };
        });

        if (!eventData.title || eventData.title.length < 3) continue;

        let isoDate = null;
        const currentYear = new Date().getFullYear();

        const datePatterns = [
          /(\d{1,2})(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s*(\d{4})?/i,
          /(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s*(\d{4})?/i,
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
            name: 'The White Horse',
            address: '17 Georges Quay, Centre, Cork, T12 P266, Ireland',
            city: 'Cork'
          },
          latitude: 51.8985,
          longitude: -8.4756,
          city: 'Cork',
          category: 'Music',
          source: 'White Horse Cork'
        });
      } catch (e) {}
    }

    await browser.close();

    const unique = [];
    const seen = new Set();
    for (const e of events) {
      const key = `${e.title}|${e.date}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(e);
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


    console.log(`  ✅ Found ${unique.length} White Horse Cork events`);
    return unique;

  } catch (error) {
    console.error(`  ⚠️ White Horse Cork error: ${error.message}`);
    if (browser) await browser.close();
    return [];
  }
}

module.exports = scrapeWhiteHorseCork;
