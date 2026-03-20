const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapeEvents(city = 'Montreal') {
  console.log('🎪 Scraping Bar Le Ritz PDB events...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.barleritzpdb.com/events', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth();
      
      const months = {
        'janvier': 0, 'février': 1, 'mars': 2, 'avril': 3, 'mai': 4, 'juin': 5,
        'juillet': 6, 'août': 7, 'septembre': 8, 'octobre': 9, 'novembre': 10, 'décembre': 11,
        'january': 0, 'february': 1, 'march': 2, 'april': 3, 'may': 4, 'june': 5,
        'july': 6, 'august': 7, 'september': 8, 'october': 9, 'november': 10, 'december': 11,
        'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
        'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
      };

      const containers = document.querySelectorAll('article, .event, [class*="event"], a[href*="/event"]');
      
      containers.forEach(container => {
        const text = container.innerText || '';
        const link = container.tagName === 'A' ? container : container.querySelector('a');
        const href = link ? link.getAttribute('href') : null;
        
        if (!href || seen.has(href)) return;
        
        const h2 = container.querySelector('h2, h3, h4, .title');
        let title = h2 ? h2.textContent.trim() : '';
        if (!title) {
          const lines = text.split('\n').filter(l => l.trim().length > 3);
          for (const line of lines) {
            if (line.length > 5 && line.length < 80 && !/^\d/.test(line)) {
              title = line.trim();
              break;
            }
          }
        }
        
        if (!title || title.length < 3) return;
        
        const datePatterns = [
          /(\d{1,2})\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s*(\d{4})?/i,
          /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/i,
          /(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\.?\s*(\d{4})?/i
        ];
        
        let dateMatch = null;
        for (const pattern of datePatterns) {
          dateMatch = text.match(pattern);
          if (dateMatch) break;
        }
        
        if (!dateMatch) return;
        
        let day, monthStr, year;
        if (/^\d/.test(dateMatch[1])) {
          day = dateMatch[1];
          monthStr = dateMatch[2].toLowerCase();
          year = dateMatch[3];
        } else {
          monthStr = dateMatch[1].toLowerCase();
          day = dateMatch[2];
          year = dateMatch[3];
        }
        
        const monthKey = monthStr.substring(0, 3);
        const monthNum = months[monthStr] !== undefined ? months[monthStr] : months[monthKey];
        if (monthNum === undefined) return;
        
        const eventYear = year ? parseInt(year) : (monthNum < currentMonth ? currentYear + 1 : currentYear);
        const isoDate = `${eventYear}-${String(monthNum + 1).padStart(2, '0')}-${day.padStart(2, '0')}`;
        
        seen.add(href);
        results.push({
          title: title.substring(0, 100),
          date: isoDate,
          url: href.startsWith('http') ? href : 'https://www.barleritzpdb.com' + href
        });
      });
      
      return results;
    });

    await browser.close();
    console.log(`  ✅ Found ${events.length} Bar Le Ritz PDB events`);

    const formattedEvents = events.map(event => ({
      id: uuidv4(),
      title: event.title,
        description: '',
      url: event.url,
      date: event.date,
      venue: {
        name: 'Bar Le Ritz PDB',
        address: '179 Rue Jean-Talon O, Montreal, QC H2R 2X2',
        city: 'Montreal'
      },
      city: city,
      source: 'Bar Le Ritz PDB',
      categories: ['Music', 'Nightlife']
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


    return filterEvents(formattedEvents);

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️ Bar Le Ritz PDB error:', error.message);
    return [];
  }
}

module.exports = scrapeEvents;
