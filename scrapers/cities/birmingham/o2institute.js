/**
 * O2 Institute Birmingham Events Scraper
 * Major music venue in Digbeth
 * URL: https://www.academymusicgroup.com/o2institutebirmingham/
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapeO2Institute(city = 'Birmingham') {
  console.log('🎸 Scraping O2 Institute Birmingham...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.academymusicgroup.com/o2institutebirmingham/events', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    // Tailored extraction for Academy Music Group MUI-based site
    const events = await page.evaluate(() => {
      const results = [];
      const processed = new Set();
      
      // Find all event links - specific to Academy Music Group sites
      const eventLinks = document.querySelectorAll('a[href*="/events/"]');
      
      eventLinks.forEach(link => {
        const href = link.href;
        
        if (!href.includes('/events/') || 
            href.endsWith('/events/') || 
            href.endsWith('/events') || 
            processed.has(href)) return;
        processed.add(href);
        
        let parent = link.parentElement;
        let eventData = null;
        
        for (let i = 0; i < 6 && parent; i++) {
          const imgs = parent.querySelectorAll('img');
          const fullText = parent.textContent;
          
          const dateMatch = fullText.match(/(\d{1,2})\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{4})?/i);
          
          const urlParts = href.split('/');
          const slug = urlParts[urlParts.length - 1]
            .replace(/-tickets.*/, '')
            .replace(/-/g, ' ')
            .replace(/\b\w/g, c => c.toUpperCase());
          
          let imgSrc = null;
          imgs.forEach(img => {
            if (img.src && !img.src.includes('logo') && !img.src.includes('icon') && img.src.startsWith('http') && img.width > 50) {
              imgSrc = img.src;
            }
          });
          
          if (dateMatch && slug.length > 3) {
            eventData = { title: slug, day: dateMatch[1], month: dateMatch[2], year: dateMatch[3] || null, url: href, imageUrl: imgSrc };
            break;
          }
          parent = parent.parentElement;
        }
        
        if (eventData) results.push(eventData);
      });
      
      return results;
    });

    await browser.close();
    console.log(`  ✅ Found ${events.length} O2 Institute events`);

    const formattedEvents = [];
    const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    for (const event of events) {
      const day = event.day.padStart(2, '0');
      const month = months[event.month.toLowerCase().substring(0, 3)];
      
      let year = event.year || currentYear.toString();
      if (!event.year && parseInt(month) < currentMonth) {
        year = (currentYear + 1).toString();
      }
      
      const isoDate = `${year}-${month}-${day}`;
      if (new Date(isoDate) < now) continue;
      
      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        date: isoDate,
        startDate: new Date(isoDate + 'T00:00:00.000Z'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('placeholder')) ? event.imageUrl : null,
        venue: { name: 'O2 Institute', address: '78 Digbeth High Street, Birmingham B5 6DY', city: 'Birmingham' },
        latitude: 52.4755,
        longitude: -1.8874,
        city: 'Birmingham',
        category: 'Nightlife',
        source: 'O2 Institute'
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


    return filterEvents(formattedEvents);

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  O2 Institute error:', error.message);
    return [];
  }
}

module.exports = scrapeO2Institute;
