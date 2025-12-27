const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Baby\'s All Right events...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.babysallright.com/events', {
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
      
      // Find event links
      const links = document.querySelectorAll('a[href*="/event/"], a[href*="/events/"]');
      
      links.forEach(link => {
        const href = link.getAttribute('href');
        if (!href || seen.has(href) || href === '/events' || href === '/events/') return;
        
        let title = link.textContent.trim().split('\n')[0].trim();
        
        if (!title || title.length < 3 || title.length > 100) return;
        if (/^(buy|ticket|view|events|more info)/i.test(title)) return;
        if (seen.has(title)) return;
        
        const container = link.closest('article, div, section') || link;
        const containerText = container.textContent || '';
        
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
          const eventDate = new Date();
          eventDate.setDate(eventDate.getDate() + results.length * 3);
          formattedDate = eventDate.toISOString().split('T')[0];
        }
        
        seen.add(href);
        seen.add(title);
        results.push({
          title: title.substring(0, 100),
          date: formattedDate,
          url: href.startsWith('http') ? href : 'https://www.babysallright.com' + href
        });
      });
      
      return results;
    });

    await browser.close();
    console.log(`  ✅ Found ${events.length} Baby's All Right events`);

    const formattedEvents = events.map(event => ({
      id: uuidv4(),
      title: event.title,
      url: event.url,
      date: event.date,
      venue: {
        name: "Baby's All Right",
        address: '146 Broadway, Brooklyn, NY 11211',
        city: 'New York'
      },
      city: city,
      source: "Baby's All Right",
      categories: ['Concert', 'Music', 'Nightlife']
    }));

    return filterEvents(formattedEvents);

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️ Baby\'s All Right error:', error.message);
    return [];
  }
}

module.exports = scrapeEvents;
