/**
 * Admin Navigation Script
 * Adds navigation links to the admin dashboard
 */

document.addEventListener('DOMContentLoaded', function() {
  // Create navigation container if it doesn't exist
  let navContainer = document.getElementById('admin-nav');
  
  if (!navContainer) {
    const mainHeading = document.querySelector('h1, h2');
    
    if (mainHeading) {
      navContainer = document.createElement('div');
      navContainer.id = 'admin-nav';
      navContainer.style.marginBottom = '20px';
      navContainer.style.padding = '10px';
      navContainer.style.backgroundColor = '#f8f9fa';
      navContainer.style.borderRadius = '5px';
      
      mainHeading.parentNode.insertBefore(navContainer, mainHeading.nextSibling);
    }
  }
  
  if (navContainer) {
    // Add navigation links
    navContainer.innerHTML = `
      <div style="display: flex; gap: 10px; flex-wrap: wrap;">
        <a href="/admin/unified" class="btn btn-primary"><i class="bi bi-grid-3x3-gap-fill"></i> Unified Admin</a>
        <a href="/admin" class="btn btn-outline-primary">Events Dashboard</a>
        <a href="/admin/featured" class="btn btn-outline-success">Featured Events Admin</a>
      </div>
    `;
  }
});
