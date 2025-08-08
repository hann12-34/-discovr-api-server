determineCategory(title, description = '', genre = '') {
        const combined = `${title} ${description} ${genre}`.toLowerCase();

        if (combined.includes('indie rock') || combined.includes('indie') || combined.includes('alternative rock')) {
            return 'Indie Rock';
        } else if (combined.includes('singer-songwriter') || combined.includes('acoustic') || combined.includes('folk')) {
            return 'Singer-Songwriter';
        } else if (combined.includes('alternative') || combined.includes('alt rock') || combined.includes('modern rock')) {
            return 'Alternative Rock';
        } else if (combined.includes('punk') || combined.includes('post-punk') || combined.includes('garage punk')) {
            return 'Punk';
        } else if (combined.includes('electronic') || combined.includes('synth') || combined.includes('electronica')) {
            return 'Electronic';
        } else if (combined.includes('experimental') || combined.includes('avant-garde') || combined.includes('noise')) {
            return 'Experimental';
        } else if (combined.includes('pop') || combined.includes('pop rock') || combined.includes('synth pop')) {
            return 'Pop';
        } else if (combined.includes('rock') || combined.includes('garage rock') || combined.includes('classic rock')) {
            return 'Rock';
        } else if (combined.includes('hip hop') || combined.includes('rap') || combined.includes('hip-hop')) {
            return 'Hip Hop';
        } else if (combined.includes('jazz') || combined.includes('blues') || combined.includes('soul')) {
            return 'Jazz/Blues';
        } else if (combined.includes('world music') || combined.includes('latin') || combined.includes('reggae')) {
            return 'World Music';
        } else if (combined.includes('metal') || combined.includes('metalcore') || combined.includes('hardcore')) {
            return 'Metal';
        } else if (combined.includes('tribute') || combined.includes('cover') || combined.includes('covers')) {
            return 'Tribute Act';
        } else if (combined.includes('dj') || combined.includes('dance party') || combined.includes('club night')) {
            return 'DJ/Dance Party';
        }

        return 'Live Music';
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
                       !event.title.toLowerCase().includes('newsletter') &&
                       !event.title.toLowerCase().includes('sign-up') &&
                       event.title.toLowerCase() !== "today's shows";
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
  const scraper = new BoweryBallroom();
  return await scraper.scrape(city);
};

// Also export the class for backward compatibility
module.exports.BoweryBallroom = BoweryBallroom;