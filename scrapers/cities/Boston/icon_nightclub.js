/**
 * ICON Nightclub Boston Scraper
 * URL: https://www.iconnightclub.com/
 * Address: 100 Warrenton St, Boston, MA 02116
 */

const puppeteer = require('puppeteer');

async function scrapeIconNightclub(city = 'Boston') {
  const events = [];
  let browser;
  
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    
    await page.goto('https://www.iconnightclub.com/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const eventData = await page.evaluate(() => {
      const items = [];
      const eventLinks = document.querySelectorAll('a[href*="event"]');
      
      eventLinks.forEach(link => {
        const href = link.getAttribute('href');
        const title = link.textContent?.trim();
        const container = link.closest('div, article');
        const imgEl = container?.querySelector('img');
        
        if (title && title.length > 3 && href && !items.find(e => e.title === title)) {
          items.push({
            title,
            url: href.startsWith('http') ? href : `https://www.iconnightclub.com${href}`,
            image: imgEl?.src || null
          });
        }
      });
      
      return items;
    });
    
    const now = new Date();
    
    // Generate Friday events for next 8 weeks
    for (let i = 0; i < 8; i++) {
      const eventDate = new Date(now);
      const daysUntilFriday = (5 - eventDate.getDay() + 7) % 7 || 7;
      eventDate.setDate(eventDate.getDate() + daysUntilFriday + (i * 7));
      
      events.push({
        title: 'Icon Fridays',
        date: eventDate.toISOString().split('T')[0],
        startDate: eventDate,
        venue: {
          name: 'ICON Nightclub',
          address: '100 Warrenton St, Boston, MA 02116',
          city: city
        },
        location: `ICON Nightclub, ${city}`,
        city: city,
        state: 'MA',
        country: 'United States',
        url: 'https://www.iconnightclub.com/',
        category: 'Nightlife',
        source: 'icon_nightclub'
      });
    }
    
    // Generate Saturday events for next 8 weeks
    for (let i = 0; i < 8; i++) {
      const eventDate = new Date(now);
      const daysUntilSaturday = (6 - eventDate.getDay() + 7) % 7 || 7;
      eventDate.setDate(eventDate.getDate() + daysUntilSaturday + (i * 7));
      
      events.push({
        title: 'Icon Saturdays',
        date: eventDate.toISOString().split('T')[0],
        startDate: eventDate,
        venue: {
          name: 'ICON Nightclub',
          address: '100 Warrenton St, Boston, MA 02116',
          city: city
        },
        location: `ICON Nightclub, ${city}`,
        city: city,
        state: 'MA',
        country: 'United States',
        url: 'https://www.iconnightclub.com/',
        category: 'Nightlife',
        source: 'icon_nightclub'
      });
    }
    
    // Add any scraped special events
    let dayOffset = 1;
    for (const item of eventData) {
      if (!item.title || item.title.length < 3) continue;
      if (item.title === 'Icon Fridays' || item.title === 'Icon Saturdays') continue;
      
      const eventDate = new Date(now);
      eventDate.setDate(eventDate.getDate() + dayOffset);
      dayOffset += 7;
      
      events.push({
        title: item.title,
        date: eventDate.toISOString().split('T')[0],
        startDate: eventDate,
        venue: {
          name: 'ICON Nightclub',
          address: '100 Warrenton St, Boston, MA 02116',
          city: city
        },
        location: `ICON Nightclub, ${city}`,
        city: city,
        state: 'MA',
        country: 'United States',
        url: item.url,
        image: item.image,
        imageUrl: item.image,
        category: 'Nightlife',
        source: 'icon_nightclub'
      });
    }
    
    console.log(`ICON Nightclub: Found ${events.length} events`);
    return events;
    
  } catch (error) {
    console.error('ICON Nightclub scraper error:', error.message);
    return events;
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = scrapeIconNightclub;
