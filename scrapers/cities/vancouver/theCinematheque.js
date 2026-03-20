/**
 * The Cinematheque Events Scraper
 * URL: https://thecinematheque.ca/films/calendar
 * Vancouver's art house cinema at 1131 Howe Street
 * Film screenings, retrospectives, festivals
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const TheCinemathequeEvents = {
  async scrape(city = 'Vancouver') {
    console.log('🎬 Scraping The Cinematheque...');
    let browser;

    try {
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

      // Use the calendar page which has dates directly visible
      await page.goto('https://thecinematheque.ca/films/calendar', {
        waitUntil: 'domcontentloaded',
        timeout: 45000
      });
      await delay(5000);

      // Scroll to load more
      for (let i = 0; i < 5; i++) {
        await page.evaluate(() => window.scrollBy(0, 800));
        await delay(800);
      }

      const eventData = await page.evaluate(() => {
        const events = [];
        const seen = new Set();

        // Calendar page shows dates with film screenings
        // Look for date headers + screening items
        const dayContainers = document.querySelectorAll(
          '[class*="calendar-day"], [class*="schedule"], [class*="day-group"], ' +
          'tr, .row, article, li, [class*="screening"]'
        );

        dayContainers.forEach(container => {
          const text = container.textContent || '';
          
          // Try to find date in the container
          const dateMatch = text.match(
            /(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*[,.]?\s*((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:st|nd|rd|th)?[,.]?\s*\d{0,4})/i
          ) || text.match(
            /((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?[,.]?\s*\d{0,4})/i
          ) || text.match(
            /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}(?:st|nd|rd|th)?[,.]?\s*\d{0,4})/i
          );
          
          if (!dateMatch) return;
          const dateText = (dateMatch[1] || dateMatch[0]).trim();

          // Find film titles in this day container
          const titleEls = container.querySelectorAll('a[href*="/films/"], h3, h4, .title, [class*="title"]');
          titleEls.forEach(titleEl => {
            const title = titleEl.textContent.trim();
            if (!title || title.length < 3) return;
            // Skip times, numbers, and generic labels
            if (/^\d{1,2}:\d{2}$/.test(title)) return;
            if (/^\d{1,2}(:\d{2})?\s*(am|pm)$/i.test(title)) return;
            if (/^(buy tickets|book|calendar|films|series|home|about|donate|visit)$/i.test(title)) return;
            
            const key = `${title}|${dateText}`;
            if (seen.has(key)) return;
            seen.add(key);

            let url = '';
            const link = titleEl.tagName === 'A' ? titleEl : titleEl.querySelector('a');
            if (link) url = link.href;

            let imageUrl = null;
            const img = container.querySelector('img:not([src*="logo"])');
            if (img) imageUrl = img.src || img.getAttribute('data-src');

            events.push({ title, dateText, url, imageUrl, description: '' });
          });
        });

        // Broader fallback: find all links to films and extract nearest date
        if (events.length === 0) {
          const filmLinks = document.querySelectorAll('a[href*="/films/20"]');
          filmLinks.forEach(link => {
            const title = link.textContent.trim();
            const url = link.href;
            if (!title || title.length < 3 || seen.has(title + '|')) return;

            // Search upward for a date
            let el = link.parentElement;
            let dateText = '';
            for (let i = 0; i < 8 && el; i++) {
              const t = el.textContent || '';
              const dm = t.match(/((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2})/i);
              if (dm) { dateText = dm[1]; break; }
              el = el.parentElement;
            }

            if (dateText) {
              const key = `${title}|${dateText}`;
              if (!seen.has(key)) {
                seen.add(key);
                events.push({ title, dateText, url, imageUrl: null, description: '' });
              }
            }
          });
        }

        return events;
      });

      await browser.close();

      const months = {
        'january': '01', 'february': '02', 'march': '03', 'april': '04',
        'may': '05', 'june': '06', 'july': '07', 'august': '08',
        'september': '09', 'october': '10', 'november': '11', 'december': '12',
        'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
        'jun': '06', 'jul': '07', 'aug': '08', 'sep': '09',
        'oct': '10', 'nov': '11', 'dec': '12'
      };

      const events = [];
      const currentYear = new Date().getFullYear();

      for (const item of eventData) {
        let isoDate = null;

        if (item.dateText) {
          const isoMatch = item.dateText.match(/(\d{4})-(\d{2})-(\d{2})/);
          if (isoMatch) {
            isoDate = isoMatch[0];
          } else {
            const patterns = [
              /(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/i,
              /(\d{1,2})(?:st|nd|rd|th)?\s+(\w+),?\s*(\d{4})?/i
            ];
            for (const p of patterns) {
              const m = item.dateText.match(p);
              if (m) {
                if (months[m[1].toLowerCase()]) {
                  isoDate = `${m[3] || currentYear}-${months[m[1].toLowerCase()]}-${m[2].padStart(2, '0')}`;
                } else if (months[m[2].toLowerCase()]) {
                  isoDate = `${m[3] || currentYear}-${months[m[2].toLowerCase()]}-${m[1].padStart(2, '0')}`;
                }
                break;
              }
            }
          }
        }

        if (!isoDate) continue;
        if (new Date(isoDate) < new Date()) continue;
        if (!item.url) continue;

        events.push({
          id: uuidv4(),
          title: item.title,
          date: isoDate,
          url: item.url,
          imageUrl: item.imageUrl || null,
          description: item.description || '',
          venue: {
            name: 'The Cinematheque',
            address: '1131 Howe St, Vancouver, BC V6Z 2L7',
            city: 'Vancouver'
          },
          latitude: 49.2776,
          longitude: -123.1261,
          city: 'Vancouver',
          category: 'Film',
          source: 'The Cinematheque'
        });
      }

      // Deduplicate
      const unique = [];
      const seenKeys = new Set();
      for (const e of events) {
        const key = `${e.title}|${e.date}`;
        if (!seenKeys.has(key)) { seenKeys.add(key); unique.push(e); }
      }

      console.log(`  ✅ Found ${unique.length} Cinematheque screenings`);
      return unique;

    } catch (error) {
      console.error(`  ⚠️ Cinematheque error: ${error.message}`);
      if (browser) await browser.close();
      return [];
    }
  }
};

module.exports = TheCinemathequeEvents.scrape;
