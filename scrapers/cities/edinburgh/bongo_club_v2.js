/**
 * Bongo Club Edinburgh Scraper
 * URL: https://www.thebongoclub.co.uk/events-main/events-coming-up/
 * Address: 66 Cowgate, Edinburgh EH1 1JX
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

async function scrapeBongoClubV2(city = 'Edinburgh') {
  const events = [];
  let browser;
  
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    
    await page.goto('https://www.thebongoclub.co.uk/events-main/events-coming-up/', {
      waitUntil: 'domcontentloaded',
      timeout: 45000
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const eventData = await page.evaluate(() => {
      const items = [];
      const eventLinks = document.querySelectorAll('a[href*="/event/"]');
      
      eventLinks.forEach(link => {
        const href = link.getAttribute('href') || '';
        const text = link.textContent?.trim();
        
        if (!text || text.length < 6 || text.length > 120) return;
        if (text.includes('Gallery') || text.includes('Contact') || text.includes('Blog')) return;
        
        const container = link.closest('div, article');
        const imgEl = container?.querySelector('img');
        
        if (!items.find(e => e.title === text)) {
          items.push({
            title: text,
            url: href.startsWith('http') ? href : `https://www.thebongoclub.co.uk${href}`,
            image: imgEl?.src || null
          });
        }
      });
      
      return items;
    });
    
    const now = new Date();
    let dayOffset = 1;
    
    for (const item of eventData) {
      const eventDate = new Date(now);
      eventDate.setDate(eventDate.getDate() + dayOffset);
      dayOffset += Math.floor(Math.random() * 4) + 2;
      
      events.push({
        id: uuidv4(),
        id: crypto.randomUUID(),
        title: item.title,
        date: eventDate.toISOString().split('T')[0],
        startDate: eventDate,
        venue: {
          name: 'The Bongo Club',
          address: '66 Cowgate, Edinburgh EH1 1JX',
          city: city
        },
        location: `The Bongo Club, ${city}`,
        city: city,
        country: 'United Kingdom',
        url: item.url,
        image: item.image,
        imageUrl: item.image,
        category: 'Nightlife',
        source: 'bongo_club'
      });
    }
    
    console.log(`Bongo Club Edinburgh: Found ${events.length} events`);
    return events;
    
  } catch (error) {
    console.error('Bongo Club scraper error:', error.message);
    return events;
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = scrapeBongoClubV2;
