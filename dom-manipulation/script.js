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

// Mock server URL (using JSONPlaceholder)
const MOCK_SERVER_URL = 'https://jsonplaceholder.typicode.com/posts';

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

// Simulate fetching quotes from server
async function fetchFromServer() {
  try {
    // In a real app, this would be your actual API endpoint
    const response = await fetch(MOCK_SERVER_URL);
    if (!response.ok) throw new Error('Server error');
    
    const serverData = await response.json();
    
    // Transform mock data to our quote format
    return serverData.slice(0, 5).map(post => ({
      text: post.title,
      category: 'server',
      id: `server-${post.id}`,
      timestamp: Date.now()
    }));
  } catch (error) {
    console.error('Failed to fetch from server:', error);
    return [];
  }
}

// Simulate posting quotes to server
async function postToServer(quotesToSend) {
  try {
    // In a real app, this would be your actual API endpoint
    const responses = await Promise.all(
      quotesToSend.map(quote => 
        fetch(MOCK_SERVER_URL, {
          method: 'POST',
          body: JSON.stringify(quote),
          headers: {
            'Content-type': 'application/json; charset=UTF-8',
          },
        })
      )
    );
    
    return responses.every(r => r.ok);
  } catch (error) {
    console.error('Failed to post to server:', error);
    return false;
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
    // Get server quotes
    const serverQuotes = await fetchFromServer();
    
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
    
    // Post local changes to server (in a real app, this would be more sophisticated)
    await postToServer(localQuotes);
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

/* 
  All previous functions (loadQuotes, saveQuotes, populateCategories, 
  filterQuotes, showRandomQuote, addQuote, exportToJson, importFromJsonFile, 
  clearAllQuotes) remain exactly the same as in the previous implementation
*/

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', init);