/**
 * Guilt & Company Events Scraper
 * URL: https://www.guiltandcompany.com/
 * Calendar: https://tockify.com/guiltandcompany/pinboard
 * Gastown underground live music bar - over 500 shows per year
 * 1 Alexander Street, Vancouver
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const GuiltAndCompanyEvents = {
  async scrape(city = 'Vancouver') {
    console.log('🎵 Scraping Guilt & Company...');
    let browser;

    try {
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

      // Tockify calendar is JS-rendered
      await page.goto('https://tockify.com/guiltandcompany/pinboard', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      await delay(4000);

      // Scroll down to load more events
      for (let i = 0; i < 5; i++) {
        await page.evaluate(() => window.scrollBy(0, 800));
        await delay(1000);
      }

      const eventData = await page.evaluate(() => {
        const events = [];
        const seen = new Set();

        // Tockify renders events as cards/pins
        const containers = document.querySelectorAll(
          '.pinboard-event, .tkf-pin, [class*="event"], [class*="pin"], .card, article'
        );

        containers.forEach(container => {
          const titleEl = container.querySelector(
            '.event-title, .tkf-pin__title, h1, h2, h3, h4, [class*="title"], [class*="name"]'
          );
          const title = titleEl ? titleEl.textContent.trim() : '';
          if (!title || title.length < 3 || seen.has(title)) return;
          if (/^(home|menu|faq|reservations|gift|contact)$/i.test(title)) return;
          seen.add(title);

          let url = '';
          const linkEl = container.querySelector('a[href]');
          if (linkEl) url = linkEl.href;

          let dateText = '';
          const dateEl = container.querySelector(
            'time, [datetime], .date, .event-date, [class*="date"], [class*="when"], [class*="time"]'
          );
          if (dateEl) {
            dateText = dateEl.getAttribute('datetime') || dateEl.textContent.trim();
          }
          if (!dateText) {
            const text = container.textContent;
            const dateMatch = text.match(
              /(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*[,.]?\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:st|nd|rd|th)?[,.]?\s*\d{0,4}/i
            ) || text.match(
              /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:st|nd|rd|th)?[,.]?\s*\d{0,4}/i
            ) || text.match(
              /\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*\d{0,4}/i
            );
            if (dateMatch) dateText = dateMatch[0].trim();
          }

          let imageUrl = null;
          const img = container.querySelector('img:not([src*="logo"]):not([src*="icon"])');
          if (img) {
            imageUrl = img.src || img.getAttribute('data-src');
          }
          // Tockify also uses background images
          if (!imageUrl) {
            const bgEl = container.querySelector('[style*="background-image"]');
            if (bgEl) {
              const bgMatch = bgEl.getAttribute('style').match(/url\(["']?([^"')]+)["']?\)/);
              if (bgMatch) imageUrl = bgMatch[1];
            }
          }

          let description = '';
          const descEl = container.querySelector('p, .description, [class*="desc"], [class*="excerpt"]');
          if (descEl) {
            description = descEl.textContent.trim();
          }

          events.push({ title, dateText, url, imageUrl, description });
        });

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
            name: 'Guilt & Company',
            address: '1 Alexander St, Vancouver, BC V6A 1B2',
            city: 'Vancouver'
          },
          latitude: 49.2836,
          longitude: -123.1041,
          city: 'Vancouver',
          category: 'Music',
          source: 'Guilt & Company'
        });
      }

      const unique = [];
      const seenKeys = new Set();
      for (const e of events) {
        const key = `${e.title}|${e.date}`;
        if (!seenKeys.has(key)) { seenKeys.add(key); unique.push(e); }
      }

      console.log(`  ✅ Found ${unique.length} Guilt & Company events`);
      return unique;

    } catch (error) {
      console.error(`  ⚠️ Guilt & Company error: ${error.message}`);
      if (browser) await browser.close();
      return [];
    }
  }
};

module.exports = GuiltAndCompanyEvents.scrape;
