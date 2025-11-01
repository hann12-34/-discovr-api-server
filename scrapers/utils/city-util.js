const getCityFromArgs = () => {
  const cityArg = process.argv.find(arg => arg && arg.startsWith('--city='));
  if (!cityArg) {
    throw new Error('CRITICAL: --city argument is required. No fallbacks allowed.');
  }
  return cityArg.split('=')[1];
};

const generateEventId = (title, venueName, startDate) => {
  const titleSlug = title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  const venueSlug = venueName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  const dateSlug = startDate instanceof Date ? startDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
  return `${titleSlug}-${venueSlug}-${dateSlug}`;
};

const extractCategories = (categoryText) => {
  if (!categoryText) return ['General'];
  return categoryText.split(',').map(cat => cat.trim()).filter(cat => cat.length > 0);
};

const extractPrice = (priceText) => {
  if (!priceText) return 'Free';
  if (priceText.toLowerCase().includes('free')) return 'Free';
  const match = priceText.match(/\$\d+/);
  return match ? match[0] : 'Varies';
};

const parseDateText = (dateText) => {
  if (!dateText || typeof dateText !== 'string' || dateText.trim() === '') {
    return null;
  }
  
  const cleanText = dateText.trim();
  
  // Try ISO format first: 2025-10-26 or 2025-10-26T14:00:00
  const isoMatch = cleanText.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const startDate = new Date(isoMatch[0]);
    if (!isNaN(startDate.getTime())) {
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
      return { startDate, endDate };
    }
  }
  
  // Try US format: 10/26/2025 or 10-26-2025
  const usMatch = cleanText.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
  if (usMatch) {
    const startDate = new Date(parseInt(usMatch[3]), parseInt(usMatch[1]) - 1, parseInt(usMatch[2]));
    if (!isNaN(startDate.getTime())) {
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
      return { startDate, endDate };
    }
  }
  
  const lowerText = cleanText.toLowerCase();
  
  // Month mapping with abbreviations
  const monthMap = {
    'jan': 0, 'january': 0, 'feb': 1, 'february': 1, 'mar': 2, 'march': 2,
    'apr': 3, 'april': 3, 'may': 4, 'jun': 5, 'june': 5, 'jul': 6, 'july': 6,
    'aug': 7, 'august': 7, 'sep': 8, 'sept': 8, 'september': 8, 
    'oct': 9, 'october': 9, 'nov': 10, 'november': 10, 'dec': 11, 'december': 11
  };
  
  // Try "Oct 26, 2025" or "October 26, 2025"
  for (const [name, monthNum] of Object.entries(monthMap)) {
    const regex = new RegExp(`${name}\\w*\\s+(\\d{1,2}),?\\s+(\\d{4})`, 'i');
    const match = cleanText.match(regex);
    if (match) {
      const startDate = new Date(parseInt(match[2]), monthNum, parseInt(match[1]));
      if (!isNaN(startDate.getTime())) {
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 1);
        return { startDate, endDate };
      }
    }
  }
  
  // Try "26 Oct 2025" or "26 October 2025"
  for (const [name, monthNum] of Object.entries(monthMap)) {
    const regex = new RegExp(`(\\d{1,2})\\s+${name}\\w*\\s+(\\d{4})`, 'i');
    const match = cleanText.match(regex);
    if (match) {
      const startDate = new Date(parseInt(match[2]), monthNum, parseInt(match[1]));
      if (!isNaN(startDate.getTime())) {
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 1);
        return { startDate, endDate };
      }
    }
  }
  
  // Try without year - assume current/next year
  const currentYear = new Date().getFullYear();
  for (const [name, monthNum] of Object.entries(monthMap)) {
    const regex = new RegExp(`${name}\\w*\\s+(\\d{1,2})`, 'i');
    const match = cleanText.match(regex);
    if (match) {
      let startDate = new Date(currentYear, monthNum, parseInt(match[1]));
      // If date is in the past, try next year
      if (startDate < new Date()) {
        startDate = new Date(currentYear + 1, monthNum, parseInt(match[1]));
      }
      if (!isNaN(startDate.getTime())) {
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 1);
        return { startDate, endDate };
      }
    }
  }
  
  return null;
};

const parseEventDate = (dateText) => {
  // Use parseDateText and return just the startDate
  const result = parseDateText(dateText);
  return result ? result.startDate : null;
};

const getBrowserHeaders = () => {
  return {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Cache-Control': 'max-age=0'
  };
};

module.exports = { 
  getCityFromArgs, 
  generateEventId, 
  extractCategories, 
  extractPrice, 
  parseDateText,
  parseEventDate,
  getBrowserHeaders
};
