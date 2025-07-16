// Quotes database
let quotes = [];
let lastSyncTime = null;
let syncInterval = 30000; // 30 seconds
let syncInProgress = false;

// DOM elements
const quoteDisplay = document.getElementById('quoteDisplay');
const newQuoteBtn = document.getElementById('newQuote');
const categoryFilter = document.getElementById('categoryFilter');
const lastViewedDisplay = document.getElementById('lastViewed');
const importFileInput = document.getElementById('importFile');
const conflictResolutionDiv = document.getElementById('conflictResolution');
const notificationDiv = document.getElementById('notification');
const syncStatusDiv = document.getElementById('syncStatus');

// Storage keys
const LOCAL_STORAGE_KEY = 'dynamicQuoteGenerator_quotes';
const SESSION_STORAGE_KEY = 'dynamicQuoteGenerator_lastViewed';
const FILTER_STORAGE_KEY = 'dynamicQuoteGenerator_lastFilter';
const LAST_SYNC_KEY = 'dynamicQuoteGenerator_lastSync';

// Initialize the app
function init() {
  // Load quotes from local storage
  loadQuotes();
  
  // Populate category dropdown
  populateCategories();
  
  // Restore last filter selection
  restoreLastFilter();
  
  // Display a random quote on page load
  showRandomQuote();
  
  // Check session storage for last viewed quote
  checkLastViewedQuote();
  
  // Set up periodic sync
  setupSync();
  
  // Event listeners
  newQuoteBtn.addEventListener('click', showRandomQuote);
  categoryFilter.addEventListener('change', filterQuotes);
  importFileInput.addEventListener('change', importFromJsonFile);
}

// Load quotes from local storage
function loadQuotes() {
  const storedQuotes = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (storedQuotes) {
    quotes = JSON.parse(storedQuotes);
  } else {
    // Default quotes if none in storage
    quotes = [
      { text: "The only way to do great work is to love what you do.", category: "inspiration" },
      { text: "Innovation distinguishes between a leader and a follower.", category: "business" },
      { text: "Your time is limited, don't waste it living someone else's life.", category: "life" },
      { text: "Stay hungry, stay foolish.", category: "inspiration" },
      { text: "The greatest glory in living lies not in never falling, but in rising every time we fall.", category: "life" },
      { text: "The way to get started is to quit talking and begin doing.", category: "motivation" }
    ];
    saveQuotes();
  }
}

// Save quotes to local storage
function saveQuotes() {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(quotes));
}

// Populate categories dropdown
function populateCategories() {
  // Get all unique categories
  const categories = ['all', ...new Set(quotes.map(quote => quote.category))];
  
  // Clear existing options
  categoryFilter.innerHTML = '';
  
  // Add new options
  categories.forEach(category => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category === 'all' ? 'All Categories' : 
                        category.charAt(0).toUpperCase() + category.slice(1);
    categoryFilter.appendChild(option);
  });
}

// Filter quotes based on selected category
function filterQuotes() {
  const selectedCategory = categoryFilter.value;
  
  // Save the selected filter
  localStorage.setItem(FILTER_STORAGE_KEY, selectedCategory);
  
  // Show a random quote from the filtered category
  showRandomQuote();
}

// Restore last selected filter from storage
function restoreLastFilter() {
  const lastFilter = localStorage.getItem(FILTER_STORAGE_KEY);
  if (lastFilter) {
    categoryFilter.value = lastFilter;
  }
}

// Display a random quote from current filter
function showRandomQuote() {
  const selectedCategory = categoryFilter.value;
  let filteredQuotes = quotes;
  
  // Filter quotes by category if not "all"
  if (selectedCategory !== 'all') {
    filteredQuotes = quotes.filter(quote => quote.category === selectedCategory);
    
    // If no quotes in selected category, show message
    if (filteredQuotes.length === 0) {
      quoteDisplay.innerHTML = `
        <p class="quote-text">No quotes found in this category.</p>
        <p class="quote-category">Category: ${selectedCategory}</p>
      `;
      return;
    }
  }
  
  // Get random quote from filtered list
  const randomIndex = Math.floor(Math.random() * filteredQuotes.length);
  const randomQuote = filteredQuotes[randomIndex];
  
  // Display the quote
  quoteDisplay.innerHTML = `
    <p class="quote-text">${randomQuote.text}</p>
    <p class="quote-category">Category: ${randomQuote.category}</p>
  `;
  
  // Store last viewed quote in session storage
  sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(randomQuote));
}

