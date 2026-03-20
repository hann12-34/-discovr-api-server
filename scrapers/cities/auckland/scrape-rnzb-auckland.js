const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapeRNZBAuckland(city = 'auckland') {
  console.log('🎭 Scraping Royal NZ Ballet (Puppeteer)...');
  let browser;
  try {
    browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    await page.goto('https://www.rnzb.org.nz/whats-on/', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

    const rawEvents = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      const details = document.querySelectorAll('[class*="ShowCard_eventDetails"]');
      details.forEach(el => {
        const parent = el.closest('[class*="ShowCard"]') || el.parentElement;
        if (!parent) return;
        const text = parent.textContent.replace(/\s+/g, ' ').trim();
        const linkEl = parent.querySelector('a[href]') || parent.closest('a[href]');
        const url = linkEl ? linkEl.href : '';
        if (!url) return;
        // Extract title from text - after the date+venue portion
        const parts = text.split(/\d{2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}/i);
        let title = parts.length > 1 ? parts[parts.length - 1].trim() : '';
        // Clean: remove venue prefix patterns (no separator between venue and title)
        title = title.replace(/^(Kiri Te Kanawa Theatre,?\s*Aotea Centre|Aotea Centre|The Regent|Isaac Theatre Royal|Opera House|St James Theatre|Michael Fowler Centre)/i, '').trim();
        if (!title || title.length < 3) return;
        const key = title.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        // Extract date from text
        const dateMatch = text.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})/i);
        if (!dateMatch) return;
        const months = {jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12'};
        const dateRaw = dateMatch[3] + '-' + months[dateMatch[2].toLowerCase()] + '-' + dateMatch[1].padStart(2,'0');
        // Image from parent's ShowCard container
        const grandParent = parent.closest('[class*="ShowCard_show"]') || parent.parentElement;
        const img = grandParent ? (grandParent.querySelector('img')?.src || '') : '';
        results.push({ title, dateRaw, url, image: img, description: '' });
      });
      return results;
    });

    await browser.close();
    const events = [];
    const now = new Date();
    const todayStr = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0');

    for (const raw of rawEvents) {
      if (raw.dateRaw < todayStr) continue;
      events.push({
        id: uuidv4(),
        title: raw.title,
        date: raw.dateRaw,
        url: raw.url,
        description: raw.description,
        imageUrl: raw.image,
        venue: { name: 'Royal NZ Ballet', address: 'Auckland, NZ', city: 'auckland' },
        latitude: -36.8485,
        longitude: 174.7633,
        city: 'auckland',
        category: 'Dance',
        source: 'Royal NZ Ballet'
      });
    }

    console.log('  ✅ Royal NZ Ballet:', events.length, 'events');
    return filterEvents(events);
  } catch (error) {
    if (browser) await browser.close().catch(() => {});
    console.error('  ⚠️ Royal NZ Ballet error:', error.message);
    return [];
  }
}

module.exports = scrapeRNZBAuckland;
