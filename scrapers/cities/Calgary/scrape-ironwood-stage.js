/**
 * Ironwood Stage Calgary Events Scraper
 * URL: https://www.ironwoodstage.ca/calendar/
 * Has real event images
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrape(city = 'Calgary') {
  console.log('🎸 Scraping Ironwood Stage events...');

  try {
    const response = await axios.get('https://www.ironwoodstage.ca/calendar/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      timeout: 15000
    });

    const $ = cheerio.load(response.data);
    const events = [];
    const seenTitles = new Set();

    // Find event entries
    $('article, .event, [class*="event"], .tribe-events, a[href*="/event/"]').each((i, el) => {
      const $e = $(el);
      
      let title = $e.find('h1, h2, h3, h4, .tribe-event-title, .title').first().text().trim();
      if (!title || title.length < 3) return;
      
      if (/menu|filter|calendar|view/i.test(title)) return;
      
      const titleKey = title.toLowerCase().replace(/[^a-z]/g, '');
      if (seenTitles.has(titleKey)) return;
      seenTitles.add(titleKey);

      let url = $e.attr('href') || $e.find('a').first().attr('href');
      if (url && !url.startsWith('http')) {
        url = 'https://www.ironwoodstage.ca' + url;
      }

      let image = null;
      const img = $e.find('img').first();
      if (img.length) {
        image = img.attr('src') || img.attr('data-src');
        if (image && /logo|icon/i.test(image)) image = null;
      }

      // Extract date from element text
      const dateText = $e.text();
      const dateMatch = dateText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})(?:[,\s]+(\d{4}))?/i);
      let eventDate = null;
      if (dateMatch) {
        const months = {jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12'};
        const month = months[dateMatch[1].toLowerCase().slice(0,3)];
        const day = dateMatch[2].padStart(2, '0');
        const year = dateMatch[3] || (parseInt(month) < new Date().getMonth() + 1 ? '2026' : '2025');
        eventDate = `${year}-${month}-${day}`;
      }
      
      if (title && eventDate) {
        events.push({
          id: uuidv4(),
          title: title.substring(0, 100),
          date: eventDate,
          url: url || 'https://www.ironwoodstage.ca/calendar/',
          image: image,
          imageUrl: image,
          venue: {
            name: 'Ironwood Stage & Grill',
            address: '1229 9 Ave SE, Calgary, AB T2G 0S9',
            city: 'Calgary'
          },
          city: 'Calgary',
          category: 'Music',
          source: 'Ironwood Stage'
        });
      }
    });

    // Fetch images from event pages
    for (const event of events.slice(0, 15)) {
      if (event.url && !event.image) {
        try {
          const page = await axios.get(event.url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 8000 });
          const $p = cheerio.load(page.data);
          const ogImage = $p('meta[property="og:image"]').attr('content');
          if (ogImage && !ogImage.includes('logo')) {
            event.image = ogImage;
            event.imageUrl = ogImage;
          }
        } catch (e) {}
      }
    }

    const withImages = events.filter(e => e.image);
    console.log(`✅ Ironwood Stage: ${withImages.length} events with images`);
    return withImages;

  } catch (error) {
    console.error('  ⚠️ Ironwood Stage error:', error.message);
    return [];
  }
}

module.exports = scrape;
