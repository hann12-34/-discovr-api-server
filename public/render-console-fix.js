// Copy and paste this entire script into the browser console on your Render admin dashboard
(function() {
    console.log('Render console bypass script loaded');
    
    // Define global variables
    window.selectedEventIds = [];
    
    // Make sure the table header has a checkbox column
    function fixTableHeader() {
        const headerRow = document.querySelector('#events-table thead tr');
        if (headerRow) {
            // Check if checkbox header already exists
            if (!headerRow.querySelector('.form-check-input')) {
                // Insert checkbox header if it doesn't exist
                const checkboxHeader = document.createElement('th');
                checkboxHeader.innerHTML = `
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" id="select-all-checkbox">
                    </div>
                `;
                headerRow.insertBefore(checkboxHeader, headerRow.firstChild);
                console.log('Added checkbox header');
            }
        }
    }
    
    // Add checkboxes to all rows
    function addCheckboxesToRows() {
        const rows = document.querySelectorAll('#events-body tr');
        rows.forEach(row => {
            if (!row.querySelector('.form-check-input')) {
                const eventId = row.getAttribute('data-event-id');
                if (eventId) {
                    // Create checkbox cell
                    const checkboxCell = document.createElement('td');
                    checkboxCell.innerHTML = `
                        <div class="form-check">
                            <input class="form-check-input event-checkbox" type="checkbox" value="${eventId}">
                        </div>
                    `;
                    row.insertBefore(checkboxCell, row.firstChild);
                }
            }
        });
    }
    
    // Add bulk delete button if it doesn't exist
    function addBulkDeleteButton() {
        if (!document.getElementById('bulk-delete-button')) {
            const actionButtons = document.querySelector('.row .col-md-6:last-child');
            if (actionButtons) {
                // Create bulk delete button
                const bulkButton = document.createElement('button');
                bulkButton.id = 'bulk-delete-button';
                bulkButton.className = 'btn btn-danger ms-2';
                bulkButton.innerHTML = '<i class="bi bi-trash"></i> Delete Selected';
                bulkButton.disabled = true;
                actionButtons.appendChild(bulkButton);
                console.log('Added bulk delete button');
            }
        }
    }
    
    // Update bulk delete button state
    function updateBulkDeleteButton() {
        const bulkDeleteButton = document.getElementById('bulk-delete-button');
        if (bulkDeleteButton) {
            bulkDeleteButton.disabled = selectedEventIds.length === 0;
        }
    }
    
    // Setup event handlers for checkboxes
    function setupEventHandlers() {
        // Event delegation for checkboxes in the table body
        document.getElementById('events-body').addEventListener('change', function(e) {
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
                    
                    // Uncheck "select all" checkbox
                    const selectAll = document.getElementById('select-all-checkbox');
                    if (selectAll && selectAll.checked) {
                        selectAll.checked = false;
                    }
                }
                
                updateBulkDeleteButton();
            }
        });
        
        // Select all checkbox handler
        const selectAllCheckbox = document.getElementById('select-all-checkbox');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', function(e) {
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
            bulkDeleteButton.addEventListener('click', function() {
                if (selectedEventIds.length > 0) {
                    document.getElementById('delete-count').textContent = selectedEventIds.length;
                    document.getElementById('delete-event-ids').value = JSON.stringify(selectedEventIds);
                    
                    // Show bulk delete content, hide single delete content
                    document.getElementById('single-delete-content').style.display = 'none';
                    document.getElementById('bulk-delete-content').style.display = 'block';
                    
                    // Show the delete confirmation modal
                    const deleteConfirmModal = new bootstrap.Modal(document.getElementById('deleteConfirmModal'));
                    deleteConfirmModal.show();
                }
            });
        }
        
        // Confirm bulk delete button handler
        const confirmBulkDeleteButton = document.getElementById('confirm-delete-button');
        if (confirmBulkDeleteButton) {
            confirmBulkDeleteButton.addEventListener('click', async function() {
                const eventIds = JSON.parse(document.getElementById('delete-event-ids').value || '[]');
                if (!eventIds.length) return;
                
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
                        alert(`Successfully deleted ${result.deletedCount} events`);
                        
                        // Reload events
                        if (typeof fetchSavedEvents === 'function') {
                            fetchSavedEvents();
                        } else {
                            location.reload();
                        }
                    } else {
                        const error = await response.json();
                        console.error('Error deleting events:', error);
                        alert(`Error: ${error.message || 'Failed to delete events'}`);
                    }
                } catch (error) {
                    console.error('Error in bulk delete:', error);
                    alert('Network error occurred');
                }
                
                // Close the modal
                const deleteModal = bootstrap.Modal.getInstance(document.getElementById('deleteConfirmModal'));
                if (deleteModal) deleteModal.hide();
                
                // Reset selected events
                selectedEventIds = [];
                updateBulkDeleteButton();
            });
        }
    }
    
    // Initialize everything
    fixTableHeader();
    addCheckboxesToRows();
    addBulkDeleteButton();
    setupEventHandlers();
    
    // Add mutation observer to handle dynamic content changes
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList' && mutation.target.id === 'events-body') {
                addCheckboxesToRows();
            }
        });
    });
    
    observer.observe(document.getElementById('events-body'), { 
        childList: true,
        subtree: true
    });
    
    console.log('Console bypass script initialization complete');
    alert('Bulk delete functionality has been enabled! You may now use checkboxes to select events and the bulk delete button.');
})();
