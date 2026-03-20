/**
 * What's On Gold Coast Events Scraper
 * Official Gold Coast Council events listing
 * URL: https://www.whatsongoldcoast.au/All-events
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrapeWhatsOnGoldCoast(city = 'Gold Coast') {
  console.log('🌴 Scraping What\'s On Gold Coast...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    await page.goto('https://www.whatsongoldcoast.au/All-events', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();

      // Find all event links
      document.querySelectorAll('a[href*="/All-events/"]').forEach(link => {
        try {
          const url = link.href;
          if (!url || seen.has(url)) return;
          if (url.includes('dlv_') || url.includes('dd_OC')) return; // Skip filter links
          seen.add(url);

          // Get title from link text or nearby heading
          let title = link.textContent?.trim()?.replace(/\s+/g, ' ');
          
          // Clean up title - remove date prefixes like "02 Jan 2026"
          title = title?.replace(/^\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}\s*/i, '');
          title = title?.replace(/\d+ more dates/gi, '').trim();
          
          if (!title || title.length < 5 || title.length > 200) return;

          // Get date from text - look for "02 Jan 2026" pattern
          const fullText = link.closest('div, article, section')?.textContent || '';
          const dateMatch = fullText.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})/i);
          let dateStr = dateMatch ? `${dateMatch[1]} ${dateMatch[2]} ${dateMatch[3]}` : null;

          // Get image
          const container = link.closest('div, article');
          const imgEl = container?.querySelector('img');
          const imageUrl = imgEl?.src || imgEl?.getAttribute('data-src');

          results.push({ title, url, dateStr, imageUrl });
        } catch (e) {}
      });

      return results;
    });

    await browser.close();

    const formattedEvents = [];
    const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
    const now = new Date();
    const seenKeys = new Set();

    for (const event of events) {
      let isoDate = null;

      if (event.dateStr) {
        const dateMatch = event.dateStr.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})/i);
        if (dateMatch) {
          const day = dateMatch[1].padStart(2, '0');
          const month = months[dateMatch[2].toLowerCase().substring(0, 3)];
          const year = dateMatch[3];
          isoDate = `${year}-${month}-${day}`;
        }
      }

      if (!isoDate) continue;
      if (new Date(isoDate) < now) continue;

      const key = event.title.toLowerCase() + isoDate;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);

      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        description: '',
        date: isoDate,
        startDate: new Date(isoDate + 'T00:00:00.000Z'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('placeholder')) ? event.imageUrl : null,
        venue: {
          name: 'Gold Coast',
          address: 'Gold Coast, Queensland',
          city: 'Gold Coast'
        },
        latitude: -28.0167,
        longitude: 153.4000,
        city: 'Gold Coast',
        category: 'Events',
        source: 'What\'s On Gold Coast'
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


    console.log(`  ✅ Found ${formattedEvents.length} What's On Gold Coast events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  What\'s On Gold Coast error:', error.message);
    return [];
  }
}

module.exports = scrapeWhatsOnGoldCoast;
