extractDate(text) {
    const datePatterns = [
      /(\w+day),?\s+(\w+)\s+(\d{1,2}/i,
      /(\w+)\s+(\d{1,2},?\s+(\d{4}/i,
      /(\d{1,2}\/(\d{1,2}\/(\d{4}/,
      /(\d{1,2}-(\d{1,2}-(\d{4}/
    ];

    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        try {
          const date = new Date(match[0]);
          if (!isNaN(date.getTime()) && date > new Date()) {
            return date;
          }
        } catch (e) {
          continue;
        }
      }
    }
    return null;
  },

  /**
   * Extract time from text
   */
  extractTime(text) {
    const timePattern = /(\d{1,2}:?(\d{2}?\s*(am|pm|AM|PM)/i;
    const match = text.match(timePattern);
    return match ? match[0] : null;
  },

  /**
   * Extract price from text
   */
  extractPrice(text) {
    const pricePatterns = [
      /\$(\d+(?:\.\d{2}?)/,
      /(\d+(?:\.\d{2}?)\s*dollars?/i,
      /free/i,
      /cover/i
    ];

    for (const pattern of pricePatterns) {
      const match = text.match(pattern);
      if (match) {
        if (pattern.source.includes('free')) {
          return 'Free';
        }
        if (pattern.source.includes('cover')) {
          return 'Cover charge applies';
        }
        return `$${match[1] || match[0]}`;
      }
    }
    return null;
  },

  /**
   * Get next event date based on event title
   */
  getNextEventDate(title) {
    const titleLower = title.toLowerCase();

    if (titleLower.includes('amateur') && titleLower.includes('night')) {
      return this.getLastThursdayOfMonth();
    }

    if (titleLower.includes('weekend') || titleLower.includes('saturday')) {
      return this.getNextWeekday('saturday');
    }

    if (titleLower.includes('friday')) {
      return this.getNextWeekday('friday');
    }

    // Default to next weekend
    return this.getNextWeekday('friday');
  },

  /**
   * Get recurring event date based on schedule
   */
  getRecurringEventDate(schedule) {
    switch (schedule) {
      case 'last-thursday':
        return this.getLastThursdayOfMonth();
      case 'weekly':
        return this.getNextWeekday('friday');
      case 'weekend':
        return this.getNextWeekday('saturday');
      case 'nightly':
        return this.getNextWeekday('friday');
      default:
        return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }
  },

  /**
   * Get last Thursday of current month
   */
  getLastThursdayOfMonth() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    // Get last day of month
    const lastDay = new Date(year, month + 1, 0);

    // Find last Thursday
    while (lastDay.getDay() !== 4) { // 4 = Thursday
      lastDay.setDate(lastDay.getDate() - 1);
    }

    // If it's already passed, get next month's last Thursday
    if (lastDay < now) {
      const nextMonth = new Date(year, month + 2, 0);
      while (nextMonth.getDay() !== 4) {
        nextMonth.setDate(nextMonth.getDate() - 1);
      }
      return nextMonth;
    }

    return lastDay;
  },

  /**
   * Get next occurrence of a weekday
   */
  getNextWeekday(dayName) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const targetDay = days.indexOf(dayName.toLowerCase());

    if (targetDay === -1) return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const today = new Date();
    const currentDay = today.getDay();
    let daysUntilTarget = targetDay - currentDay;

    if (daysUntilTarget <= 0) {
      daysUntilTarget += 7;
    }

    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + daysUntilTarget);
    return targetDate;
  }
};

module.exports = async (city) => {
    return await PenthouseNightclubEvents(city);
};