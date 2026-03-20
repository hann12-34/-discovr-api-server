/**
 * Science World Events Scraper
 * URL: https://www.scienceworld.ca/today/events/
 * Vancouver's iconic geodesic dome science museum
 * Special events like After Dark, talks, films, family events
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const ScienceWorldEvents = {
  async scrape(city = 'Vancouver') {
    console.log('🔬 Scraping Science World events...');
    let browser;

    try {
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
      
      await page.goto('https://www.scienceworld.ca/today/events/', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      await delay(3000);

      const eventData = await page.evaluate(() => {
        const events = [];
        const seen = new Set();

        // Science World renders event links like:
        // <a href="/event/after-dark-lego-...">MAR26After Dark: ... March 26, 2026 · 6pm</a>
        const eventLinks = document.querySelectorAll('a[href*="/event/"]');

        eventLinks.forEach(link => {
          const url = link.href;
          if (!url || !url.includes('scienceworld.ca')) return;
          if (seen.has(url)) return;
          seen.add(url);

          const rawText = link.textContent.trim();
          if (!rawText || rawText.length < 5) return;

          // The text format is like: "MAR26After Dark: Creativity in Bloom...March 26, 2026 · 6pm"
          // Extract the title by removing the leading month/day prefix
          let title = rawText.replace(/^[A-Z]{3}\d{1,2}/, '').trim();

          // Extract date from the text (e.g., "March 26, 2026")
          let dateText = '';
          const dateMatch = rawText.match(
            /((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:\s*[–&,]\s*\d{1,2})?,?\s*\d{4})/i
          );
          if (dateMatch) {
            dateText = dateMatch[1].trim();
            // Remove date and everything after from title
            const dateIdx = title.indexOf(dateMatch[1].split(' ')[0]);
            if (dateIdx > 5) {
              title = title.substring(0, dateIdx).trim();
            }
          }

          // Also try short month format from the prefix (MAR26 = March 26)
          if (!dateText) {
            const prefixMatch = rawText.match(/^([A-Z]{3})(\d{1,2})/);
            if (prefixMatch) {
              const monthMap = {
                'JAN': 'January', 'FEB': 'February', 'MAR': 'March', 'APR': 'April',
                'MAY': 'May', 'JUN': 'June', 'JUL': 'July', 'AUG': 'August',
                'SEP': 'September', 'OCT': 'October', 'NOV': 'November', 'DEC': 'December'
              };
              const month = monthMap[prefixMatch[1]];
              if (month) {
                dateText = month + ' ' + prefixMatch[2] + ', ' + new Date().getFullYear();
              }
            }
          }

          // Clean trailing date/time text from title
          title = title.replace(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}[\s\S]*/i, '').trim();
          title = title.replace(/\d{1,2}(:\d{2})?\s*(am|pm)[\s\S]*/i, '').trim();
          title = title.replace(/·[\s\S]*$/i, '').trim();

          // Skip navigation/generic links
          if (/^(see past|buy tickets|get tickets|search|see the|events|upcoming event)/i.test(title)) return;
          if (title.length < 5) return;

          // Get image from parent/sibling
          let imageUrl = null;
          const parent = link.closest('div, section, article, li');
          if (parent) {
            const img = parent.querySelector('img:not([src*="logo"])');
            if (img) imageUrl = img.src || img.getAttribute('data-src');
          }

          events.push({ title, dateText, url, imageUrl, description: '' });
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
          // Try ISO format first (datetime attribute)
          const isoMatch = item.dateText.match(/(\d{4})-(\d{2})-(\d{2})/);
          if (isoMatch) {
            isoDate = isoMatch[0];
          } else {
            // Try text date patterns
            const patterns = [
              /(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/i,
              /(\d{1,2})(?:st|nd|rd|th)?\s+(\w+),?\s*(\d{4})?/i
            ];
            for (const p of patterns) {
              const m = item.dateText.match(p);
              if (m) {
                if (months[m[1].toLowerCase()]) {
                  const month = months[m[1].toLowerCase()];
                  const day = m[2].padStart(2, '0');
                  const year = m[3] || currentYear.toString();
                  isoDate = `${year}-${month}-${day}`;
                } else if (months[m[2].toLowerCase()]) {
                  const month = months[m[2].toLowerCase()];
                  const day = m[1].padStart(2, '0');
                  const year = m[3] || currentYear.toString();
                  isoDate = `${year}-${month}-${day}`;
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
            name: 'Science World',
            address: '1455 Quebec St, Vancouver, BC V6A 3Z7',
            city: 'Vancouver'
          },
          latitude: 49.2734,
          longitude: -123.1038,
          city: 'Vancouver',
          category: 'Science & Education',
          source: 'Science World'
        });
      }

      // Deduplicate
      const unique = [];
      const seenKeys = new Set();
      for (const e of events) {
        const key = `${e.title}|${e.date}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          unique.push(e);
        }
      }

      console.log(`  ✅ Found ${unique.length} Science World events`);
      return unique;

    } catch (error) {
      console.error(`  ⚠️ Science World error: ${error.message}`);
      if (browser) await browser.close();
      return [];
    }
  }
};

module.exports = ScienceWorldEvents.scrape;
