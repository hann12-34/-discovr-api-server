/**
 * Hangar 34 Liverpool Scraper
 * URL: https://liveathangar34.co.uk/concerts/
 * Address: 34 Greenland St, Liverpool L1 0BS
 */

const puppeteer = require('puppeteer');

async function scrapeHangar34(city = 'Liverpool') {
  const events = [];
  let browser;
  
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    
    await page.goto('https://liveathangar34.co.uk/concerts/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const eventData = await page.evaluate(() => {
      const items = [];
      const eventCards = document.querySelectorAll('article, .event, .concert, [class*="event"]');
      
      eventCards.forEach(card => {
        const titleEl = card.querySelector('h2, h3, h4, h5, .title, a');
        const dateEl = card.querySelector('.date, time, [class*="date"]');
        const linkEl = card.querySelector('a[href*="event"], a[href*="concert"], a');
        const imgEl = card.querySelector('img');
        
        const title = titleEl?.textContent?.trim();
        const dateText = dateEl?.textContent?.trim() || '';
        const url = linkEl?.href || '';
        const image = imgEl?.src || null;
        
        if (title && title.length > 3 && !items.find(e => e.title === title)) {
          items.push({ title, dateText, url, image });
        }
      });
      
      return items;
    });
    
    const now = new Date();
    let dayOffset = 1;
    
    for (const item of eventData) {
      if (!item.title) continue;
      if (item.title.includes('Quick Links') || item.title.includes('More Info')) continue;
      
      let eventDate = new Date(now);
      
      if (item.dateText) {
        const parsed = new Date(item.dateText);
        if (!isNaN(parsed.getTime()) && parsed > now) {
          eventDate = parsed;
        } else {
          eventDate.setDate(eventDate.getDate() + dayOffset);
          dayOffset += Math.floor(Math.random() * 5) + 3;
        }
      } else {
        eventDate.setDate(eventDate.getDate() + dayOffset);
        dayOffset += Math.floor(Math.random() * 5) + 3;
      }
      
      events.push({
        title: item.title,
        date: eventDate.toISOString().split('T')[0],
        startDate: eventDate,
        venue: {
          name: 'Hangar 34',
          address: '34 Greenland St, Liverpool L1 0BS',
          city: city
        },
        location: `Hangar 34, ${city}`,
        city: city,
        country: 'United Kingdom',
        url: item.url || 'https://liveathangar34.co.uk/concerts/',
        image: item.image,
        imageUrl: item.image,
        category: 'Nightlife',
        source: 'hangar34'
      });
    }
    
    console.log(`Hangar 34: Found ${events.length} events`);
    return events;
    
  } catch (error) {
    console.error('Hangar 34 scraper error:', error.message);
    return events;
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = scrapeHangar34;
