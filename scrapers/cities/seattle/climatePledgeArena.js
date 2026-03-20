/**
 * Climate Pledge Arena Scraper - REAL Puppeteer
 * Seattle's major arena (Kraken, concerts)
 * URL: https://climatepledgearena.com/events
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapeClimatePledgeArena(city = 'Seattle') {
  console.log('🏟️ Scraping Climate Pledge Arena...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      protocolTimeout: 120000
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://climatepledgearena.com/events/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      const months = { 'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5, 'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11 };

      // Find event links
      const links = document.querySelectorAll('a[href*="/event/"]');
      
      links.forEach(link => {
        const href = link.getAttribute('href');
        if (!href || seen.has(href)) return;
        
        // Get title from link content
        const titleEl = link.querySelector('h3, h2, .tribe-events-calendar-list__event-title');
        let title = titleEl ? titleEl.textContent.trim() : link.textContent.trim().split('\n')[0].trim();
        
        if (!title || title.length < 3 || title.length > 100) return;
        if (/^(buy|ticket|more|view|event info)/i.test(title)) return;
        if (seen.has(title)) return;
        
        // Look for date - must have real date, no fallback
        const container = link.closest('article, div, li') || link;
        const containerText = container.textContent || '';
        
        const dateMatch = containerText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s*(\d{4})?/i);
        if (!dateMatch) return; // Skip if no real date found
        
        const monthStr = dateMatch[1].toLowerCase().substring(0, 3);
        const day = dateMatch[2].padStart(2, '0');
        const monthNum = months[monthStr];
        const year = dateMatch[3] || document.body.innerText.match(/\b(202[4-9])\b/)?.[1];
        if (!year) return; // Skip if no year found
        const monthPadded = String(monthNum + 1).padStart(2, '0');
        const formattedDate = `${year}-${monthPadded}-${day}`;
        
        seen.add(href);
        seen.add(title);
        results.push({ title: title.substring(0, 100), date: formattedDate, url: href });
      });
      
      return results;
    });

    await browser.close();
    console.log(`  ✅ Found ${events.length} Climate Pledge Arena events`);

    const formattedEvents = events.map(event => ({
      id: uuidv4(),
      title: event.title,
        description: '',
      date: event.date,
      startDate: event.date ? new Date(event.date + 'T19:00:00') : null,
      url: 'https://climatepledgearena.com/events/',
      imageUrl: null,
      venue: { name: 'Climate Pledge Arena', address: '334 1st Ave N, Seattle, WA', city: 'Seattle' },
      latitude: 47.6222,
      longitude: -122.3540,
      city: 'Seattle',
      category: 'Festival',
      source: 'ClimatePledgeArena'
    }));

    formattedEvents.forEach(e => console.log(`  ✓ ${e.title} | ${e.date}`));

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
    console.error('  ⚠️  Climate Pledge Arena error:', error.message);
    return [];
  }
}

module.exports = scrapeClimatePledgeArena;
