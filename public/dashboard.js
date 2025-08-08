// Global state
let currentEvents = [];
let currentEvent = null;

// Debug function
function logDebug(message, isError = false) {
    const debugOutput = document.getElementById('debug-output');
    if (!debugOutput) return;

    const logEntry = document.createElement('div');
    logEntry.classList.add('log-entry');
    if (isError) logEntry.classList.add('log-error');
    
    const timestamp = new Date().toLocaleTimeString();
    logEntry.textContent = `[${timestamp}] ${message}`;
    
    debugOutput.prepend(logEntry);
    
    if (isError) {
        console.error(message);
    } else {
        console.log(message);
    }
}

// Find event by ID helper
function findEventById(id) {
    return currentEvents.find(event => event._id === id || event.id === id);
}

// Filter events based on search text
function filterEvents() {
    const searchFilter = document.getElementById('search-filter');
    const filter = searchFilter ? searchFilter.value.toLowerCase() : '';
    
    if (!currentEvents || currentEvents.length === 0) {
        logDebug('No events to filter');
        return;
    }
    
    const filtered = filter 
        ? currentEvents.filter(event => 
            (event.title && event.title.toLowerCase().includes(filter)) ||
            (event.name && event.name.toLowerCase().includes(filter)) ||
            (event.venue && event.venue.name && event.venue.name.toLowerCase().includes(filter))
        )
        : currentEvents;
    
    displayEvents(filtered);
    
    const eventsLoaded = document.getElementById('events-loaded');
    if (eventsLoaded) {
        if (filter) {
            eventsLoaded.textContent = `Showing ${filtered.length} of ${currentEvents.length} events`;
        } else {
            eventsLoaded.textContent = `${currentEvents.length} events loaded`;
        }
    }
}

