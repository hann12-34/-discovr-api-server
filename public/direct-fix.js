// Direct fix to ensure bulk delete functionality works properly
(function() {
    console.log("Direct fix script loaded");
    
    // Fix the displayEvents function to properly include checkboxes
    if (typeof window.displayEvents === 'function') {
        const originalDisplayEvents = window.displayEvents;
        
        window.displayEvents = function(events) {
            console.log("Patched displayEvents function executing");
            const eventsBody = document.getElementById('events-body');
            if (!eventsBody) {
                console.error('Events table body not found');
                return;
            }
            
            eventsBody.innerHTML = '';
            
            if (!events || events.length === 0) {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td colspan="6" class="text-center">No events found</td>
                `;
                eventsBody.appendChild(row);
                return;
            }
            
            // Add checkbox header if missing
            const headerRow = document.querySelector('#events-table thead tr');
            if (headerRow && !document.querySelector('#events-table thead tr th .form-check')) {
                const checkboxHeader = document.createElement('th');
                checkboxHeader.innerHTML = `
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" id="select-all-checkbox">
                    </div>
                `;
                headerRow.insertBefore(checkboxHeader, headerRow.firstChild);
            }
            
            // Add the bulk delete button if missing
            const bulkDeleteButtonContainer = document.getElementById('bulk-actions');
            if (!bulkDeleteButtonContainer) {
                const actionsRow = document.querySelector('.row');
                if (actionsRow) {
                    const bulkActionsDiv = document.createElement('div');
                    bulkActionsDiv.className = 'col-md-6 mb-3';
                    bulkActionsDiv.id = 'bulk-actions';
                    bulkActionsDiv.innerHTML = `
                        <button id="bulk-delete-button" class="btn btn-danger" disabled>
                            <i class="bi bi-trash"></i> Delete Selected
                        </button>
                    `;
                    actionsRow.appendChild(bulkActionsDiv);
                }
            }
            
            // Ensure events have proper IDs and display in table
            events.forEach(event => {
                const row = document.createElement('tr');
                const eventId = event._id || event.id;
                
                // Add event ID to the row for easier event handling
                row.setAttribute('data-event-id', eventId);
                
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
                
                // Create external link if there is a sourceUrl
                const sourceLink = event.sourceUrl || event.source_url ? 
                    `<a href="${event.sourceUrl || event.source_url}" target="_blank" class="btn btn-sm btn-outline-primary">
                        <i class="bi bi-box-arrow-up-right"></i> View
                     </a>` : '';
                
                row.innerHTML = `
                    <td>
                        <div class="form-check">
                            <input class="form-check-input event-checkbox" type="checkbox" value="${eventId}">
                        </div>
                    </td>
                    <td>${event.name || 'Untitled Event'}</td>
                    <td>${event.venue ? (event.venue.name || 'Unknown') : 'Unknown'}</td>
                    <td>${formattedDate}</td>
                    <td>${priceDisplay}</td>
                    <td>
                        ${sourceLink}
                        <button class="btn btn-sm btn-outline-info view-details" data-event-id="${eventId}">
                            <i class="bi bi-info-circle"></i> Details
                        </button>
                        <button class="btn btn-sm btn-outline-warning edit-event-btn" data-event-id="${eventId}">
                            <i class="bi bi-pencil"></i> Edit
                        </button>
                        <button class="btn btn-sm btn-outline-danger delete-event-btn" data-event-id="${eventId}">
                            <i class="bi bi-trash"></i> Delete
                        </button>
                    </td>
                `;
                eventsBody.appendChild(row);
                
                // Add event listeners for the buttons in this row
                const detailsBtn = row.querySelector('.view-details');
                if (detailsBtn) {
                    detailsBtn.addEventListener('click', () => showEventDetails(eventId));
                }
                
                const editBtn = row.querySelector('.edit-event-btn');
                if (editBtn) {
                    editBtn.addEventListener('click', () => editEvent(eventId));
                }
                
                const deleteBtn = row.querySelector('.delete-event-btn');
                if (deleteBtn) {
                    deleteBtn.addEventListener('click', () => deleteEventModal(eventId));
                }
            });
            
            // Reset selectedEventIds
            window.selectedEventIds = [];
            updateBulkDeleteButton();
        };
    }
    
    // Setup necessary global variables if not already defined
    if (typeof window.selectedEventIds === 'undefined') {
        window.selectedEventIds = [];
    }
    
    // Function to update bulk delete button state
    window.updateBulkDeleteButton = function() {
        const bulkDeleteButton = document.getElementById('bulk-delete-button');
        if (bulkDeleteButton) {
            bulkDeleteButton.disabled = selectedEventIds.length === 0;
            console.log(`Bulk delete button ${selectedEventIds.length === 0 ? 'disabled' : 'enabled'} (${selectedEventIds.length} items selected)`);
        } else {
            console.error("Bulk delete button not found");
        }
    };
    
    // Setup event handlers once DOM is fully loaded
    function setupEventHandlers() {
        // Setup checkbox event handlers
        document.getElementById('events-body').addEventListener('change', (e) => {
            if (e.target.classList.contains('event-checkbox')) {
                const eventId = e.target.value;
                
                if (e.target.checked) {
                    // Add to selected events
                    if (!selectedEventIds.includes(eventId)) {
                        selectedEventIds.push(eventId);
                    }
                } else {
                    // Remove from selected events
                    selectedEventIds = selectedEventIds.filter(id => id !== eventId);
                    
                    // Uncheck "select all" if any individual checkbox is unchecked
                    const selectAllCheckbox = document.getElementById('select-all-checkbox');
                    if (selectAllCheckbox) {
                        selectAllCheckbox.checked = false;
                    }
                }
                
                updateBulkDeleteButton();
            }
        });
        
        // Select all checkbox handler
        const selectAllCheckbox = document.getElementById('select-all-checkbox');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', (e) => {
                const checkboxes = document.querySelectorAll('.event-checkbox');
                checkboxes.forEach(checkbox => {
                    checkbox.checked = e.target.checked;
                    
                    const eventId = checkbox.value;
                    if (e.target.checked) {
                        // Add to selected events if not already included
                        if (!selectedEventIds.includes(eventId)) {
                            selectedEventIds.push(eventId);
                        }
                    }
                });
                
                if (!e.target.checked) {
                    // Clear selected events if unchecked
                    selectedEventIds = [];
                }
                
                updateBulkDeleteButton();
            });
        }
        
        // Bulk delete button handler
        const bulkDeleteButton = document.getElementById('bulk-delete-button');
        if (bulkDeleteButton) {
            bulkDeleteButton.addEventListener('click', () => {
                if (selectedEventIds.length > 0) {
                    document.getElementById('delete-count').textContent = selectedEventIds.length;
                    document.getElementById('delete-event-ids').value = JSON.stringify(selectedEventIds);
                    
                    // Show bulk delete content, hide single delete content
                    document.getElementById('single-delete-content').style.display = 'none';
                    document.getElementById('bulk-delete-content').style.display = 'block';
                    
                    // Show the delete confirmation modal
                    const deleteModal = new bootstrap.Modal(document.getElementById('deleteConfirmModal'));
                    deleteModal.show();
                }
            });
        }
        
        // Handle the bulk delete confirmation
        const confirmBulkDeleteButton = document.getElementById('confirm-bulk-delete');
        if (confirmBulkDeleteButton) {
            confirmBulkDeleteButton.addEventListener('click', async () => {
                const eventIds = JSON.parse(document.getElementById('delete-event-ids').value);
                
                try {
                    const response = await fetch('/api/v1/events/bulk-delete', {
                        method: 'DELETE',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ eventIds })
                    });
                    
                    if (response.ok) {
                        const result = await response.json();
                        console.log(`Deleted ${result.deletedCount} events`);
                        showAlert(`Successfully deleted ${result.deletedCount} events`, 'success');
                        
                        // Reload events
                        fetchSavedEvents();
                    } else {
                        const error = await response.json();
                        console.error('Error deleting events:', error);
                        showAlert(`Error: ${error.message || 'Failed to delete events'}`, 'danger');
                    }
                } catch (error) {
                    console.error('Error in bulk delete:', error);
                    showAlert('Network error occurred', 'danger');
                }
                
                // Close the modal and reset selected events
                const deleteModal = bootstrap.Modal.getInstance(document.getElementById('deleteConfirmModal'));
                if (deleteModal) deleteModal.hide();
                
                selectedEventIds = [];
                updateBulkDeleteButton();
            });
        }
    }
    
    // Execute after loading events or immediately if events are already loaded
    if (document.getElementById('events-body').children.length > 1) {
        console.log("Events already loaded, setting up handlers");
        setupEventHandlers();
    } else {
        console.log("Events not yet loaded, will patch after load");
        // If using original fetchSavedEvents, hook into it
        if (typeof window.fetchSavedEvents === 'function') {
            const originalFetchSavedEvents = window.fetchSavedEvents;
            window.fetchSavedEvents = async function() {
                await originalFetchSavedEvents();
                setupEventHandlers();
            };
        }
    }
    
    // Just in case, add a mutation observer to detect when events are loaded
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList' && mutation.target.id === 'events-body' && mutation.addedNodes.length > 0) {
                console.log("Mutation observer detected events loaded");
                setupEventHandlers();
            }
        });
    });
    
    observer.observe(document.getElementById('events-body'), { childList: true });
    
    // Apply initial UI setup
    setupEventHandlers();
    
    console.log("Direct fix script completed initialization");
})();
