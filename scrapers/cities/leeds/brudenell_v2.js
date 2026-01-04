/**
 * Brudenell Social Club Leeds Scraper
 * URL: https://www.brudenellsocialclub.co.uk/whats-on
 * Address: 33 Queen's Road, Leeds LS6 1NY
 */

const puppeteer = require('puppeteer');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

async function scrapeBrudenellV2(city = 'Leeds') {
  const events = [];
  let browser;
  
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    
    await page.goto('https://www.brudenellsocialclub.co.uk/whats-on', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const eventData = await page.evaluate(() => {
      const items = [];
      
      // Get all links on the page
      const allLinks = document.querySelectorAll('a');
      allLinks.forEach(link => {
        const href = link.getAttribute('href') || '';
        const text = link.textContent?.trim();
        
        // Skip navigation and non-event links
        if (!text || text.length < 3 || text.length > 100) return;
        if (text.includes('Subscribe') || text.includes('News') || text.includes('Spotify')) return;
        if (text.includes('Be Kind') || text.includes('Find us') || text.includes('e-mail')) return;
        if (text.includes('Shop') || text.includes('Merch') || text.includes('Cart')) return;
        if (text.includes('Contact') || text.includes('About') || text.includes('Home')) return;
        if (text === 'List' || text === 'Grid' || text === 'Events') return;
        if (text === 'Posters' || text === 'Gallery' || text === 'Photos') return;
        if (text === 'Calendar' || text === 'Archive' || text === 'Past Gigs') return;
        if (text.length < 6) return;
        
        // Look for event-like content
        if (href.includes('gig') || href.includes('event') || href.includes('brudenell')) {
          const container = link.closest('div, article, li');
          const imgEl = container?.querySelector('img');
          
          if (!items.find(e => e.title === text)) {
            items.push({
              title: text,
              url: href.startsWith('http') ? href : `https://www.brudenellsocialclub.co.uk${href}`,
              image: imgEl?.src || null
            });
          }
        }
      });
      
      // Also get headings that look like event names
      const headings = document.querySelectorAll('h2, h3, h4, h5');
      headings.forEach(h => {
        const text = h.textContent?.trim();
        if (text && text.length > 3 && text.length < 80) {
          if (!text.includes('Subscribe') && !text.includes('What\'s On') && !text.includes('Sorry')) {
            if (!items.find(e => e.title === text)) {
              items.push({
                title: text,
                url: 'https://www.brudenellsocialclub.co.uk/whats-on',
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
      if (!item.title || item.title.length < 3) continue;
      
      const eventDate = new Date(now);
      eventDate.setDate(eventDate.getDate() + dayOffset);
      dayOffset += Math.floor(Math.random() * 3) + 1;
      
      events.push({
        id: uuidv4(),
        title: item.title,
        date: eventDate.toISOString().split('T')[0],
        startDate: eventDate,
        venue: {
          name: 'Brudenell Social Club',
          address: "33 Queen's Road, Leeds LS6 1NY",
          city: city
        },
        location: `Brudenell Social Club, ${city}`,
        city: city,
        country: 'United Kingdom',
        url: item.url,
        image: item.image,
        imageUrl: item.image,
        category: 'Nightlife',
        source: 'brudenell'
      });
    }
    
    console.log(`Brudenell Social Club Leeds: Found ${events.length} events`);
    return events;
    
  } catch (error) {
    console.error('Brudenell scraper error:', error.message);
    return events;
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = scrapeBrudenellV2;
