/**
 * Belsonic Belfast Festival Scraper
 * URL: https://www.belsonic.com/
 * Major outdoor music festival in Belfast
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function scrapeBelsonic(city = 'Belfast') {
  console.log('🎸 Scraping Belsonic Festival...');
  let browser;

  try {
    browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    
    await page.goto('https://www.belsonic.com/', { waitUntil: 'networkidle2', timeout: 30000 });
    await delay(2000);

    const eventLinks = await page.evaluate(() => {
      const links = [];
      const anchors = document.querySelectorAll('a[href*="/event"], a[href*="/artist"], a[href*="belsonic"]');
      anchors.forEach(a => {
        const href = a.getAttribute('href');
        if (href && href.includes('belsonic')) {
          const fullUrl = href.startsWith('http') ? href : `https://www.belsonic.com${href}`;
          if (!links.includes(fullUrl) && fullUrl !== 'https://www.belsonic.com/') {
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
      'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
      'jun': '06', 'jul': '07', 'aug': '08', 'sep': '09',
      'oct': '10', 'nov': '11', 'dec': '12'
    };

    // Visit each event link to extract data
    for (const url of eventLinks) {
      try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });
        await delay(1000);

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
          /(june|july|august|september)\s+(\d{4})/i
        ];

        for (const pattern of datePatterns) {
          const match = eventData.bodyText.match(pattern);
          if (match) {
            if (!isNaN(parseInt(match[1])) && match[1].length <= 2) {
              const day = match[1].padStart(2, '0');
              const month = months[match[2].toLowerCase()];
              const year = match[3] || currentYear.toString();
              if (month) isoDate = `${year}-${month}-${day}`;
            } else if (months[match[1].toLowerCase()]) {
              const month = months[match[1].toLowerCase()];
              const year = match[2] || currentYear.toString();
              isoDate = `${year}-${month}-15`;
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
            name: 'Ormeau Park',
            address: 'Ormeau Road, Belfast BT7 3GG, United Kingdom',
            city: 'Belfast'
          },
          latitude: 54.5833,
          longitude: -5.9167,
          city: 'Belfast',
          category: 'Festival',
          source: 'Belsonic'
        });
      } catch (e) {}
    }

    // Also scrape from the main page
    const mainPageEvents = await page.evaluate(() => {
      const events = [];
      const cards = document.querySelectorAll('[class*="event"], [class*="artist"], article, .card');
      cards.forEach(card => {
        const titleEl = card.querySelector('h1, h2, h3, .title, [class*="title"], [class*="name"]');
        const linkEl = card.querySelector('a[href]');
        const dateEl = card.querySelector('[class*="date"], time, .date');
        const imgEl = card.querySelector('img');
        
        if (titleEl) {
          events.push({
            title: titleEl.textContent.trim(),
            description: '',
            url: linkEl ? linkEl.getAttribute('href') : 'https://www.belsonic.com/',
            dateText: dateEl ? dateEl.textContent.trim() : card.textContent,
            imageUrl: imgEl ? imgEl.getAttribute('src') : null
          });
        }
      });
      return events;
    });

    for (const eventData of mainPageEvents) {
      if (!eventData.title || eventData.title.length < 3) continue;

      let isoDate = null;
      const currentYear = new Date().getFullYear();

      const datePatterns = [
        /(\d{1,2})(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s*(\d{4})?/i,
        /(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s*(\d{4})?/i
      ];

      for (const pattern of datePatterns) {
        const match = eventData.dateText.match(pattern);
        if (match) {
          const day = match[1].padStart(2, '0');
          const month = months[match[2].toLowerCase()];
          const year = match[3] || currentYear.toString();
          if (month) isoDate = `${year}-${month}-${day}`;
          break;
        }
      }

      if (!isoDate) continue;

      const eventDate = new Date(isoDate);
      if (eventDate < new Date()) continue;

      const url = eventData.url.startsWith('http') ? eventData.url : `https://www.belsonic.com${eventData.url}`;

      events.push({
        id: uuidv4(),
        title: eventData.title,
        date: isoDate,
        url: url,
        imageUrl: eventData.imageUrl || null,
        description: '',
        venue: {
          name: 'Ormeau Park',
          address: 'Ormeau Road, Belfast BT7 3GG, United Kingdom',
          city: 'Belfast'
        },
        latitude: 54.5833,
        longitude: -5.9167,
        city: 'Belfast',
        category: 'Festival',
        source: 'Belsonic'
      });
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


    console.log(`  ✅ Found ${unique.length} Belsonic events`);
    return unique;

  } catch (error) {
    console.error(`  ⚠️ Belsonic error: ${error.message}`);
    if (browser) await browser.close();
    return [];
  }
}

module.exports = scrapeBelsonic;
