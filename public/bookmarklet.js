// Discovr Bulk Delete Bookmarklet
// Create this as a bookmark with the following URL
// (copy everything after "javascript:" below)

javascript:(function(){
  // Create script element
  const script = document.createElement('script');
  script.src = 'https://discovr-proxy-server.onrender.com/admin/bulk-delete.js';
  script.onload = function() {
    console.log('Bulk delete functionality loaded!');
  };
  script.onerror = function() {
    // If loading fails, try to inject directly
    console.log('Could not load bulk-delete.js, injecting inline version');
    const inlineScript = document.createElement('script');
    inlineScript.textContent = `
      // Inline bulk delete functionality
      document.addEventListener('DOMContentLoaded', () => {
        let selectedEventIds = [];
        
        // Add the bulk delete button
        const headerButtonContainer = document.querySelector('.col-md-6.text-end');
        if (headerButtonContainer) {
          const bulkDeleteButton = document.createElement('button');
          bulkDeleteButton.id = 'bulk-delete-button';
          bulkDeleteButton.className = 'btn btn-danger ms-2';
          bulkDeleteButton.disabled = true;
          bulkDeleteButton.innerHTML = '<i class="bi bi-trash"></i> Delete Selected';
          headerButtonContainer.appendChild(bulkDeleteButton);
          
          // Add event listener
          bulkDeleteButton.addEventListener('click', () => {
            if (selectedEventIds.length > 0 && confirm(\`Delete \${selectedEventIds.length} events? This cannot be undone.\`)) {
              fetch('/api/v1/events/bulk-delete', {
                method: 'POST', 
                headers: {'Content-Type': 'application/json'}, 
                body: JSON.stringify({ids: selectedEventIds})
              })
              .then(r => r.json())
              .then(result => {
                alert(\`\${result.deleted} events deleted\`);
                location.reload();
              });
            }
          });
        }
        
        // Add checkbox column
        const headerRow = document.querySelector('#events-table thead tr');
        if (headerRow) {
          const checkboxHeader = document.createElement('th');
          checkboxHeader.style.width = '40px';
          checkboxHeader.innerHTML = '<div class="form-check"><input class="form-check-input" type="checkbox" id="select-all"></div>';
          headerRow.insertBefore(checkboxHeader, headerRow.firstChild);
          
          document.getElementById('select-all').addEventListener('change', e => {
            document.querySelectorAll('.event-checkbox').forEach(cb => {
              cb.checked = e.target.checked;
              const id = cb.getAttribute('data-id');
              if (e.target.checked && !selectedEventIds.includes(id)) selectedEventIds.push(id);
            });
            if (!e.target.checked) selectedEventIds = [];
            updateButton();
          });
        }
        
        // Add checkboxes to rows
        document.querySelectorAll('#events-body tr').forEach(row => {
          if (row.cells.length <= 1) return;
          
          let id = null;
          const btns = row.querySelector('[onclick*="edit"], [onclick*="delete"]');
          if (btns) {
            const match = btns.getAttribute('onclick').match(/'([^']+)'/);
            if (match) id = match[1];
          }
          
          if (id) {
            const cell = document.createElement('td');
            cell.innerHTML = \`<div class="form-check"><input class="form-check-input event-checkbox" type="checkbox" data-id="\${id}"></div>\`;
            row.insertBefore(cell, row.firstChild);
            
            cell.querySelector('input').addEventListener('change', e => {
              if (e.target.checked) {
                if (!selectedEventIds.includes(id)) selectedEventIds.push(id);
              } else {
                selectedEventIds = selectedEventIds.filter(i => i !== id);
                document.getElementById('select-all').checked = false;
              }
              updateButton();
            });
          }
        });
        
        // Update button state
        function updateButton() {
          const btn = document.getElementById('bulk-delete-button');
          if (btn) {
            btn.disabled = selectedEventIds.length === 0;
            btn.textContent = selectedEventIds.length > 0 ? 
              \`Delete Selected (\${selectedEventIds.length})\` : 
              'Delete Selected';
          }
        }
      });
      
      // Run it now
      document.dispatchEvent(new Event('DOMContentLoaded'));
    `;
    document.head.appendChild(inlineScript);
  };
  document.head.appendChild(script);
})();
