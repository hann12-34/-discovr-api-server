/**
 * Calgary Philharmonic Events Scraper
 * URL: https://calgaryphil.com/concerts/
 * Has real event images
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

const MONTHS = { january:'01',february:'02',march:'03',april:'04',may:'05',june:'06',
  july:'07',august:'08',september:'09',october:'10',november:'11',december:'12' };

function parseDate(raw) {
  // "17 April 2026" or "2 May 2026"
  const m = raw.match(/(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i);
  if (m) return `${m[3]}-${MONTHS[m[2].toLowerCase()]}-${m[1].padStart(2,'0')}`;
  return null;
}

async function scrape(city = 'Calgary') {
  console.log('🎻 Scraping Calgary Philharmonic events...');

  try {
    const response = await axios.get('https://calgaryphil.com/concerts/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      timeout: 15000
    });

    const $ = cheerio.load(response.data);
    const events = [];
    const seenTitles = new Set();
    const today = new Date().toISOString().slice(0, 10);

    // Events are in .mpspx-event-griditem-wrapper elements
    $('.mpspx-event-griditem-wrapper').each((i, el) => {
      const $e = $(el);
      const title = $e.find('[class*=name],[class*=title],h2,h3').first().text().trim() ||
                    $e.text().split(/\d{1,2}\s+\w+\s+\d{4}/)[0].trim();
      if (!title || title.length < 3) return;

      const titleKey = title.toLowerCase().replace(/[^a-z]/g, '');
      if (seenTitles.has(titleKey)) return;
      seenTitles.add(titleKey);

      const rawText = $e.text().replace(/\s+/g, ' ').trim();
      const dateMatch = rawText.match(/(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i);
      const dateStr = dateMatch ? parseDate(dateMatch[0]) : null;
      if (!dateStr || dateStr < today) return;

      let url = $e.find('a[href*="/events/"]').first().attr('href') || $e.find('a').first().attr('href') || '';
      if (url && !url.startsWith('http')) url = 'https://calgaryphil.com' + url;
      if (!url) url = 'https://calgaryphil.com/concerts/';

      const imageUrl = $e.find('img').attr('src') || $e.find('img').attr('data-src') || null;

      events.push({
        id: uuidv4(),
        title,
        url,
        date: dateStr,
        description: '',
        imageUrl: imageUrl && !/logo|icon|placeholder/i.test(imageUrl) ? imageUrl : null,
        venue: {
          name: 'Jack Singer Concert Hall',
          address: '205 8 Ave SE, Calgary, AB T2G 0K9',
          city: 'Calgary',
        },
        city,
        source: 'calgary-philharmonic',
      });
    });

    console.log(`✅ Calgary Philharmonic: ${events.length} events`);
    return filterEvents(events);

  } catch (error) {
    console.error('  ⚠️ Calgary Philharmonic error:', error.message);
    return [];
  }
}

module.exports = scrape;
