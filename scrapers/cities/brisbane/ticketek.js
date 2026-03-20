/**
 * Ticketek Brisbane Events Scraper
 * Major ticketing platform for concerts and shows
 * URL: https://premier.ticketek.com.au/shows/genre.aspx?c=2048&n=Brisbane
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrapeTicketek(city = 'Brisbane') {
  console.log('🎟️ Scraping Ticketek Brisbane...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://premier.ticketek.com.au/shows/genre.aspx?c=2048&n=Brisbane', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 4000));

    const eventUrls = await page.evaluate(() => {
      const urls = [];
      document.querySelectorAll('a[href*="/shows/show.aspx"]').forEach(link => {
        const text = link.textContent.trim();
        if (text.length > 3 && !/Groups|Gift|Voucher|Filter/i.test(text)) {
          urls.push(link.href);
        }
      });
      return [...new Set(urls)];
    });

    console.log(`  Found ${eventUrls.length} event URLs...`);

    const events = [];
    
    for (const url of eventUrls) {
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 12000 });
        await new Promise(resolve => setTimeout(resolve, 1500));

        const eventData = await page.evaluate(() => {
          const title = document.querySelector('h1, .show-title, [class*="title"]')?.textContent?.trim();
          if (!title) return null;

          const bodyText = document.body.textContent || '';
          
          const dateMatch = bodyText.match(/(\d{1,2})\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{4})/i) ||
                           bodyText.match(/(\w{3})\s+(\d{1,2})\s+(\w{3})\s+(\d{4})/i);
          
          const venueMatch = bodyText.match(/(?:venue|at|location)[:\s]+([^,\n]+?)(?:,|\n|Brisbane|QLD)/i);
          const venue = venueMatch ? venueMatch[1].trim() : null;

          const img = document.querySelector('img[src*="show"], img[src*="event"], .show-image img');

          return { 
            title: title.split('\n')[0].trim().substring(0, 80), 
            dateText: dateMatch ? dateMatch[0] : null, 
            venue, 
            imageUrl: img?.src 
          };
        });

        if (eventData && eventData.title && eventData.dateText) {
          events.push({ ...eventData, sourceUrl: url });
        }
      } catch (e) {}
    }

    await browser.close();

    const formattedEvents = [];
    const months = { 
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', 
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
    };
    const now = new Date();
    const currentYear = now.getFullYear();

    for (const event of events) {
      let isoDate = null;

      if (event.dateText) {
        const dateMatch = event.dateText.match(/(\d{1,2})\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{4})?/i);
        if (dateMatch) {
          const day = dateMatch[1].padStart(2, '0');
          const month = months[dateMatch[2].toLowerCase().substring(0, 3)];
          const year = dateMatch[3] || currentYear;
          isoDate = `${year}-${month}-${day}`;
        }
      }

      if (!isoDate) continue;
      if (new Date(isoDate) < now) continue;

      const venueName = event.venue || 'Brisbane Venue';

      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        date: isoDate,
        startDate: new Date(isoDate + 'T00:00:00.000Z'),
        url: event.sourceUrl,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image')) ? event.imageUrl : null,
        venue: {
          name: venueName,
          address: `${venueName}, Brisbane QLD`,
          city: 'Brisbane'
        },
        city: 'Brisbane',
        category: 'Nightlife',
        source: 'Ticketek'
      });
    }

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


    console.log(`  ✅ Found ${formattedEvents.length} Ticketek Brisbane events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error(`  ⚠️  Ticketek error: ${error.message}`);
    return [];
  }
}

module.exports = scrapeTicketek;
