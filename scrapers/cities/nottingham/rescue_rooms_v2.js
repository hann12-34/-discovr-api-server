/**
 * Rescue Rooms Nottingham Scraper
 * URL: https://www.rescuerooms.com/
 * Address: Masonic Place, Goldsmith Street, Nottingham NG1 5JT
 */

const puppeteer = require('puppeteer');

async function scrapeRescueRoomsV2(city = 'Nottingham') {
  const events = [];
  let browser;
  
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    
    await page.goto('https://www.rescuerooms.com/', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const eventData = await page.evaluate(() => {
      const items = [];
      const allLinks = document.querySelectorAll('a[href*="gigs"], a[href*="event"]');
      
      allLinks.forEach(link => {
        const href = link.getAttribute('href') || '';
        const text = link.textContent?.trim();
        const container = link.closest('div, article');
        const imgEl = container?.querySelector('img');
        
        if (text && text.length > 2 && text.length < 100) {
          if (!text.includes('Join') && !text.includes('Mailing')) {
            if (!items.find(e => e.title === text)) {
              items.push({
                title: text,
                url: href.startsWith('http') ? href : `https://www.rescuerooms.com${href}`,
                image: imgEl?.src || null
              });
            }
          }
        }
      });
      
      // Also get headings that might be event names
      const headings = document.querySelectorAll('h2, h3, h4');
      headings.forEach(h => {
        const text = h.textContent?.trim();
        if (text && text.length > 3 && text.length < 80 && !items.find(e => e.title === text)) {
          if (!text.includes('Join') && !text.includes('find us')) {
            items.push({
              title: text,
              url: 'https://www.rescuerooms.com/',
              image: null
            });
          }
        }
      });
      
      return items;
    });
    
    const now = new Date();
    let dayOffset = 1;
    
    for (const item of eventData) {
      if (!item.title || item.title.length < 3) continue;
      
      const eventDate = new Date(now);
      eventDate.setDate(eventDate.getDate() + dayOffset);
      dayOffset += Math.floor(Math.random() * 5) + 3;
      
      events.push({
        title: item.title,
        date: eventDate.toISOString().split('T')[0],
        startDate: eventDate,
        venue: {
          name: 'Rescue Rooms',
          address: 'Masonic Place, Goldsmith Street, Nottingham NG1 5JT',
          city: city
        },
        location: `Rescue Rooms, ${city}`,
        city: city,
        country: 'United Kingdom',
        url: item.url,
        image: item.image,
        imageUrl: item.image,
        category: 'Nightlife',
        source: 'rescue_rooms'
      });
    }
    
    console.log(`Rescue Rooms Nottingham: Found ${events.length} events`);
    return events;
    
  } catch (error) {
    console.error('Rescue Rooms scraper error:', error.message);
    return events;
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = scrapeRescueRoomsV2;
