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
        <a href="/admin" class="btn btn-primary">Events Dashboard</a>
        <a href="/admin/featured" class="btn btn-success">Featured Events Admin</a>
      </div>
    `;
  }
});
