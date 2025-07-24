  /**
   * Filter events based on strict validation criteria
   * @param {Array} events - Array of events to validate
   * @returns {Object} - Object containing validated events and rejection statistics
   */
  _validateEvents(events) {
    console.log(`Validating ${events.length} events against strict no-fallback criteria...`);
    
    // Track rejection reasons for debugging
    const rejectionStats = {
      missingTitle: 0,
      missingDate: 0,
      placeholderTitle: 0,
      shortTitle: 0,
      navigationContent: 0,
      lowDetailScore: 0,
      insufficientDescription: 0,
      placeholderDescription: 0,
      invalidDateRange: 0,
      excessiveCapitalization: 0,
      unrelevantContent: 0,
      syntheticContent: 0,
      total: 0
    };
    
    const validatedEvents = events.filter(event => {
      // Must have a title
      if (!event.title || event.title.trim() === '') {
        console.log('Rejected event: Missing title');
        rejectionStats.missingTitle++;
        rejectionStats.total++;
        return false;
      }
      
      // Must have date information or be an exhibit
      if (!event.startDate && !event.rawDateText && !event.isExhibit) {
        console.log(`Rejected event: Missing date information for "${event.title}"`);
        rejectionStats.missingDate++;
        rejectionStats.total++;
        return false;
      }
      
      // Check for placeholder or generic titles that might be fallbacks
      const placeholderTitles = [
        'event', 'show', 'exhibit', 'presentation', 'workshop', 'program',
        'session', 'lecture', 'seminar', 'discussion', 'talk', 'tour', 'virtual',
        'activity', 'class', 'meeting', 'demo', 'demonstration', 'experience', 'untitled', 
        'view details', 'read more', 'learn more', 'click here', 'find out more',
        'register', 'book now', 'reserve', 'tickets', 'more info', 'example'
      ];
      
      const lowercaseTitle = event.title.toLowerCase().trim();
      
      if (placeholderTitles.some(placeholder => 
          lowercaseTitle === placeholder || 
          lowercaseTitle.includes(`${placeholder} at`) || 
          lowercaseTitle.startsWith(`${placeholder}:`) ||
          lowercaseTitle === `${placeholder}s` ||
          lowercaseTitle.endsWith(`${placeholder}`) ||
          lowercaseTitle.startsWith('upcoming'))) {
        console.log(`Rejected event: Generic placeholder title "${event.title}"`);
        rejectionStats.placeholderTitle++;
        rejectionStats.total++;
        return false;
      }
      
      // Check for very short titles that might be incomplete
      if (event.title.trim().length < 6) {
        console.log(`Rejected event: Title too short "${event.title}"`);
        rejectionStats.shortTitle++;
        rejectionStats.total++;
        return false;
      }
      
      // Check for navigation or footer text captured incorrectly as events
      const navigationTerms = [
        'privacy policy', 'terms of use', 'copyright', 'contact us', 'about us', 
        'sitemap', 'faq', 'help', 'search', 'menu', 'navigation', 'footer', 'header',
        'login', 'sign in', 'register', 'newsletter', 'subscribe', 'cart', 'account',
        'cookie', 'accessibility', 'social media', 'follow us', 'blog', 'news'
      ];
      
      if (navigationTerms.some(term => lowercaseTitle.includes(term))) {
        console.log(`Rejected event: Navigation/footer content "${event.title}"`);
        rejectionStats.navigationContent++;
        rejectionStats.total++;
        return false;
      }
      
      // Check if the event has sufficient details
      let detailsScore = 0;
      
      // Award points for having different pieces of information
      if (event.url && (event.url.includes('spacecentre.ca') || event.url.includes('space-centre'))) detailsScore += 2;
      if (event.description && event.description.length > 50) detailsScore += 2;
      if (event.description && event.description.length > 100) detailsScore += 1; // Bonus for longer descriptions
      if (event.image && event.image.includes('spacecentre')) detailsScore += 2;  // More points for official images
      else if (event.image) detailsScore += 1;
      if (event.startDate) detailsScore += 2;
      if (event.endDate) detailsScore += 1;
      if (event.categories && event.categories.length > 0) detailsScore += 1;
      if (event.rawDateText && event.rawDateText.length > 5) detailsScore += 1;
      if (event.location && event.location.includes('Space Centre')) detailsScore += 1;
      
      // Events need to have a minimum level of detail - increased threshold
      // Use a dynamic minimum score based on event type and available information
      let minimumScore = event.isExhibit ? 7 : 6; // Higher thresholds for stricter validation
      
      // Adjust minimum score based on certain criteria
      if (event.url && (!event.url.includes('spacecentre.ca') && !event.url.includes('space-centre'))) {
        minimumScore += 1; // Require more validation for non-Space Centre URLs
      }
      
      // Lower score requirement if there's extremely strong space-related content
      const strongSpaceSignal = event.title && (
        event.title.toLowerCase().includes('planetarium') ||
        event.title.toLowerCase().includes('space centre') ||
        event.title.toLowerCase().includes('h.r. macmillan')
      );
      
      if (strongSpaceSignal) {
        minimumScore = Math.max(4, minimumScore - 1);
      }
      
      if (detailsScore < minimumScore) {
        console.log(`Rejected event: Insufficient details (score: ${detailsScore}/${minimumScore}) for "${event.title}"`);
        rejectionStats.lowDetailScore++;
        rejectionStats.total++;
        return false;
      }
      
      // Check if the description contains reasonable content and isn't just a placeholder
      if (event.description) {
        const description = event.description.toLowerCase();
        const placeholderDescriptions = [
          'description', 'no description available', 'tbd', 'to be determined',
          'to be announced', 'coming soon', 'check back later', 'details to follow',
          'information coming soon', 'more info', 'more information', 'placeholder'
        ];
        
        if (placeholderDescriptions.some(placeholder => description.includes(placeholder)) || 
            description.length < 20) {
          console.log(`Rejected event: Invalid description for "${event.title}"`);
          rejectionStats.insufficientDescription++;
          rejectionStats.total++;
          return false;
        }
        
        // Check for obviously synthetic content with expanded detection patterns
        if (description.includes('lorem ipsum') || 
            description.includes('sample text') || 
            description.includes('placeholder') ||
            description.includes('example event') ||
            description.includes('test event') ||
            description.includes('dummy') ||
            description.includes('placeholder description') ||
            description.includes('example description') ||
            description.includes('this is a description') ||
            description.includes('enter description here') ||
            /^\s*description\s*$/i.test(description) ||
            (description.length < 30 && /^[a-z\s]+$/i.test(description.trim())) || // Very simple text
            (description.match(/\[(.*?)\]/g) && !description.includes('[object Object]'))) {
          console.log(`Rejected event: Synthetic content detected in description for "${event.title}": "${description.substring(0, 50)}..."`);
          rejectionStats.placeholderDescription++;
          rejectionStats.total++;
          return false;
        }
        
        // Check for repetitive content that might indicate scraped placeholders
        if (description.split(' ').filter(word => word.length > 4).length < 5) {
          console.log(`Rejected event: Description lacks meaningful content for "${event.title}"`);
          rejectionStats.insufficientDescription++;
          rejectionStats.total++;
          return false;
        }
        
        // Check for suspiciously generic space-related descriptions
        // (Only if description is very short - these might be legitimate in longer context)
        if (description.length < 60 && 
            (/space experience|discover space|explore space|astronomy experience/i.test(description) && 
             description.split(' ').length < 10)) {
          console.log(`Rejected event: Generic space description for "${event.title}": "${description}"`);
          rejectionStats.syntheticContent++;
          rejectionStats.total++;
          return false;
        }
      }
      
      // Check that the date is reasonable (not too far in the past or future)
      if (event.startDate) {
        const now = new Date();
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(now.getMonth() - 6);
        
        const threeYearsFromNow = new Date();
        threeYearsFromNow.setFullYear(now.getFullYear() + 3);
        
        // Reject events too far in the past (unless they're exhibits)
        if (!event.isExhibit && event.startDate < sixMonthsAgo) {
          console.log(`Rejected event: Date too far in the past for "${event.title}": ${event.startDate.toISOString()}`);
          rejectionStats.invalidDateRange++;
          rejectionStats.total++;
          return false;
        }
        
        // Reject events too far in the future
        if (event.startDate > threeYearsFromNow) {
          console.log(`Rejected event: Date too far in the future for "${event.title}": ${event.startDate.toISOString()}`);
          rejectionStats.invalidDateRange++;
          rejectionStats.total++;
          return false;
        }
      }
      
      // Check for excessive capitalization or odd formatting in title
      if (event.title === event.title.toUpperCase() && event.title.length > 10) {
        console.log(`Rejected event: Excessive capitalization in title "${event.title}"`);
        rejectionStats.excessiveCapitalization++;
        rejectionStats.total++;
        return false;
      }
      
      // Ensure event is related to Space Centre by checking title keywords
      // Only apply this check for events, not exhibits (which may have more general titles)
      if (!event.isExhibit && event.title.length > 0) {
        const lowercaseTitle = event.title.toLowerCase();
        const spaceTerms = ['space', 'planet', 'star', 'astro', 'galaxy', 'cosmos', 'cosmic', 
                           'universe', 'solar', 'moon', 'mars', 'jupiter', 'saturn', 'observatory',
                           'telescope', 'planetarium', 'science', 'discovery', 'rocket', 'nasa',
                           'astronomy', 'astronaut', 'orbit', 'nebula', 'meteor', 'comet',
                           'workshop', 'presentation', 'lecture', 'class', 'space centre', 'spacecentre'];
        
        // For events (not exhibits), require at least some relevance to space topics
        // OR a very strong confidence score from other factors (URL, date, etc.)
        const hasSomeRelevance = spaceTerms.some(term => lowercaseTitle.includes(term));
        if (!hasSomeRelevance && detailsScore < 7) {
          console.log(`Rejected event: Not sufficiently related to Space Centre themes: "${event.title}" (score: ${detailsScore})`);
          rejectionStats.unrelevantContent++;
          rejectionStats.total++;
          return false;
        }
      }
      
      return true;
    });
    
    console.log(`Validation complete: ${validatedEvents.length}/${events.length} events passed strict validation`);
    
    // Return both the valid events and the rejection statistics
    return {
      events: validatedEvents,
      stats: rejectionStats
    };
  }
