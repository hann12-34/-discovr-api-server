// BULK DELETE CONSOLE SCRIPT
// Copy and paste this entire script into your browser console
// when viewing the admin dashboard page on Render.com

(function() {
  console.log('🚀 Injecting bulk delete functionality...');
  
  // Global state for selected events
  let selectedEventIds = [];
  
  // Add the select-all checkbox to the table header if not already present
  function addSelectAllCheckbox() {
    const headerRow = document.querySelector('#events-table thead tr');
    if (!headerRow) {
      console.error('❌ Could not find table header row');
      return;
    }
    
    // Check if checkbox already exists
    if (headerRow.querySelector('.select-all-checkbox')) {
      console.log('✅ Select all checkbox already exists');
      return;
    }
    
    // Create and insert checkbox header
    const th = document.createElement('th');
    th.style.width = '40px';
    th.innerHTML = '<input type="checkbox" class="select-all-checkbox">';
    headerRow.insertBefore(th, headerRow.firstChild);
    
    // Add event listener
    const selectAllCheckbox = th.querySelector('.select-all-checkbox');
    selectAllCheckbox.addEventListener('change', e => {
      const isChecked = e.target.checked;
      
      // Update all row checkboxes
      document.querySelectorAll('.row-checkbox').forEach(checkbox => {
        checkbox.checked = isChecked;
        const eventId = checkbox.getAttribute('data-id');
        
        if (isChecked && !selectedEventIds.includes(eventId)) {
          selectedEventIds.push(eventId);
        }
      });
      
      if (!isChecked) {
        selectedEventIds = [];
      }
      
      updateDeleteButton();
      console.log(`${isChecked ? 'Selected' : 'Deselected'} all items`);
    });
    
    console.log('✅ Added select-all checkbox to table header');
  }
  
  // Add checkboxes to all event rows
  function addRowCheckboxes() {
    const rows = document.querySelectorAll('#events-body tr');
    let count = 0;
    
    rows.forEach(row => {
      // Skip placeholder rows
      if (row.cells.length <= 1) return;
      
      // Skip if checkbox already added
      if (row.querySelector('.row-checkbox')) return;
      
      // Get event ID from existing row
      let eventId = row.getAttribute('data-event-id');
      
      // If no data-event-id attribute, try to get from action buttons
      if (!eventId) {
        const actionButtons = row.querySelectorAll('button');
        actionButtons.forEach(button => {
          const onclick = button.getAttribute('onclick');
          if (onclick && onclick.includes('delete') || onclick.includes('edit')) {
            const match = onclick.match(/'([^']+)'/);
            if (match && match[1]) {
              eventId = match[1];
              // Add data-event-id attribute to the row
              row.setAttribute('data-event-id', eventId);
            }
          }
        });
      }
      
      if (!eventId) return;
      
      // Create checkbox cell
      const checkboxCell = document.createElement('td');
      checkboxCell.innerHTML = `<input type="checkbox" class="row-checkbox" data-id="${eventId}">`;
      
      // Add to beginning of row
      row.insertBefore(checkboxCell, row.firstChild);
      
      // Add event listener
      const checkbox = checkboxCell.querySelector('.row-checkbox');
      checkbox.addEventListener('change', e => {
        if (e.target.checked) {
          if (!selectedEventIds.includes(eventId)) {
            selectedEventIds.push(eventId);
          }
        } else {
          selectedEventIds = selectedEventIds.filter(id => id !== eventId);
          document.querySelector('.select-all-checkbox').checked = false;
        }
        
        updateDeleteButton();
      });
      
      count++;
    });
    
    console.log(`✅ Added checkboxes to ${count} event rows`);
  }
  
  // Add or update bulk delete button
  function addBulkDeleteButton() {
    // Check if button already exists
    let deleteButton = document.getElementById('bulk-delete-button');
    
    if (!deleteButton) {
      // Create new button
      deleteButton = document.createElement('button');
      deleteButton.id = 'bulk-delete-button';
      deleteButton.className = 'btn btn-danger me-2';
      deleteButton.disabled = true;
      deleteButton.innerHTML = '<i class="bi bi-trash"></i> Delete Selected';
      
      // Find container to add button to
      const buttonContainer = document.querySelector('.col-md-6.text-end, .header > div:last-child');
      if (buttonContainer) {
        buttonContainer.appendChild(deleteButton);
      } else {
        console.error('❌ Could not find button container');
        return null;
      }
    }
    
    // Add event listener
    deleteButton.addEventListener('click', () => {
      if (selectedEventIds.length === 0) return;
      
      if (confirm(`Are you sure you want to delete ${selectedEventIds.length} events? This action cannot be undone.`)) {
        console.log(`🗑️ Deleting ${selectedEventIds.length} events:`, selectedEventIds);
        
        fetch('/api/v1/events/bulk-delete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ ids: selectedEventIds })
        })
        .then(response => {
          if (!response.ok) {
            throw new Error(`Server responded with status ${response.status}`);
          }
          return response.json();
        })
        .then(data => {
          console.log('✅ Delete successful:', data);
          alert(`Successfully deleted ${data.deleted || selectedEventIds.length} events.`);
          
          // Reset selected IDs
          selectedEventIds = [];
          
          // Refresh the page
          window.location.reload();
        })
        .catch(error => {
          console.error('❌ Error deleting events:', error);
          alert(`Error deleting events: ${error.message}`);
        });
      }
    });
    
    console.log('✅ Added bulk delete button');
    return deleteButton;
  }
  
  // Update bulk delete button state
  function updateDeleteButton() {
    const button = document.getElementById('bulk-delete-button');
    if (!button) return;
    
    button.disabled = selectedEventIds.length === 0;
    button.innerHTML = selectedEventIds.length > 0 ? 
      `<i class="bi bi-trash"></i> Delete Selected (${selectedEventIds.length})` : 
      '<i class="bi bi-trash"></i> Delete Selected';
  }
  
  // Watch for table updates (e.g., when loading events)
  function setupTableObserver() {
    const tableBody = document.getElementById('events-body');
    if (!tableBody) {
      console.error('❌ Could not find table body for observer');
      return;
    }
    
    const observer = new MutationObserver((mutations) => {
      console.log('📊 Table updated, refreshing checkboxes');
      addRowCheckboxes();
    });
    
    observer.observe(tableBody, { childList: true, subtree: true });
    console.log('👀 Table observer set up');
  }
  
  // Initialize everything
  function initialize() {
    addSelectAllCheckbox();
    addRowCheckboxes();
    const button = addBulkDeleteButton();
    setupTableObserver();
    
    if (button) {
      updateDeleteButton();
    }
    
    console.log('✅ Bulk delete functionality initialized with 0 selected items');
  }
  
  // Run initialization
  initialize();
  
  // Create a global reference that can be used to reinitialize if needed
  window.reinitBulkDelete = initialize;
  
  console.log('🎉 Bulk delete script injection complete! If table data loads later, call window.reinitBulkDelete()');
})();
