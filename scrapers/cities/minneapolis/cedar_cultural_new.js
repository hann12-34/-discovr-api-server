/**
 * Cedar Cultural Center Minneapolis Events Scraper
 * Global music and dance venue
 * URL: https://www.thecedar.org/events
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrapeCedarCultural(city = 'Minneapolis') {
  console.log('🌍 Scraping Cedar Cultural Center...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.thecedar.org/events', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollBy(0, 1500));
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      const months = {
        'january': '01', 'february': '02', 'march': '03', 'april': '04', 'may': '05', 'june': '06',
        'july': '07', 'august': '08', 'september': '09', 'october': '10', 'november': '11', 'december': '12'
      };
      
      // Find all event links
      document.querySelectorAll('a[href*="/events/"]').forEach(link => {
        const href = link.href;
        if (!href || seen.has(href) || href.endsWith('/events') || href.endsWith('/events/')) return;
        if (href.includes('format=ical') || href.includes('?category=')) return;
        seen.add(href);
        
        // Get title from link text
        let title = link.textContent?.trim();
        if (!title || title.length < 3 || title === 'View Event →') return;
        title = title.split('\n')[0].trim();
        
        // Look for date in parent container
        const container = link.closest('article, section, div');
        const containerText = container?.textContent || '';
        
        // Pattern: "Saturday, January 10, 2026"
        const dateMatch = containerText.match(/(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})/i);
        
        if (dateMatch) {
          const month = months[dateMatch[2].toLowerCase()];
          const day = dateMatch[3].padStart(2, '0');
          const year = dateMatch[4];
          const isoDate = `${year}-${month}-${day}`;
          
          results.push({
            title,
            date: isoDate,
            url: href
          });
        }
      });
      
      return results;
    });

    await browser.close();

    const now = new Date();
    const seenKeys = new Set();
    const formattedEvents = events
      .filter(e => {
        if (new Date(e.date) < now) return false;
        const key = e.title + e.date;
        if (seenKeys.has(key)) return false;
        seenKeys.add(key);
        return true;
      })
      .map(event => ({
        id: uuidv4(),
        title: event.title,
        description: '',
        date: event.date,
        startDate: new Date(event.date + 'T19:30:00'),
        url: event.url,
        imageUrl: null,
        venue: {
          name: 'Cedar Cultural Center',
          address: '416 Cedar Ave, Minneapolis, MN 55454',
          city: 'Minneapolis'
        },
        latitude: 44.9697,
        longitude: -93.2472,
        city: 'Minneapolis',
        category: 'Nightlife',
        source: 'Cedar Cultural Center'
      }));

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


    console.log(`  ✅ Found ${formattedEvents.length} Cedar Cultural Center events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Cedar Cultural Center error:', error.message);
    return [];
  }
}

module.exports = scrapeCedarCultural;
