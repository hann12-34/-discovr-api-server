/**
 * Frankie's Jazz Club Events Scraper
 * URL: https://frankiesjazzclub.turntabletickets.com/
 * Vancouver's premier live jazz & blues venue at 755 Beatty St
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const FrankiesJazzClubEvents = {
  async scrape(city = 'Vancouver') {
    console.log('🎷 Scraping Frankie\'s Jazz Club...');
    let browser;

    try {
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

      await page.goto('https://frankiesjazzclub.turntabletickets.com/', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      await delay(3000);

      const eventData = await page.evaluate(() => {
        const events = [];
        const seen = new Set();

        // TurntableTickets uses event cards/listing items
        const containers = document.querySelectorAll(
          '.event, .event-card, .show, .listing-item, article, ' +
          '[class*="event-item"], [class*="show-card"], [class*="listing"], ' +
          '.card, .performance, li[class*="event"]'
        );

        containers.forEach(container => {
          const titleEl = container.querySelector('h1, h2, h3, h4, .event-title, .show-title, [class*="title"], .name');
          const title = titleEl ? titleEl.textContent.trim() : '';
          if (!title || title.length < 3 || seen.has(title)) return;

          // Skip navigation items
          if (/^(home|about|contact|menu|tickets|reservations|gift|merch)$/i.test(title)) return;

          seen.add(title);

          let url = '';
          const linkEl = container.querySelector('a[href]');
          if (linkEl) {
            url = linkEl.href;
            if (!url.startsWith('http')) url = 'https://frankiesjazzclub.turntabletickets.com' + url;
          }

          let dateText = '';
          const dateEl = container.querySelector(
            'time, [datetime], .date, .event-date, .show-date, [class*="date"], [class*="time"]'
          );
          if (dateEl) {
            dateText = dateEl.getAttribute('datetime') || dateEl.textContent.trim();
          }

          // Fallback: look for date pattern in container text
          if (!dateText) {
            const text = container.textContent;
            const dateMatch = text.match(
              /(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*[,.]?\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:st|nd|rd|th)?[,.]?\s*\d{0,4}/i
            ) || text.match(
              /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:st|nd|rd|th)?[,.]?\s*\d{0,4}/i
            );
            if (dateMatch) dateText = dateMatch[0].trim();
          }

          let imageUrl = null;
          const img = container.querySelector('img:not([src*="logo"]):not([src*="icon"])');
          if (img) {
            imageUrl = img.src || img.getAttribute('data-src');
          }

          let description = '';
          const descEl = container.querySelector('p, .description, .event-description, [class*="desc"]');
          if (descEl) {
            description = descEl.textContent.trim();
          }

          events.push({ title, dateText, url, imageUrl, description });
        });

        // Fallback: broader link scan
        if (events.length === 0) {
          const allLinks = document.querySelectorAll('a[href]');
          allLinks.forEach(link => {
            const title = link.textContent.trim();
            const href = link.href;
            if (title && title.length > 4 && title.length < 200 && !seen.has(title)) {
              if (/^(home|about|contact|menu|tickets|reservations|gift|merch|sign|log|privacy|terms)$/i.test(title)) return;
              const parent = link.closest('div, article, section, li');
              let dateText = '';
              if (parent) {
                const text = parent.textContent;
                const dateMatch = text.match(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}/i);
                if (dateMatch) dateText = dateMatch[0];
              }
              if (dateText) {
                seen.add(title);
                events.push({ title, dateText, url: href, imageUrl: null, description: '' });
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
            name: "Frankie's Jazz Club",
            address: '755 Beatty St, Vancouver, BC V6B 2M4',
            city: 'Vancouver'
          },
          latitude: 49.2778,
          longitude: -123.1103,
          city: 'Vancouver',
          category: 'Music',
          source: "Frankie's Jazz Club"
        });
      }

      const unique = [];
      const seenKeys = new Set();
      for (const e of events) {
        const key = `${e.title}|${e.date}`;
        if (!seenKeys.has(key)) { seenKeys.add(key); unique.push(e); }
      }

      console.log(`  ✅ Found ${unique.length} Frankie's Jazz Club events`);
      return unique;

    } catch (error) {
      console.error(`  ⚠️ Frankie's Jazz Club error: ${error.message}`);
      if (browser) await browser.close();
      return [];
    }
  }
};

module.exports = FrankiesJazzClubEvents.scrape;
