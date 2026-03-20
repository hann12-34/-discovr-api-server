/**
 * Dark Music Days Festival Scraper
 * URL: https://www.darkmusicdays.is
 * Contemporary Music Festival in Reykjavík, Iceland
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function scrapeDarkMusicDays(city = 'Reykjavik') {
  console.log('🎵 Scraping Dark Music Days...');
  let browser;

  try {
    browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    
    // Go to events calendar
    await page.goto('https://www.darkmusicdays.is/eventscalendar', { waitUntil: 'networkidle2', timeout: 30000 });
    await delay(2000);

    // Extract event links from the calendar page
    const eventLinks = await page.evaluate(() => {
      const links = [];
      const anchors = document.querySelectorAll('a[href*="/eventscalendar/"]');
      anchors.forEach(a => {
        const href = a.getAttribute('href');
        if (href && 
            !href.endsWith('/eventscalendar') && 
            !href.endsWith('/eventscalendar/') &&
            !href.includes('?format=') &&
            !href.includes('format=ical')) {
          const fullUrl = href.startsWith('http') ? href : `https://www.darkmusicdays.is${href}`;
          if (!links.includes(fullUrl)) {
            links.push(fullUrl);
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
      'janúar': '01', 'febrúar': '02', 'mars': '03', 'apríl': '04',
      'maí': '05', 'júní': '06', 'júlí': '07', 'ágúst': '08',
      'september': '09', 'október': '10', 'nóvember': '11', 'desember': '12'
    };

    // Visit each event page to get details
    for (const url of eventLinks) {
      try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });
        await delay(1000);

        const eventData = await page.evaluate(() => {
          // Get title
          const titleEl = document.querySelector('h1, h2, .event-title, [class*="title"]');
          const title = titleEl ? titleEl.textContent.trim() : null;

          // Get date from page content
          const bodyText = document.body.innerText;
          
          // Get image
          const ogImage = document.querySelector('meta[property="og:image"]');
          const imageUrl = ogImage ? ogImage.getAttribute('content') : null;

          // Get description
          const descEl = document.querySelector('meta[property="og:description"], meta[name="description"]');
          const description = descEl ? descEl.getAttribute('content') : null;

          // Try to find venue/location info
          const venuePatterns = ['Harpa', 'Mengi', 'Listasafn', 'Þjóðleikhúsið', 'Fríkirkjan'];
          let venue = null;
          for (const v of venuePatterns) {
            if (bodyText.includes(v)) {
              venue = v;
              break;
            }
          }

          return { title, bodyText, imageUrl, description, venue };
        });

        if (!eventData.title || eventData.title.length < 3) continue;

        // Parse date from URL or body text
        let isoDate = null;
        
        // Try to extract year from URL (e.g., /eventscalendar/2026/...)
        const urlYearMatch = url.match(/\/eventscalendar\/(\d{4})\//);
        const year = urlYearMatch ? urlYearMatch[1] : new Date().getFullYear().toString();
        
        // Try to find date in body text
        const datePatterns = [
          /(\d{1,2})\.?\s*(january|february|march|april|may|june|july|august|september|october|november|december)\s*(\d{4})?/i,
          /(\d{1,2})\.?\s*(janúar|febrúar|mars|apríl|maí|júní|júlí|ágúst|september|október|nóvember|desember)\s*(\d{4})?/i,
          /(\d{4})-(\d{2})-(\d{2})/
        ];

        for (const pattern of datePatterns) {
          const match = eventData.bodyText.match(pattern);
          if (match) {
            if (match[0].includes('-')) {
              isoDate = match[0];
            } else {
              const day = match[1].padStart(2, '0');
              const monthName = match[2].toLowerCase();
              const month = months[monthName];
              const eventYear = match[3] || year;
              if (month) {
                isoDate = `${eventYear}-${month}-${day}`;
              }
            }
            break;
          }
        }

        // Default to January of the year if no date found (Dark Music Days is in January)
        if (!isoDate) {
          isoDate = `${year}-01-25`;
        }

        // Skip past events
        const eventDate = new Date(isoDate);
        if (eventDate < new Date()) continue;

        // Default venue for Dark Music Days
        const venueName = eventData.venue || 'Harpa Concert Hall';
        const venueAddress = venueName === 'Harpa Concert Hall' ? 'Austurbakki 2, 101 Reykjavík' : '101 Reykjavík, Iceland';

        events.push({
          id: uuidv4(),
          title: eventData.title,
          date: isoDate,
          url: url,
          imageUrl: eventData.imageUrl || null,
          description: eventData.description || null,
          venue: {
            name: venueName,
            address: venueAddress,
            city: 'Reykjavik'
          },
          latitude: 64.1503,
          longitude: -21.9326,
          city: 'Reykjavik',
          category: 'Music',
          source: 'Dark Music Days'
        });

      } catch (e) {
        console.log(`  ⚠️ Error scraping ${url}: ${e.message}`);
      }
    }

    await browser.close();

    // Dedupe by title+date
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


    console.log(`  ✅ Found ${unique.length} Dark Music Days events`);
    return unique;

  } catch (error) {
    console.error(`  ⚠️ Dark Music Days error: ${error.message}`);
    if (browser) await browser.close();
    return [];
  }
}

module.exports = scrapeDarkMusicDays;
