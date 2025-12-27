/**
 * Rebel Nightclub Events Scraper (Toronto)
 * Major Toronto nightclub venue
 * URL: https://rebeltoronto.com/events/
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapeRebelNightclub(city = 'Toronto') {
  console.log('🎪 Scraping Rebel Nightclub...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://rebeltoronto.com/events/', {
      waitUntil: 'domcontentloaded',
      timeout: 90000
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      const months = {
        'JANUARY': '01', 'FEBRUARY': '02', 'MARCH': '03', 'APRIL': '04',
        'MAY': '05', 'JUNE': '06', 'JULY': '07', 'AUGUST': '08',
        'SEPTEMBER': '09', 'OCTOBER': '10', 'NOVEMBER': '11', 'DECEMBER': '12'
      };
      
      const datePattern = /(MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY),\s+(JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER)\s+(\d{1,2})/i;
      
      // Find event cards - look for smallest containers with date AND 2025 background image
      const candidates = [];
      document.querySelectorAll('div, article').forEach(el => {
        const text = el.textContent?.trim();
        const dateMatch = text?.match(datePattern);
        if (!dateMatch) return;
        
        // Only use images from 2025/2026 uploads - skip old header images
        let bgImg = null;
        const checkBg = (element) => {
          const bg = getComputedStyle(element).backgroundImage;
          if (bg && bg !== 'none' && bg.includes('wp-content/uploads/202')) {
            const match = bg.match(/url\(["']?([^"')]+)["']?\)/);
            if (match) {
              const url = match[1];
              // Only accept 2025/2026 images, reject old 2022/2023/2024 images
              if ((url.includes('/2025/') || url.includes('/2026/')) && 
                  !url.includes('logo') && !url.includes('pattern')) {
                return url;
              }
            }
          }
          return null;
        };
        
        bgImg = checkBg(el);
        if (!bgImg) {
          for (const child of el.querySelectorAll('*')) {
            bgImg = checkBg(child);
            if (bgImg) break;
          }
        }
        
        // Only add if we found a valid 2025/2026 image
        if (bgImg) {
          candidates.push({ el, text, dateMatch, bgImg, childCount: el.childElementCount });
        }
      });
      
      // Sort by child count (smallest containers first) to avoid duplicates
      candidates.sort((a, b) => a.childCount - b.childCount);
      
      for (const { text, dateMatch, bgImg } of candidates) {
        const monthStr = dateMatch[2].toUpperCase();
        const day = dateMatch[3].padStart(2, '0');
        const month = months[monthStr];
        
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();
        const eventMonth = parseInt(month);
        const year = eventMonth < currentMonth ? currentYear + 1 : currentYear;
        const isoDate = `${year}-${month}-${day}`;
        
        // Extract title - line before date
        const lines = text.split('\n').map(l => l.trim()).filter(l => l && l.length > 2);
        let title = null;
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].match(datePattern) && i > 0) {
            const candidate = lines[i - 1];
            if (candidate !== 'UPCOMING EVENTS' && candidate !== 'BUY TICKETS') {
              title = candidate;
              break;
            }
          }
        }
        
        if (title && !seen.has(title + isoDate)) {
          seen.add(title + isoDate);
          
          // Find ticket link
          let url = 'https://rebeltoronto.com/events/';
          document.querySelectorAll('a[href*="ticket"]').forEach(a => {
            if (a.textContent?.includes(title.substring(0, 10))) {
              url = a.href;
            }
          });
          
          results.push({
            title: title,
            date: isoDate,
            url: url,
            imageUrl: bgImg
          });
        }
      }
      
      return results;
    });

    await browser.close();

    console.log(`  ✅ Found ${events.length} Rebel events`);

    const formattedEvents = events.map(event => ({
      id: uuidv4(),
      title: event.title,
      date: event.date,
      startDate: event.date ? new Date(event.date + 'T00:00:00') : null,
      url: event.url,
      imageUrl: event.imageUrl,
      venue: {
        name: 'Rebel Nightclub',
        address: '11 Polson St, Toronto, ON M5A 1A4',
        city: 'Toronto'
      },
      latitude: 43.6391,
      longitude: -79.3595,
      city: 'Toronto',
      category: 'Nightlife',
      source: 'Rebel Nightclub'
    }));

    formattedEvents.forEach(e => console.log(`  ✓ ${e.title} | ${e.date}`));
    
    return filterEvents(formattedEvents);

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Rebel error:', error.message);
    return [];
  }
}

module.exports = scrapeRebelNightclub;
