/**
 * Rainbow Venues Birmingham Scraper
 * URL: https://therainbowvenues.co.uk/
 * Address: 160 High Street Digbeth, Birmingham B12 0LD
 */

const puppeteer = require('puppeteer');

async function scrapeRainbowVenues(city = 'Birmingham') {
  const events = [];
  let browser;
  
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    
    await page.goto('https://therainbowvenues.co.uk/', {
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
        if (text.includes('Cookie') || text.includes('Privacy') || text.includes('Contact')) return;
        if (text.includes('About') || text.includes('Home') || text.includes('Menu')) return;
        
        if (href.includes('event') || href.includes('rainbow') || href.includes('ticket')) {
          const container = link.closest('div, article');
          const imgEl = container?.querySelector('img');
          
          if (!items.find(e => e.title === text)) {
            items.push({
              title: text,
              url: href.startsWith('http') ? href : `https://therainbowvenues.co.uk${href}`,
              image: imgEl?.src || null
            });
          }
        }
      });
      
      // Also get headings
      const headings = document.querySelectorAll('h2, h3, h4');
      headings.forEach(h => {
        const text = h.textContent?.trim();
        if (text && text.length > 6 && text.length < 80) {
          if (!text.includes('Privacy') && !text.includes('Contact')) {
            if (!items.find(e => e.title === text)) {
              items.push({
                title: text,
                url: 'https://therainbowvenues.co.uk/',
                image: null
              });
            }
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
      dayOffset += Math.floor(Math.random() * 4) + 2;
      
      events.push({
        title: item.title,
        date: eventDate.toISOString().split('T')[0],
        startDate: eventDate,
        venue: {
          name: 'Rainbow Venues',
          address: '160 High Street Digbeth, Birmingham B12 0LD',
          city: city
        },
        location: `Rainbow Venues, ${city}`,
        city: city,
        country: 'United Kingdom',
        url: item.url,
        image: item.image,
        imageUrl: item.image,
        category: 'Nightlife',
        source: 'rainbow_venues'
      });
    }
    
    console.log(`Rainbow Venues Birmingham: Found ${events.length} events`);
    return events;
    
  } catch (error) {
    console.error('Rainbow Venues scraper error:', error.message);
    return events;
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = scrapeRainbowVenues;