// Check and display last viewed quote from session
function checkLastViewedQuote() {
  const lastQuote = sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (lastQuote) {
    const parsedQuote = JSON.parse(lastQuote);
    lastViewedDisplay.innerHTML = `Last viewed: "${parsedQuote.text}" (${parsedQuote.category})`;
  }
}

// Add a new quote to the database
function addQuote() {
  const text = document.getElementById('newQuoteText').value.trim();
  const category = document.getElementById('newQuoteCategory').value.trim();
  
  if (text && category) {
    // Add new quote
    quotes.push({ 
      text, 
      category,
      timestamp: Date.now() // Add timestamp for sync purposes
    });
    
    // Save to local storage
    saveQuotes();
    
    // Update categories dropdown
    populateCategories();
    
    // Clear form fields
    document.getElementById('newQuoteText').value = '';
    document.getElementById('newQuoteCategory').value = '';
    
    // Show a new quote
    showRandomQuote();
    
    showNotification('Quote added successfully!');
  } else {
    showNotification('Please enter both quote text and category.', true);
  }
}

// Export quotes to JSON file using Blob
function exportToJson() {
  if (quotes.length === 0) {
    showNotification('No quotes to export!', true);
    return;
  }
  
  const dataStr = JSON.stringify(quotes, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', url);
  linkElement.setAttribute('download', 'quotes.json');
  document.body.appendChild(linkElement);
  linkElement.click();
  
  // Clean up
  document.body.removeChild(linkElement);
  URL.revokeObjectURL(url);
  
  showNotification('Quotes exported successfully!');
}

// Import quotes from JSON file
function importFromJsonFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const fileReader = new FileReader();
  
  fileReader.onload = function(e) {
    try {
      const importedQuotes = JSON.parse(e.target.result);
      
      // Validate the imported data
      if (!Array.isArray(importedQuotes)) {
        throw new Error('Imported data is not an array');
      }
      
      for (const quote of importedQuotes) {
        if (!quote.text || !quote.category) {
          throw new Error('Invalid quote format in imported file');
        }
      }
      
      // Add imported quotes with timestamps
      const timestampedQuotes = importedQuotes.map(quote => ({
        ...quote,
        timestamp: quote.timestamp || Date.now()
      }));
      
      quotes = timestampedQuotes;
      saveQuotes();
      populateCategories();
      showRandomQuote();
      
      showNotification(`${importedQuotes.length} quotes imported successfully!`);
    } catch (error) {
      showNotification('Error importing quotes: ' + error.message, true);
      console.error(error);
    }
    
    // Reset file input
    event.target.value = '';
  };
  
  fileReader.onerror = function() {
    showNotification('Error reading file', true);
    event.target.value = '';
  };
  
  fileReader.readAsText(file);
}

// Clear all quotes
function clearAllQuotes() {
  if (confirm('Are you sure you want to clear all quotes? This cannot be undone.')) {
    quotes = [];
    saveQuotes();
    populateCategories();
    quoteDisplay.innerHTML = `
      <p class="quote-text">All quotes have been cleared.</p>
      <p class="quote-category"></p>
    `;
    lastViewedDisplay.textContent = '';
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    localStorage.removeItem(FILTER_STORAGE_KEY);
    
    showNotification('All quotes cleared');
  }
}

/* Server Sync Functions */

/**
 * Fetch quotes from the mock server
 * @returns {Promise<Array>} Array of quote objects
 */
async function fetchQuotesFromServer() {
  try {
    // Using JSONPlaceholder as our mock server
    const response = await fetch('https://jsonplaceholder.typicode.com/posts');
    
    if (!response.ok) {
      throw new Error(`Server returned ${response.status} status`);
    }
    
    const serverPosts = await response.json();
    
    // Transform the server data into our quote format
    return serverPosts.slice(0, 5).map(post => ({
      id: `server-${post.id}`,
      text: post.title,
      category: 'server',
      body: post.body,
      timestamp: Date.now()
    }));
  } catch (error) {
    console.error('Failed to fetch quotes from server:', error);
    showNotification('Failed to connect to server', true);
    return []; // Return empty array if fetch fails
  }
}

