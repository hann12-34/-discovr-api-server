/**
 * O2 Academy Glasgow Events Scraper
 * Major live music venue - Academy Music Group site
 * URL: https://www.academymusicgroup.com/o2academyglasgow/events
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapeO2AcademyGlasgow(city = 'Glasgow') {
  console.log('🎸 Scraping O2 Academy Glasgow...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.academymusicgroup.com/o2academyglasgow/events', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    const events = await page.evaluate(() => {
      const results = [];
      const processed = new Set();
      const eventLinks = document.querySelectorAll('a[href*="/events/"]');
      
      eventLinks.forEach(link => {
        const href = link.href;
        if (!href.includes('/events/') || href.endsWith('/events/') || href.endsWith('/events') || processed.has(href)) return;
        processed.add(href);
        
        let parent = link.parentElement;
        for (let i = 0; i < 6 && parent; i++) {
          const imgs = parent.querySelectorAll('img');
          const fullText = parent.textContent;
          const dateMatch = fullText.match(/(\d{1,2})\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{4})?/i);
          
          const urlParts = href.split('/');
          const slug = urlParts[urlParts.length - 1].replace(/-tickets.*/, '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          
          let imgSrc = null;
          imgs.forEach(img => {
            if (img.src && !img.src.includes('logo') && !img.src.includes('icon') && img.src.startsWith('http') && img.width > 50) imgSrc = img.src;
          });
          
          if (dateMatch && slug.length > 3) {
            results.push({ title: slug, day: dateMatch[1], month: dateMatch[2], year: dateMatch[3] || null, url: href, imageUrl: imgSrc });
            break;
          }
          parent = parent.parentElement;
        }
      });
      return results;
    });

    await browser.close();

    const formattedEvents = [];
    const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    for (const event of events) {
      const day = event.day.padStart(2, '0');
      const month = months[event.month.toLowerCase().substring(0, 3)];
      let year = event.year || currentYear.toString();
      if (!event.year && parseInt(month) < currentMonth) year = (currentYear + 1).toString();
      
      const isoDate = `${year}-${month}-${day}`;
      if (new Date(isoDate) < today) continue;
      
      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        date: isoDate,
        startDate: new Date(isoDate + 'T00:00:00.000Z'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('placeholder')) ? event.imageUrl : null,
        venue: { name: 'O2 Academy Glasgow', address: '121 Eglinton Street, Glasgow G5 9NT', city: 'Glasgow' },
        latitude: 55.8488,
        longitude: -4.2628,
        city: 'Glasgow',
        category: 'Nightlife',
        source: 'O2 Academy Glasgow'
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


    console.log(`  ✅ Found ${formattedEvents.length} O2 Academy Glasgow events`);
    return filterEvents(formattedEvents);

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  O2 Academy Glasgow error:', error.message);
    return [];
  }
}

module.exports = scrapeO2AcademyGlasgow;
