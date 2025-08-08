determineCategory(title, description = '', genre = '') {
        const combined = `${title} ${description} ${genre}`.toLowerCase();

        if (combined.includes('christmas spectacular') || combined.includes('rockettes')) {
            return 'Christmas Spectacular';
        } else if (combined.includes('concert') || combined.includes('tour') || combined.includes('live music')) {
            return 'Concert';
        } else if (combined.includes('comedy') || combined.includes('comedian') || combined.includes('stand-up')) {
            return 'Comedy';
        } else if (combined.includes('tony') || combined.includes('awards') || combined.includes('ceremony')) {
            return 'Awards Show';
        } else if (combined.includes('dance') || combined.includes('ballet') || combined.includes('performance')) {
            return 'Dance Performance';
        } else if (combined.includes('family') || combined.includes('children') || combined.includes('kids')) {
            return 'Family Entertainment';
        } else if (combined.includes('graduation') || combined.includes('ceremony') || combined.includes('commencement')) {
            return 'Graduation';
        } else if (combined.includes('benefit') || combined.includes('gala') || combined.includes('fundraiser')) {
            return 'Benefit/Gala';
        } else if (combined.includes('gospel') || combined.includes('religious') || combined.includes('spiritual')) {
            return 'Gospel/Religious';
        } else if (combined.includes('television') || combined.includes('tv') || combined.includes('taping') || combined.includes('filming')) {
            return 'Television Production';
        }

        return 'Entertainment';
    }

    /**
     * Main scrape method that handles the scraping process
     * @returns {Promise<Array>} Array of formatted events
     */
    async scrape() {
        try {
            const events = await this.fetchEvents();

            // Filter out events with invalid titles (temporarily allow events without proper dates)
            const validEvents = events.filter(event => {
                return event.title &&
                       event.title.length >= 3 &&
                       !event.title.toLowerCase().includes('concessions') &&
                       !event.title.toLowerCase().includes('rockettes merch') &&
                       !event.title.toLowerCase().includes('tour');
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
  const scraper = new RadioCityMusicHall();
  return await scraper.scrape(city);
};

// Also export the class for backward compatibility
module.exports.RadioCityMusicHall = RadioCityMusicHall;