// Display events in the table
function displayEvents(events) {
    const eventsBody = document.getElementById('events-body');
    if (!eventsBody) {
        console.error('Events table body not found');
        return;
    }
    
    eventsBody.innerHTML = '';
    
    if (!events || events.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="5" class="text-center">No events found</td>
        `;
        eventsBody.appendChild(row);
        return;
    }
    
    events.forEach(event => {
        const row = document.createElement('tr');
        
        // Format the date
        let formattedDate = 'TBD';
        if (event.startDate) {
            const date = new Date(event.startDate);
            if (!isNaN(date.getTime())) {
                formattedDate = date.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });
            }
        }
        
        // Format the price
        let priceDisplay = event.price || 'Free';
        
        // Create external link if there is a valid sourceUrl
        // Handle edge cases: "undefined" strings, empty strings, null values
        function isValidUrl(url) {
            return url && 
                   typeof url === 'string' && 
                   url.trim() !== '' && 
                   url !== 'undefined' && 
                   url !== 'null' && 
                   url.startsWith('http');
        }
        
        const validSourceUrl = isValidUrl(event.sourceUrl) ? event.sourceUrl : 
                              isValidUrl(event.source_url) ? event.source_url : 
                              isValidUrl(event.url) ? event.url : null;
        
        const sourceLink = validSourceUrl ? 
            `<a href="${validSourceUrl}" target="_blank" class="btn btn-sm btn-outline-primary">
                <i class="bi bi-box-arrow-up-right"></i> View
             </a>` : '';
        
        row.innerHTML = `
            <td>${event.title || event.name || 'Untitled Event'}</td>
            <td>${event.venue ? (event.venue.name || 'Unknown') : 'Unknown'}</td>
            <td>${formattedDate}</td>
            <td>${priceDisplay}</td>
            <td>
                ${sourceLink}
                <button class="btn btn-sm btn-outline-info view-details" data-event-id="${event._id || event.id}">
                    <i class="bi bi-info-circle"></i> Details
                </button>
                <button class="btn btn-sm btn-outline-warning edit-event" data-event-id="${event._id || event.id}">
                    <i class="bi bi-pencil"></i> Edit
                </button>
                <button class="btn btn-sm btn-outline-danger delete-event" data-event-id="${event._id || event.id}">
                    <i class="bi bi-trash"></i> Delete
                </button>
            </td>
        `;
        eventsBody.appendChild(row);
    });
}

// Fetch events from API
async function fetchSavedEvents() {
    const loadingOverlay = document.querySelector('.loading-overlay');
    const loadingText = document.getElementById('loading-text');
    
    if (loadingOverlay) loadingOverlay.style.display = 'flex';
    if (loadingText) loadingText.textContent = 'Loading saved events...';
    
    try {
        logDebug('Fetching saved events from database');
        const apiBaseUrl = '/api/v1';
        const eventsEndpoint = `${apiBaseUrl}/venues/events/all`;
        
        console.log('Requesting events from:', eventsEndpoint);
        
        const response = await fetch(eventsEndpoint);
        console.log('Response status:', response.status, response.statusText);
        
        if (!response.ok) {
            throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
        
        // Log raw response for debugging
        const responseText = await response.text();
        console.log('Raw response length:', responseText.length, 'characters');
        logDebug(`Raw API response preview: ${responseText.substring(0, 150)}...`);
        
        try {
            // Parse the JSON response
            const data = JSON.parse(responseText);
            console.log('Parsed data type:', typeof data);
            
            if (!data) {
                throw new Error('API returned empty response');
            }
            
            console.log('Data structure:', Array.isArray(data) ? 'Array' : 'Object with keys: ' + Object.keys(data).join(', '));
            
            // Handle both direct array and wrapped object formats for robustness
            const allEvents = Array.isArray(data) ? data : data.events || [];
            console.log('Events found:', allEvents.length);
            
            if (allEvents.length > 0) {
                console.log('Sample event keys:', Object.keys(allEvents[0]).join(', '));
            }
            
            logDebug(`Found ${allEvents.length} events in API response`);
            
            // Store the current events for reference
            currentEvents = allEvents;
            
            // Sort events by date
            allEvents.sort((a, b) => {
                const dateA = a.startDate ? new Date(a.startDate) : new Date(9999, 11, 31);
                const dateB = b.startDate ? new Date(b.startDate) : new Date(9999, 11, 31);
                return dateA - dateB;
            });
            
            const eventsLoaded = document.getElementById('events-loaded');
            if (eventsLoaded) {
                eventsLoaded.textContent = `${allEvents.length} events loaded`;
            }
            
            displayEvents(allEvents);
        } catch (parseError) {
            console.error('Failed to parse JSON response:', parseError);
            logDebug(`JSON parse error: ${parseError.message}`, true);
        }
    } catch (error) {
        console.error('Error fetching saved events:', error);
        logDebug(`Error fetching saved events: ${error.message}`, true);
    } finally {
        if (loadingOverlay) loadingOverlay.style.display = 'none';
    }
}

// Run a scraper
async function runScraper(scraperType) {
    const loadingOverlay = document.querySelector('.loading-overlay');
    const loadingText = document.getElementById('loading-text');
    
    if (!scraperType) {
        logDebug('No scraper type specified', true);
        return;
    }
    
    if (loadingOverlay) loadingOverlay.style.display = 'flex';
    if (loadingText) loadingText.textContent = `Running ${scraperType} scraper...`;
    
    try {
        logDebug(`Starting ${scraperType} scraper...`);
        const apiBaseUrl = '/api/v1';
        const scrapersEndpoint = `${apiBaseUrl}/scrapers`;
        
        const response = await fetch(`${scrapersEndpoint}/${scraperType}`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        logDebug(`Scrapers completed. Found ${data.eventsCount} events.`);
        
        // Now fetch the saved events to display them
        await fetchSavedEvents();
    } catch (error) {
        logDebug(`Error running scrapers: ${error.message}`, true);
        if (loadingOverlay) loadingOverlay.style.display = 'none';
    }
}

// Initialize the dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded and parsed');
    logDebug('Dashboard ready! Click "Load Saved Events" or "Run Scrapers" to load data.');
    
    // Initialize Bootstrap modals
    console.log('Attempting to initialize Bootstrap modals...');
    if (typeof bootstrap === 'undefined') {
        console.error('CRITICAL: Bootstrap library is not loaded!');
        logDebug('Bootstrap library not found! Modals will not work.', true);
        return;
    }
    
    console.log('Bootstrap object found:', bootstrap);
    
    const eventFormModal = new bootstrap.Modal(document.getElementById('eventFormModal'));
    const eventDetailsModal = new bootstrap.Modal(document.getElementById('eventDetailsModal'));
    const deleteConfirmModal = new bootstrap.Modal(document.getElementById('deleteConfirmModal'));
    
    // Set up event listeners
    const searchFilter = document.getElementById('search-filter');
    const clearFilter = document.getElementById('clear-filter');
    const loadSavedButton = document.getElementById('load-saved-events-button');
    
    if (searchFilter) {
        searchFilter.addEventListener('input', filterEvents);
        console.log('Search filter event listener added');
    } else {
        console.error('Search filter element not found!');
    }
    
    if (clearFilter) {
        clearFilter.addEventListener('click', () => {
            if (searchFilter) searchFilter.value = '';
            filterEvents();
        });
        console.log('Clear filter event listener added');
    }
    
    // Set up scraper dropdown listeners
    document.querySelectorAll('.run-scraper').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const scraperType = e.target.getAttribute('data-scraper');
            runScraper(scraperType);
        });
    });
    
    if (loadSavedButton) {
        loadSavedButton.addEventListener('click', fetchSavedEvents);
        console.log('Load saved events button listener added');
    } else {
        console.error('Load saved events button not found!');
    }
    
    // Event management listeners
    const createEventButton = document.getElementById('create-event-button');
    if (createEventButton) {
        createEventButton.addEventListener('click', () => {
            resetEventForm();
            eventFormModal.show();
        });
    }
    
    const saveEventButton = document.getElementById('save-event-button');
    if (saveEventButton) {
        saveEventButton.addEventListener('click', () => {
            const eventId = document.getElementById('event-id').value;
            if (eventId) {
                updateEvent(eventId);
            } else {
                createEvent();
            }
        });
    }
    
    const confirmDeleteButton = document.getElementById('confirm-delete-button');
    if (confirmDeleteButton) {
        confirmDeleteButton.addEventListener('click', () => {
            const eventId = document.getElementById('delete-event-id').value;
            if (eventId) {
                deleteEvent(eventId);
            }
        });
    }
    
    // Add event listeners for detail, edit, and delete buttons (these are added dynamically)
    document.addEventListener('click', (e) => {
        // View details button
        if (e.target.closest('.view-details')) {
            const button = e.target.closest('.view-details');
            const eventId = button.getAttribute('data-event-id');
            
            // Find the event in the current dataset
            const event = findEventById(eventId);
            if (event) {
                showEventDetails(event);
            }
        }
        
        // Edit button
        if (e.target.closest('.edit-event')) {
            const button = e.target.closest('.edit-event');
            const eventId = button.getAttribute('data-event-id');
            
            // Find the event in the current dataset
            const event = findEventById(eventId);
            if (event) {
                fillEventForm(event);
                eventFormModal.show();
            }
        }
        
        // Delete button
        if (e.target.closest('.delete-event')) {
            const button = e.target.closest('.delete-event');
            const eventId = button.getAttribute('data-event-id');
            
            // Find the event in the current dataset
            const event = findEventById(eventId);
            if (event) {
                document.getElementById('delete-event-name').textContent = event.name;
                document.getElementById('delete-event-id').value = eventId;
                deleteConfirmModal.show();
            }
        }
    });
    
    // Event form functions
    function resetEventForm() {
        const eventForm = document.getElementById('event-form');
        if (eventForm) eventForm.reset();
        
        const eventIdField = document.getElementById('event-id');
        if (eventIdField) eventIdField.value = '';
        
        const eventFormModalLabel = document.getElementById('eventFormModalLabel');
        if (eventFormModalLabel) eventFormModalLabel.textContent = 'Create New Event';
        
        currentEvent = null;
    }
    
    function fillEventForm(event) {
        currentEvent = event;
        
        const fields = {
            'event-id': event._id || event.id,
            'event-name': event.name || '',
            'event-venue-name': event.venue?.name || '',
            'event-price': event.price || '',
            'event-description': event.description || '',
            'event-source-url': event.sourceUrl || event.source_url || '',
            'event-image-url': event.imageUrl || event.image_url || ''
        };
        
        // Set values for all fields
        Object.entries(fields).forEach(([id, value]) => {
            const field = document.getElementById(id);
            if (field) field.value = value;
        });
        
        // Format date for input
        if (event.startDate) {
            const date = new Date(event.startDate);
            if (!isNaN(date.getTime())) {
                const formattedDate = date.toISOString().split('T')[0];
                const dateField = document.getElementById('event-start-date');
                if (dateField) dateField.value = formattedDate;
            }
        }
        
        const formLabel = document.getElementById('eventFormModalLabel');
        if (formLabel) formLabel.textContent = 'Edit Event';
    }
    
    function showEventDetails(event) {
        const detailsContent = document.getElementById('event-details-content');
        if (!detailsContent) return;
        
        // Format the date
        let formattedDate = 'TBD';
        if (event.startDate) {
            const date = new Date(event.startDate);
            if (!isNaN(date.getTime())) {
                formattedDate = date.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit'
                });
            }
        }
        
        // Create HTML content for modal
        let html = `
            <div class="card mb-3">
                <div class="card-header">
                    <h5>${event.name || 'Untitled Event'}</h5>
                </div>
                <div class="card-body">
                    <p><strong>Venue:</strong> ${event.venue?.name || 'Unknown'}</p>
                    <p><strong>Date:</strong> ${formattedDate}</p>
                    <p><strong>Price:</strong> ${event.price || 'Free'}</p>
                    ${event.description ? `<p><strong>Description:</strong> ${event.description}</p>` : ''}
                </div>
                <div class="card-footer">
                    ${event.sourceUrl || event.source_url ? `<a href="${event.sourceUrl || event.source_url}" target="_blank" class="btn btn-primary">Visit Event Page</a>` : ''}
                    ${event.imageUrl || event.image_url ? `<a href="${event.imageUrl || event.image_url}" target="_blank" class="btn btn-secondary">View Image</a>` : ''}
                </div>
            </div>
        `;
        
        detailsContent.innerHTML = html;
        eventDetailsModal.show();
    }
    
    // CRUD operations for events
    async function createEvent() {
        logDebug('Creating new event...');
        
        const eventData = {
            name: document.getElementById('event-name').value,
            venue: {
                name: document.getElementById('event-venue-name').value
            },
            startDate: document.getElementById('event-start-date').value,
            price: document.getElementById('event-price').value,
            description: document.getElementById('event-description').value,
            sourceUrl: document.getElementById('event-source-url').value,
            imageUrl: document.getElementById('event-image-url').value
        };
        
        try {
            const apiBaseUrl = '/api/v1';
            const response = await fetch(`${apiBaseUrl}/events`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(eventData)
            });
            
            if (!response.ok) {
                throw new Error(`Server error: ${response.status} ${response.statusText}`);
            }
            
            const result = await response.json();
            logDebug(`Event created with ID: ${result._id || result.id}`);
            
            eventFormModal.hide();
            fetchSavedEvents();
        } catch (error) {
            logDebug(`Error creating event: ${error.message}`, true);
        }
    }
    
    async function updateEvent(id) {
        logDebug(`Updating event with ID: ${id}...`);
        
        const eventData = {
            name: document.getElementById('event-name').value,
            venue: {
                name: document.getElementById('event-venue-name').value
            },
            startDate: document.getElementById('event-start-date').value,
            price: document.getElementById('event-price').value,
            description: document.getElementById('event-description').value,
            sourceUrl: document.getElementById('event-source-url').value,
            imageUrl: document.getElementById('event-image-url').value
        };
        
        try {
            const apiBaseUrl = '/api/v1';
            const response = await fetch(`${apiBaseUrl}/events/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(eventData)
            });
            
            if (!response.ok) {
                throw new Error(`Server error: ${response.status} ${response.statusText}`);
            }
            
            const result = await response.json();
            logDebug(`Event updated: ${result._id || result.id}`);
            
            eventFormModal.hide();
            fetchSavedEvents();
        } catch (error) {
            logDebug(`Error updating event: ${error.message}`, true);
        }
    }
    
    async function deleteEvent(id) {
        logDebug(`Deleting event with ID: ${id}...`);
        
        try {
            const apiBaseUrl = '/api/v1';
            const response = await fetch(`${apiBaseUrl}/events/${id}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error(`Server error: ${response.status} ${response.statusText}`);
            }
            
            logDebug(`Event deleted: ${id}`);
            
            deleteConfirmModal.hide();
            fetchSavedEvents();
        } catch (error) {
            logDebug(`Error deleting event: ${error.message}`, true);
        }
    }
    
    // Optional: Auto-load events on page load
    // fetchSavedEvents();
});
