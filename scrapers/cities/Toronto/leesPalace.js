const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎵 Scraping Lee\'s Palace events...');
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.leespalace.com/events', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    await new Promise(r => setTimeout(r, 3000));

    const rawEvents = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      document.querySelectorAll('a').forEach(a => {
        const href = a.href;
        if (!href || !href.includes('leespalace') || !href.includes('event')) return;
        if (href === 'https://www.leespalace.com/events' || href === 'https://www.leespalace.com/events/') return;
        if (seen.has(href)) return;
        
        let title = a.textContent?.trim();
        if (!title || title.length < 5 || title === 'Events' || title === 'List View' || title === 'Tickets') return;
        
        seen.add(href);
        
        // Find image
        const parent = a.parentElement;
        const grandparent = parent?.parentElement;
        let imgSrc = null;
        const img = grandparent?.querySelector('img') || parent?.querySelector('img');
        if (img) {
          imgSrc = img.src || img.getAttribute('data-src');
        }
        
        // Extract date (format: "TitleFriday, December 26, 2025" or "TitleSaturday, December 27, 2025")
        let dateStr = null;
        const dateMatch = title.match(/(Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*,?\s*(January|February|March|April|May|June|July|August|September|October|November|December)\s*(\d{1,2}),?\s*(\d{4})/i);
        if (dateMatch) {
          const months = { january: '01', february: '02', march: '03', april: '04', may: '05', june: '06', july: '07', august: '08', september: '09', october: '10', november: '11', december: '12' };
          const month = months[dateMatch[2].toLowerCase()];
          const day = dateMatch[3].padStart(2, '0');
          const year = dateMatch[4];
          dateStr = `${year}-${month}-${day}`;
          
          // Clean title
          title = title.replace(/(Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*,?\s*(January|February|March|April|May|June|July|August|September|October|November|December)\s*\d{1,2},?\s*\d{4}/i, '').trim();
        }
        
        title = title?.replace(/\s*\|\s*$/, '').trim();
        
        if (title && title.length > 3 && dateStr) {
          results.push({
            title: title.substring(0, 100),
            url: href,
            date: dateStr,
            imageUrl: imgSrc && !imgSrc.includes('logo') ? imgSrc : null
          });
        }
      });
      
      return results;
    });

    await browser.close();

    const events = rawEvents.map(event => ({
      id: uuidv4(),
      title: event.title,
      url: event.url,
      date: event.date,
      startDate: new Date(event.date + 'T20:00:00'),
      imageUrl: event.imageUrl,
      venue: {
        name: 'Lee\'s Palace',
        address: '529 Bloor St W, Toronto, ON M5S 1Y5',
        city: 'Toronto'
      },
      city: city,
      category: 'Nightlife',
      source: 'Lee\'s Palace'
    }));

    console.log(`✅ Lee's Palace: ${events.length} events, ${events.filter(e => e.imageUrl).length} with images`);
    return filterEvents(events);

  } catch (error) {
    if (browser) await browser.close();
    console.error('Error scraping Lee\'s Palace:', error.message);
    return [];
  }
}

module.exports = scrapeEvents;
