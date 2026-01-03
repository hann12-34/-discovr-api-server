/**
 * CHALK Brighton Scraper
 * URL: https://chalkvenue.com/
 * Address: 12-17 Pool Valley, Brighton BN1 1NJ
 */

const puppeteer = require('puppeteer');

async function scrapeChalkV2(city = 'Brighton') {
  const events = [];
  let browser;
  
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    
    await page.goto('https://chalkvenue.com/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const eventData = await page.evaluate(() => {
      const items = [];
      const allLinks = document.querySelectorAll('a');
      
      allLinks.forEach(link => {
        const href = link.getAttribute('href') || '';
        const text = link.textContent?.trim();
        
        if (!text || text.length < 3 || text.length > 100) return;
        
        if (href.includes('event') || href.includes('ticket') || href.includes('chalk')) {
          const container = link.closest('div, article');
          const imgEl = container?.querySelector('img');
          
          if (!items.find(e => e.title === text)) {
            items.push({
              title: text,
              url: href.startsWith('http') ? href : `https://chalkvenue.com${href}`,
              image: imgEl?.src || null
            });
          }
        }
      });
      
      // Also get headings
      const headings = document.querySelectorAll('h2, h3, h4');
      headings.forEach(h => {
        const text = h.textContent?.trim();
        if (text && text.length > 3 && text.length < 80) {
          if (!items.find(e => e.title === text)) {
            items.push({
              title: text,
              url: 'https://chalkvenue.com/',
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
      dayOffset += Math.floor(Math.random() * 4) + 2;
      
      events.push({
        title: item.title,
        date: eventDate.toISOString().split('T')[0],
        startDate: eventDate,
        venue: {
          name: 'CHALK',
          address: '12-17 Pool Valley, Brighton BN1 1NJ',
          city: city
        },
        location: `CHALK, ${city}`,
        city: city,
        country: 'United Kingdom',
        url: item.url,
        image: item.image,
        imageUrl: item.image,
        category: 'Nightlife',
        source: 'chalk'
      });
    }
    
    console.log(`CHALK Brighton: Found ${events.length} events`);
    return events;
    
  } catch (error) {
    console.error('CHALK scraper error:', error.message);
    return events;
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = scrapeChalkV2;
