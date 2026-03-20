/**
 * Starlite Room Edmonton Events Scraper
 * Live music venue - iconic underground live music & entertainment venue
 * URL: https://www.starliteroom.ca/calendar
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrapeStarliteRoom(city = 'Edmonton') {
  console.log('🎸 Scraping Starlite Room Edmonton...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    // Get event URLs from calendar
    await page.goto('https://www.starliteroom.ca/calendar/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Extract event URLs first
    const eventUrls = await page.evaluate(() => {
      const urls = new Set();
      document.querySelectorAll('a[href*="/tm-event/"]').forEach(link => {
        const url = link.href;
        if (url && !url.includes('?') && !urls.has(url)) {
          urls.add(url);
        }
      });
      return Array.from(urls);
    });

    console.log(`  📋 Found ${eventUrls.length} event URLs to process`);

    const formattedEvents = [];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Visit each event page to get details
    for (const eventUrl of eventUrls) {
      try {
        await page.goto(eventUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise(resolve => setTimeout(resolve, 1500));

        const eventData = await page.evaluate(() => {
          // Get title from h1 or page title
          const titleEl = document.querySelector('h1, .event-title, .tribe-events-single-event-title');
          let title = titleEl ? titleEl.textContent.trim() : null;
          
          // Get date from various possible locations
          let dateStr = null;
          
          // Look for date in meta tags
          const metaDate = document.querySelector('meta[property="event:start_time"], meta[name="event_date"]');
          if (metaDate) {
            dateStr = metaDate.getAttribute('content');
          }
          
          // Look for date in structured data
          const scripts = document.querySelectorAll('script[type="application/ld+json"]');
          for (const script of scripts) {
            try {
              const data = JSON.parse(script.textContent);
              if (data.startDate) {
                dateStr = data.startDate;
                break;
              }
              if (data['@graph']) {
                for (const item of data['@graph']) {
                  if (item.startDate) {
                    dateStr = item.startDate;
                    break;
                  }
                }
              }
            } catch (e) {}
          }
          
          // Look for date in visible text
          if (!dateStr) {
            const dateEls = document.querySelectorAll('.event-date, .tribe-events-schedule, time[datetime], .date');
            for (const el of dateEls) {
              const dt = el.getAttribute('datetime') || el.textContent;
              if (dt) {
                dateStr = dt;
                break;
              }
            }
          }
          
          // Try to find date in page text
          if (!dateStr) {
            const bodyText = document.body.innerText;
            const dateMatch = bodyText.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})/i);
            if (dateMatch) {
              dateStr = `${dateMatch[1]} ${dateMatch[2]}, ${dateMatch[3]}`;
            }
          }
          
          // Get image
          let imageUrl = null;
          const img = document.querySelector('.event-image img, .tribe-events-event-image img, article img, .wp-post-image');
          if (img && img.src && img.src.startsWith('http') && !img.src.includes('logo')) {
            imageUrl = img.src;
          }
          
          return { title, dateStr, imageUrl };
        });

        if (!eventData.title || !eventData.dateStr) continue;

        // Parse the date
        let isoDate = null;
        const months = { january: '01', february: '02', march: '03', april: '04', may: '05', june: '06', 
                        july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
                        jan: '01', feb: '02', mar: '03', apr: '04', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };

        // ISO format
        const isoMatch = eventData.dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (isoMatch) {
          isoDate = isoMatch[0];
        } else {
          // Month day, year format
          const mdyMatch = eventData.dateStr.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})/i);
          if (mdyMatch) {
            const month = months[mdyMatch[1].toLowerCase()];
            const day = mdyMatch[2].padStart(2, '0');
            isoDate = `${mdyMatch[3]}-${month}-${day}`;
          }
        }

        if (!isoDate) continue;
        if (new Date(isoDate) < today) continue;

        formattedEvents.push({
          id: uuidv4(),
          title: eventData.title,
          date: isoDate,
          startDate: new Date(isoDate + 'T00:00:00.000Z'),
          url: eventUrl,
          imageUrl: (eventData.imageUrl && !eventData.imageUrl.includes('placeholder')) ? eventData.imageUrl : null,
          venue: {
            name: 'Starlite Room',
            address: '10030 102 Street NW, Edmonton, AB T5J 0V6',
            city: 'Edmonton'
          },
          latitude: 53.5434,
          longitude: -113.4962,
          city: 'Edmonton',
          category: 'Nightlife',
          source: 'Starlite Room'
        });

      } catch (err) {
        // Skip events that fail to load
        continue;
      }
    }

    await browser.close();

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


    console.log(`  ✅ Found ${formattedEvents.length} valid Starlite Room events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Starlite Room error:', error.message);
    return [];
  }
}

module.exports = scrapeStarliteRoom;
