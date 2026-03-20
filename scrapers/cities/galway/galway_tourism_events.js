/**
 * Galway Tourism Events Scraper
 * URL: https://www.galwaytourism.ie/galway-events-calendar/
 * Official Galway tourism events page
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function scrapeGalwayTourismEvents(city = 'Galway') {
  console.log('🏙️ Scraping Galway Tourism Events...');
  let browser;

  try {
    browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'], protocolTimeout: 60000 });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    
    await page.goto('https://www.galwaytourism.ie/galway-events-calendar/', { waitUntil: 'networkidle2', timeout: 30000 });
    await delay(2000);

    const eventLinks = await page.evaluate(() => {
      const links = [];
      const anchors = document.querySelectorAll('a[href*="/event/"]');
      anchors.forEach(a => {
        const href = a.getAttribute('href');
        if (href) {
          const fullUrl = href.startsWith('http') ? href : `https://www.galwaytourism.ie${href}`;
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
      'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
      'jun': '06', 'jul': '07', 'aug': '08', 'sep': '09',
      'oct': '10', 'nov': '11', 'dec': '12'
    };

    for (const url of eventLinks) {
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
        await delay(1000);

        const eventData = await page.evaluate(() => {
          const titleEl = document.querySelector('h1, .event-title, [class*="title"]');
          const title = titleEl ? titleEl.textContent.trim() : null;

          const bodyText = document.body.innerText;

          const ogImage = document.querySelector('meta[property="og:image"]');
          let imageUrl = ogImage ? ogImage.getAttribute('content') : null;
          
          if (!imageUrl) {
            const imgs = document.querySelectorAll('img[src*="galwaytourism"], img[class*="featured"]');
            for (const img of imgs) {
              const src = img.getAttribute('src');
              if (src && !src.includes('logo') && !src.includes('icon')) {
                imageUrl = src.startsWith('http') ? src : `https://www.galwaytourism.ie${src}`;
                break;
              }
            }
          }

          const descEl = document.querySelector('meta[property="og:description"], meta[name="description"]');
          const description = descEl ? descEl.getAttribute('content') : null;

          const locationEl = document.querySelector('[class*="location"], [class*="venue"], [class*="address"]');
          const location = locationEl ? locationEl.textContent.trim() : null;

          return { title, bodyText, imageUrl, description, location };
        });

        if (!eventData.title || eventData.title.length < 3) continue;

        let isoDate = null;
        const currentYear = new Date().getFullYear();

        const datePatterns = [
          /(\d{1,2})(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s*(\d{4})?/i,
          /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/i,
          /(\d{4})-(\d{2})-(\d{2})/
        ];

        for (const pattern of datePatterns) {
          const match = eventData.bodyText.match(pattern);
          if (match) {
            if (match[0].includes('-') && match[1].length === 4) {
              isoDate = match[0];
            } else if (!isNaN(parseInt(match[1]))) {
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

        let venueName = 'Galway City';
        let venueAddress = 'Galway, Ireland';
        
        if (eventData.location) {
          venueName = eventData.location.split(',')[0].trim() || venueName;
          venueAddress = eventData.location || venueAddress;
        }

        events.push({
          id: uuidv4(),
          title: eventData.title,
          date: isoDate,
          url: url,
          imageUrl: eventData.imageUrl || null,
          description: eventData.description || null,
          venue: { name: venueName, address: venueAddress, city: 'Galway' },
          latitude: 53.2707,
          longitude: -9.0568,
          city: 'Galway',
          category: 'Festival',
          source: 'Galway Tourism'
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


    console.log(`  ✅ Found ${unique.length} Galway Tourism events`);
    return unique;

  } catch (error) {
    console.error(`  ⚠️ Galway Tourism Events error: ${error.message}`);
    try { if (browser) await browser.close(); } catch (e) {}
    return [];
  } finally {
    try { if (browser) await browser.close(); } catch (e) {}
  }
}

module.exports = scrapeGalwayTourismEvents;
