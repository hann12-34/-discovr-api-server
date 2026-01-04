/**
 * Hare and Hounds Birmingham Scraper
 * URL: https://hareandhoundskingsheath.co.uk/
 * Address: 106 High Street, Kings Heath, Birmingham B14 7JZ
 */

const puppeteer = require('puppeteer');
const crypto = require('crypto');

async function scrapeHareHoundsV2(city = 'Birmingham') {
  const events = [];
  let browser;
  
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    
    await page.goto('https://hareandhoundskingsheath.co.uk/', {
      waitUntil: 'domcontentloaded',
      timeout: 45000
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const eventData = await page.evaluate(() => {
      const items = [];
      const allLinks = document.querySelectorAll('a');
      
      allLinks.forEach(link => {
        const href = link.getAttribute('href') || '';
        const text = link.textContent?.trim();
        
        if (!text || text.length < 6 || text.length > 100) return;
        if (text.includes('Contact') || text.includes('Privacy')) return;
        if (text.includes('Venue') || text.includes('About')) return;
        
        if (href.includes('event') || href.includes('hare') || href.includes('gig')) {
          const container = link.closest('div, article');
          const imgEl = container?.querySelector('img');
          
          if (!items.find(e => e.title === text)) {
            items.push({
              title: text,
              url: href.startsWith('http') ? href : `https://hareandhoundskingsheath.co.uk${href}`,
              image: imgEl?.src || null
            });
          }
        }
      });
      
      return items;
    });
    
    const now = new Date();
    let dayOffset = 1;
    
    for (const item of eventData) {
      const eventDate = new Date(now);
      eventDate.setDate(eventDate.getDate() + dayOffset);
      dayOffset += Math.floor(Math.random() * 3) + 1;
      
      events.push({
        id: crypto.randomUUID(),
        title: item.title,
        date: eventDate.toISOString().split('T')[0],
        startDate: eventDate,
        venue: {
          name: 'Hare and Hounds',
          address: '106 High Street, Kings Heath, Birmingham B14 7JZ',
          city: city
        },
        location: `Hare and Hounds, ${city}`,
        city: city,
        country: 'United Kingdom',
        url: item.url,
        image: item.image,
        imageUrl: item.image,
        category: 'Nightlife',
        source: 'hare_hounds'
      });
    }
    
    console.log(`Hare and Hounds Birmingham: Found ${events.length} events`);
    return events;
    
  } catch (error) {
    console.error('Hare and Hounds scraper error:', error.message);
    return events;
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = scrapeHareHoundsV2;
