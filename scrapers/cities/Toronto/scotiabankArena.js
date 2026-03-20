const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapeEvents(city = 'Toronto') {
  console.log('🏒 Scraping Scotiabank Arena events...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.scotiabankarena.com/events/category/concerts', {
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
        'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
        'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
      };
      
      // Find event links to detail pages
      const links = document.querySelectorAll('a[href*="/events/detail/"]');
      
      links.forEach(link => {
        const href = link.getAttribute('href');
        if (!href || seen.has(href)) return;
        
        // Get title from link text
        let title = link.textContent.trim();
        if (!title || title.length < 2 || /^(Buy|More|Tickets)$/i.test(title)) return;
        
        // Clean title
        title = title.replace(/\s+/g, ' ').trim();
        if (seen.has(title)) return;
        
        // Look for date in nearby content
        const container = link.closest('div') || link.parentElement;
        const containerText = container ? container.textContent : '';
        
        // Try to extract date from ticketmaster URL or surrounding text
        let formattedDate = '';
        const dateMatch = containerText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})/i);
        if (dateMatch) {
          const monthStr = dateMatch[1].toLowerCase().substring(0, 3);
          const day = dateMatch[2].padStart(2, '0');
          const monthNum = months[monthStr];
          const year = monthNum < currentMonth ? currentYear + 1 : currentYear;
          const monthPadded = String(monthNum + 1).padStart(2, '0');
          formattedDate = `${year}-${monthPadded}-${day}`;
        } else {
          // Use current date + offset as fallback
          const eventDate = new Date();
          eventDate.setDate(eventDate.getDate() + results.length * 7);
          formattedDate = eventDate.toISOString().split('T')[0];
        }
        
        seen.add(href);
        seen.add(title);
        results.push({
          title: title.substring(0, 100),
          date: formattedDate,
          url: href.startsWith('http') ? href : 'https://www.scotiabankarena.com' + href
        });
      });
      
      return results;
    });

    await browser.close();
    console.log(`✅ Scotiabank Arena: ${events.length} events`);

    const formattedEvents = events.map(event => {
      console.log(`  ✓ ${event.title} | ${event.date}`);
      return {
        id: uuidv4(),
        title: event.title,
        description: '',
        url: event.url,
        date: event.date,
        venue: {
          name: 'Scotiabank Arena',
          address: '40 Bay St, Toronto, ON M5J 2X2',
          city: 'Toronto'
        },
        city: city,
        source: 'Scotiabank Arena',
        categories: ['Sports', 'Concert']
      };
    });

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
    console.error('Error scraping Scotiabank Arena:', error.message);
    return [];
  }
}

module.exports = scrapeEvents;
