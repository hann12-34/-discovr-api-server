determineCategory(title) {
        const titleLower = title.toLowerCase();

        if (titleLower.includes('nets') || titleLower.includes('basketball') || titleLower.includes('nba')) {
            return 'Basketball';
        } else if (titleLower.includes('islanders') || titleLower.includes('hockey') || titleLower.includes('nhl')) {
            return 'Hockey';
        } else if (titleLower.includes('concert') || titleLower.includes('tour') || titleLower.includes('live') || titleLower.includes('music')) {
            return 'Concert';
        } else if (titleLower.includes('boxing') || titleLower.includes('fight') || titleLower.includes('mma') || titleLower.includes('ufc')) {
            return 'Combat Sports';
        } else if (titleLower.includes('graduation') || titleLower.includes('ceremony') || titleLower.includes('commencement')) {
            return 'Graduation';
        } else if (titleLower.includes('family') || titleLower.includes('disney') || titleLower.includes('kids')) {
            return 'Family Entertainment';
        } else if (titleLower.includes('comedy') || titleLower.includes('comedian') || titleLower.includes('stand-up')) {
            return 'Comedy';
        } else if (titleLower.includes('religious') || titleLower.includes('church') || titleLower.includes('conference')) {
            return 'Conference';
        }

        return 'Event';
    }

    /**
     * Main scrape method that handles the scraping process
     * @returns {Promise<Array>} Array of formatted events
     */
    async scrape(city = 'New York') {
        try {
            const events = await this.fetchEvents();

            // Filter out events with invalid titles (temporarily allow events without proper dates)
            const validEvents = events.filter(event => {
                return event.title &&
                       event.title.length >= 3 &&
                       !event.title.toLowerCase().includes('cancelled') &&
                       !event.title.toLowerCase().includes('planet brooklyn') &&
                       event.title.toLowerCase() !== 'from zero world tour';
                       // Temporarily removed date validation to extract real events
            };

            console.log(`🗽 ${this.venueName}: Returning ${validEvents.length} valid events`);
            return validEvents;

        } catch (error) {
            console.error(`❌ ${this.venueName} scraper failed:`, error.message);
            return [];
        }
    }
}

// Function export for compatibility with runner/validator
module.exports = async (city) => {
  const scraper = new BarclaysCenter();
  return await scraper.scrape(city);
};

// Also export the class for backward compatibility
module.exports.BarclaysCenter = BarclaysCenter;