// Setup periodic synchronization
function setupSync() {
  // Initial sync
  syncWithServer();
  
  // Set up periodic sync
  setInterval(syncWithServer, syncInterval);
  
  // Update last sync time display
  updateSyncStatus();
}

// Main sync function
async function syncWithServer() {
  if (syncInProgress) return;
  syncInProgress = true;
  
  try {
    // Get server quotes using the fetchQuotesFromServer function
    const serverQuotes = await fetchQuotesFromServer();
    
    // Get local quotes
    const localQuotes = [...quotes];
    
    // Detect conflicts (simple timestamp-based comparison)
    const conflicts = detectConflicts(localQuotes, serverQuotes);
    
    if (conflicts.length > 0) {
      showConflictResolution(conflicts);
    } else {
      // No conflicts, merge normally
      const mergedQuotes = mergeQuotes(localQuotes, serverQuotes);
      quotes = mergedQuotes;
      saveQuotes();
      showNotification('Data synced successfully!');
    }
    
    // Update last sync time
    lastSyncTime = Date.now();
    localStorage.setItem(LAST_SYNC_KEY, lastSyncTime.toString());
    updateSyncStatus();
    
  } catch (error) {
    console.error('Sync failed:', error);
    showNotification('Sync failed: ' + error.message, true);
  } finally {
    syncInProgress = false;
  }
}

// Manual sync trigger
function manualSync() {
  showNotification('Syncing with server...');
  syncWithServer();
}

// Detect conflicts between local and server quotes
function detectConflicts(localQuotes, serverQuotes) {
  const conflicts = [];
  
  // Simple conflict detection - in a real app this would be more sophisticated
  serverQuotes.forEach(serverQuote => {
    const localMatch = localQuotes.find(q => q.text === serverQuote.text && q.category === serverQuote.category);
    if (localMatch && localMatch.timestamp < serverQuote.timestamp) {
      conflicts.push({
        local: localMatch,
        server: serverQuote
      });
    }
  });
  
  return conflicts;
}

// Merge quotes from local and server
function mergeQuotes(localQuotes, serverQuotes) {
  const merged = [...localQuotes];
  
  serverQuotes.forEach(serverQuote => {
    const exists = merged.some(q => q.text === serverQuote.text && q.category === serverQuote.category);
    if (!exists) {
      merged.push(serverQuote);
    }
  });
  
  return merged;
}

// Show conflict resolution UI
function showConflictResolution(conflicts) {
  conflictResolutionDiv.style.display = 'block';
  conflictResolutionDiv.dataset.conflicts = JSON.stringify(conflicts);
  showNotification(`Found ${conflicts.length} conflicts that need resolution`);
}

// Resolve conflicts based on user choice
function resolveConflict(resolutionType) {
  const conflicts = JSON.parse(conflictResolutionDiv.dataset.conflicts);
  let newQuotes = [...quotes];
  
  switch (resolutionType) {
    case 'local':
      // Keep local versions - do nothing
      break;
    case 'server':
      // Use server versions
      conflicts.forEach(conflict => {
        newQuotes = newQuotes.filter(q => q !== conflict.local);
        newQuotes.push(conflict.server);
      });
      break;
    case 'merge':
      // Merge keeping both
      conflicts.forEach(conflict => {
        if (!newQuotes.some(q => q.text === conflict.server.text && q.category === conflict.server.category)) {
          newQuotes.push(conflict.server);
        }
      });
      break;
  }
  
  quotes = newQuotes;
  saveQuotes();
  conflictResolutionDiv.style.display = 'none';
  showNotification('Conflicts resolved successfully!');
  updateSyncStatus();
}

// Show notification
function showNotification(message, isError = false) {
  notificationDiv.textContent = message;
  notificationDiv.style.backgroundColor = isError ? '#f44336' : '#4CAF50';
  notificationDiv.style.display = 'block';
  
  setTimeout(() => {
    notificationDiv.style.display = 'none';
  }, 3000);
}

// Update sync status display
function updateSyncStatus() {
  const lastSync = localStorage.getItem(LAST_SYNC_KEY);
  if (lastSync) {
    const lastSyncDate = new Date(parseInt(lastSync));
    syncStatusDiv.textContent = `Last sync: ${lastSyncDate.toLocaleTimeString()}`;
  } else {
    syncStatusDiv.textContent = 'Last sync: Never';
  }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', init);