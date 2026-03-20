/**
 * Harbour Event & Convention Centre (HECC) Events Scraper
 * URL: https://www.harbourconventioncentre.com/calendar
 * Vancouver's premier nightlife & live entertainment venue
 * Big DJ events, EDM, concerts at 760 Pacific Blvd
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

const HarbourConventionCentreEvents = {
  async scrape(city = 'Vancouver') {
    console.log('🎧 Scraping Harbour Convention Centre...');

    try {
      const response = await axios.get('https://www.harbourconventioncentre.com/calendar', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml'
        },
        timeout: 15000
      });

      const $ = cheerio.load(response.data);
      const events = [];
      const seen = new Set();

      // Harbour uses links to tixr.com for each event
      // Text format: "EVENT NAMESatMarMarch2110:00 pmGET TICKETS"
      const monthMap = {
        'january': '01', 'february': '02', 'march': '03', 'april': '04',
        'may': '05', 'june': '06', 'july': '07', 'august': '08',
        'september': '09', 'october': '10', 'november': '11', 'december': '12'
      };

      $('a[href*="tixr.com/e/"]').each((i, el) => {
        const rawText = $(el).text().trim();
        const ticketUrl = $(el).attr('href');
        if (!rawText || rawText.length < 5 || !ticketUrl) return;

        // Text format examples:
        //   "Don Diablo & Sick IndividualsFriMarMarch2711:00 pmGET TICKETS"
        //   "Lost FrequenciesFriAprApril310:00 pmGET TICKETS"
        //   "Insomnia 2026SatAprApril46:00 pmGET TICKETS"
        // Step 1: Extract month name and the digits+time after it
        const dateMatch = rawText.match(
          /(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[A-Za-z]{3}(January|February|March|April|May|June|July|August|September|October|November|December)(\d+:\d{2}\s*[ap]m)/i
        );

        if (!dateMatch) return;

        const fullMonth = dateMatch[1].toLowerCase();
        const dayTimePart = dateMatch[2]; // e.g., "310:00 pm" or "2711:00 pm" or "46:00 pm"

        // Step 2: Parse day and time from combined string
        // Time always has colon — find the hour:minute pattern (valid hour: 1-12)
        const timeMatch = dayTimePart.match(/(1[0-2]|[1-9]):(\d{2})\s*([ap]m)/i);
        if (!timeMatch) return;

        const timeStr = timeMatch[0]; // e.g., "10:00 pm"
        const timeIdx = dayTimePart.indexOf(timeStr);
        const day = dayTimePart.substring(0, timeIdx); // e.g., "3" from "310:00 pm"
        const time = timeStr;

        if (!day || isNaN(parseInt(day)) || parseInt(day) < 1 || parseInt(day) > 31) return;

        const monthNum = monthMap[fullMonth];
        if (!monthNum) return;

        // Determine year - if month is before current month, it's next year
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const monthInt = parseInt(monthNum);
        let year = now.getFullYear();
        if (monthInt < currentMonth - 1) year++;

        const isoDate = `${year}-${monthNum}-${day.padStart(2, '0')}`;
        if (new Date(isoDate) < new Date()) return;

        // Extract title: everything before the day-of-week abbreviation
        const dayOfWeekMatch = rawText.match(/(Mon|Tue|Wed|Thu|Fri|Sat|Sun)/);
        let title = dayOfWeekMatch ? rawText.substring(0, dayOfWeekMatch.index).trim() : rawText;

        // Clean up common suffixes that get concatenated
        title = title.replace(/DOMINA$/i, '').trim();
        title = title.replace(/RSVP\/Tables Template$/i, '').trim();
        title = title.replace(/GET TICKETS$/i, '').trim();

        // Remove duplicate/truncated artist name suffixes
        // e.g., "Machine Girl - PsychoWarrior TourMachine Girl - PsychoWarr"
        // Check if any suffix (>5 chars) matches the start of the title
        for (let len = Math.floor(title.length / 2); len >= 5; len--) {
          const suffix = title.substring(title.length - len);
          if (title.startsWith(suffix) || title.substring(0, len + 5).includes(suffix)) {
            title = title.substring(0, title.length - len).trim();
            break;
          }
        }

        if (!title || title.length < 3) return;
        if (seen.has(title + isoDate)) return;
        seen.add(title + isoDate);

        // Try to get image
        let imageUrl = null;
        const parentEl = $(el).closest('div, section, article');
        if (parentEl.length) {
          const img = parentEl.find('img').first();
          if (img.length) {
            imageUrl = img.attr('src') || img.attr('data-src');
          }
        }
        // Also check for background-image in the link itself
        if (!imageUrl) {
          const style = $(el).attr('style') || '';
          const bgMatch = style.match(/url\(["']?([^"')]+)["']?\)/);
          if (bgMatch) imageUrl = bgMatch[1];
        }

        events.push({
          id: uuidv4(),
          title,
          date: isoDate,
          time,
          url: ticketUrl,
          imageUrl: imageUrl || null,
          description: '',
          venue: {
            name: 'Harbour Event & Convention Centre',
            address: '760 Pacific Blvd, Vancouver, BC V6B 5E7',
            city: 'Vancouver'
          },
          latitude: 49.2749,
          longitude: -123.1117,
          city: 'Vancouver',
          category: 'Nightlife',
          source: 'Harbour Convention Centre'
        });
      });

      console.log(`  ✅ Found ${events.length} Harbour Convention Centre events`);
      return events;

    } catch (error) {
      console.error(`  ⚠️ Harbour Convention Centre error: ${error.message}`);
      return [];
    }
  }
};

module.exports = HarbourConventionCentreEvents.scrape;
