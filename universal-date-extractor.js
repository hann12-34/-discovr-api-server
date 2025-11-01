/**
 * Universal date extraction code snippet
 * Works for most event websites with common HTML patterns
 */

const universalDateExtraction = `
// Extract date from event element
let dateText = null;

// Try multiple selectors in order of specificity
const dateSelectors = [
  'time[datetime]',           // HTML5 time element
  '.date',                     // Class "date"
  '.event-date',              // Class "event-date"  
  '[class*="date"]',          // Any class containing "date"
  'time',                      // Generic time element
  '.datetime',                 // Class "datetime"
  '.when',                     // Class "when"
  '[itemprop="startDate"]',   // Schema.org markup
  '[data-date]',              // Data attribute
  '.day',                      // Sometimes date is in "day" class
  'span.month',               // Month + day combo
  '.event-info time',         // Time within event-info
  '.event-details .date',     // Date within details
];

// First try to find date in the event element itself
for (const selector of dateSelectors) {
  const dateEl = $element.find(selector).first();
  if (dateEl.length > 0) {
    dateText = dateEl.attr('datetime') || dateEl.text().trim();
    if (dateText && dateText.length > 0) break;
  }
}

// If not found, look in parent container
if (!dateText) {
  const $parent = $element.closest('.event, .event-item, .show, article, [class*="event"]');
  if ($parent.length > 0) {
    for (const selector of dateSelectors) {
      const dateEl = $parent.find(selector).first();
      if (dateEl.length > 0) {
        dateText = dateEl.attr('datetime') || dateEl.text().trim();
        if (dateText && dateText.length > 0) break;
      }
    }
  }
}

// Clean up the date text
if (dateText) {
  dateText = dateText.replace(/\\s+/g, ' ').trim();
  // Remove common prefixes
  dateText = dateText.replace(/^(Date:|When:|Time:)\\s*/i, '');
}
`;

module.exports = universalDateExtraction;
