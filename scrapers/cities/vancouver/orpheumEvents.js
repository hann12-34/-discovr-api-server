/**
   * Scroll the page to trigger lazy loading with human-like behavior
   * @param {Page} page - Puppeteer page object
   */
  async scrollPage(page) {
    // Get page height for intelligent scrolling
    const pageHeight = await page.evaluate(() => document.body.scrollHeight);

    console.log(`Scrolling page with height ${pageHeight}px to load dynamic content...`);

    // Human-like scrolling pattern with random pauses
    await page.evaluate(async () => {
      const randomScrollDelay = (min, max) => {
        const delay = Math.floor(Math.random() * (max - min + 1) + min);
        return new Promise(resolve => setTimeout(resolve, delay));
      };

      // Initial pause like a human would do
      await randomScrollDelay(500, 1500);

      // Random number of scrolls (5-8) with varying distances
      const scrollCount = Math.floor(Math.random() * 4) + 5;

      for (let i = 0; i < scrollCount; i++) {
        // Random scroll distance between 300-800px
        const scrollDistance = Math.floor(Math.random() * 500) + 300;
        window.scrollBy(0, scrollDistance);

        // Random pause between scrolls (400-2000ms)
        await randomScrollDelay(400, 2000);

        // Small chance (20%) to scroll back up slightly to simulate reading behavior
        if (Math.random() < 0.2) {
          window.scrollBy(0, -Math.floor(Math.random() * 200));
          await randomScrollDelay(300, 800);
        }
      }

      // Final scroll to bottom to ensure all content is loaded

      if (monthMatches.length >= 2) {
        let endDateText = monthMatches[1];
        if (!endDateText.match(/\d{4}/)) {
          endDateText = `${endDateText}, ${currentYear}`;
        }
        endDate = new Date(endDateText);
      } else {
        endDate = new Date(startDate);
      }

      // Look for time information
      const timePattern = /(\d{1,2}(?::(\d{2}?\s*(am|pm)/i;
      const timeMatches = dateText.match(new RegExp(timePattern, 'gi'));

      if (timeMatches && timeMatches.length >= 1) {
        const startTimeMatch = timeMatches[0].match(timePattern);
        if (startTimeMatch) {
          let hours = parseInt(startTimeMatch[1]);
          const minutes = startTimeMatch[2] ? parseInt(startTimeMatch[2]) : 0;
          const isPM = startTimeMatch[3].toLowerCase() === 'pm';

          if (isPM && hours < 12) hours += 12;
          if (!isPM && hours === 12) hours = 0;

          startDate.setHours(hours, minutes);
        }

        if (timeMatches.length >= 2) {
          const endTimeMatch = timeMatches[1].match(timePattern);
          if (endTimeMatch) {
            let hours = parseInt(endTimeMatch[1]);
            const minutes = endTimeMatch[2] ? parseInt(endTimeMatch[2]) : 0;
            const isPM = endTimeMatch[3].toLowerCase() === 'pm';

            if (isPM && hours < 12) hours += 12;
            if (!isPM && hours === 12) hours = 0;

            endDate.setHours(hours, minutes);
          }
        }
      }

      return { startDate, endDate };
    }

    const date = new Date(dateText);
    if (!isNaN(date.getTime())) {
      return { startDate: date, endDate: date };
    }
    if (text.includes('event') || href.includes('event')) score += 5;
    if (text.includes('concert') || href.includes('concert')) score += 5;
    if (text.includes('performance') || href.includes('performance')) score += 4;
    if (text.includes('orpheum') || href.includes('orpheum')) score += 10;
    if (text.includes('schedule') || href.includes('schedule')) score += 3;
    if (text.includes('calendar') || href.includes('calendar')) score += 3;
    if (text.includes('season') || href.includes('season')) score += 2;

    return score;
  }
}

module.exports = OrpheumEvents;

// Function export for compatibility with runner/validator
module.exports = async (city) => {
  const scraper = new OrpheumEvents();
  return await scraper.scrape(city);
};

// Also export the class for backward compatibility
module.exports.OrpheumEvents = OrpheumEvents;