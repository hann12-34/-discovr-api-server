/**
 * Oxford Theatre Events Scraper
 * URL: https://www.oxford-theatre.com
 * Musicals, plays, concerts, comedy in Oxford
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function scrapeOxfordTheatre(city = 'Oxford') {
  console.log('🎭 Scraping Oxford Theatre...');
  let browser;

  try {
    browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    
    await page.goto('https://www.oxford-theatre.com/shows/concert', { waitUntil: 'networkidle2', timeout: 30000 });
    await delay(2000);

    const eventLinks = await page.evaluate(() => {
      const links = [];
      const anchors = document.querySelectorAll('a[href*="/shows/"]');
      anchors.forEach(a => {
        const href = a.getAttribute('href');
        if (href && !href.includes('/tickets/') && !href.endsWith('/shows/concert') && !href.endsWith('/shows/')) {
          const fullUrl = href.startsWith('http') ? href : `https://www.oxford-theatre.com${href}`;
          if (!links.includes(fullUrl) && !fullUrl.includes('/calendar')) {
            links.push(fullUrl);
          }
        }
      });
      return [...new Set(links)];
    });

    console.log(`  Found ${eventLinks.length} event links`);

    const events = [];
    const months = {
      'january': '01', 'february': '02', 'march': '03', 'april': '04',
      'may': '05', 'june': '06', 'july': '07', 'august': '08',
      'september': '09', 'october': '10', 'november': '11', 'december': '12'
    };

    for (const url of eventLinks) {
      try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });
        await delay(1000);

        const eventData = await page.evaluate(() => {
          const titleEl = document.querySelector('h1, .show-title, [class*="title"]');
          const title = titleEl ? titleEl.textContent.trim() : null;

          const bodyText = document.body.innerText;

          const ogImage = document.querySelector('meta[property="og:image"]');
          const imageUrl = ogImage ? ogImage.getAttribute('content') : null;

          const descEl = document.querySelector('meta[property="og:description"], meta[name="description"]');
          const description = descEl ? descEl.getAttribute('content') : null;

          // Try to find venue
          const venueEl = document.querySelector('[class*="venue"], [class*="location"]');
          const venue = venueEl ? venueEl.textContent.trim() : null;

          return { title, bodyText, imageUrl, description, venue };
        });

        if (!eventData.title || eventData.title.length < 3) continue;

        // Parse date
        let isoDate = null;
        const currentYear = new Date().getFullYear();

        const datePatterns = [
          /(\d{1,2})(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s*(\d{4})?/i,
          /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/i
        ];

        for (const pattern of datePatterns) {
          const match = eventData.bodyText.match(pattern);
          if (match) {
            if (!isNaN(parseInt(match[1]))) {
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

        let venueName = 'Oxford Theatre';
        let venueAddress = 'Oxford, United Kingdom';

        if (eventData.venue) {
          if (eventData.venue.includes('Town Hall')) {
            venueName = 'Oxford Town Hall';
            venueAddress = 'St Aldate\'s, Oxford OX1 1BX, United Kingdom';
          } else if (eventData.venue.includes('New Theatre')) {
            venueName = 'New Theatre Oxford';
            venueAddress = 'George Street, Oxford OX1 2AG, United Kingdom';
          }
        }

        events.push({
          id: uuidv4(),
          title: eventData.title,
          date: isoDate,
          url: url,
          imageUrl: eventData.imageUrl || null,
          description: eventData.description || null,
          venue: { name: venueName, address: venueAddress, city: 'Oxford' },
          latitude: 51.7520,
          longitude: -1.2577,
          city: 'Oxford',
          category: 'Music',
          source: 'Oxford Theatre'
        });

      } catch (e) {
        console.log(`  ⚠️ Error: ${e.message}`);
      }
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


    console.log(`  ✅ Found ${unique.length} Oxford Theatre events`);
    return unique;

  } catch (error) {
    console.error(`  ⚠️ Oxford Theatre error: ${error.message}`);
    if (browser) await browser.close();
    return [];
  }
}

module.exports = scrapeOxfordTheatre;
