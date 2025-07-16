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
  loadQuotes();
  populateCategories();
  restoreLastFilter();
  showRandomQuote();
  checkLastViewedQuote();
  setupSync();
  
  // Event listeners
  newQuoteBtn.addEventListener('click', showRandomQuote);
  categoryFilter.addEventListener('change', filterQuotes);
  importFileInput.addEventListener('change', importFromJsonFile);
}

/* Local Storage Functions */
function loadQuotes() {
  const storedQuotes = localStorage.getItem(LOCAL_STORAGE_KEY);
  quotes = storedQuotes ? JSON.parse(storedQuotes) : getDefaultQuotes();
  saveQuotes();
}

function saveQuotes() {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(quotes));
}

function getDefaultQuotes() {
  return [
    { text: "The only way to do great work is to love what you do.", category: "inspiration", timestamp: Date.now() },
    { text: "Innovation distinguishes between a leader and a follower.", category: "business", timestamp: Date.now() },
    { text: "Your time is limited, don't waste it living someone else's life.", category: "life", timestamp: Date.now() }
  ];
}

/* UI Functions */
function populateCategories() {
  categoryFilter.innerHTML = '';
  ['all', ...new Set(quotes.map(q => q.category))].forEach(category => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category === 'all' ? 'All Categories' : 
                       category.charAt(0).toUpperCase() + category.slice(1);
    categoryFilter.appendChild(option);
  });
}

function filterQuotes() {
  localStorage.setItem(FILTER_STORAGE_KEY, categoryFilter.value);
  showRandomQuote();
}

function restoreLastFilter() {
  const lastFilter = localStorage.getItem(FILTER_STORAGE_KEY);
  if (lastFilter) categoryFilter.value = lastFilter;
}

function showRandomQuote() {
  const filteredQuotes = categoryFilter.value === 'all' ? 
    quotes : quotes.filter(q => q.category === categoryFilter.value);
  
  if (filteredQuotes.length === 0) {
    quoteDisplay.innerHTML = `
      <p class="quote-text">No quotes found in this category.</p>
      <p class="quote-category">Category: ${categoryFilter.value}</p>
    `;
    return;
  }

  const randomQuote = filteredQuotes[Math.floor(Math.random() * filteredQuotes.length)];
  quoteDisplay.innerHTML = `
    <p class="quote-text">${randomQuote.text}</p>
    <p class="quote-category">Category: ${randomQuote.category}</p>
  `;
  sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(randomQuote));
}

function checkLastViewedQuote() {
  const lastQuote = sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (lastQuote) {
    const { text, category } = JSON.parse(lastQuote);
    lastViewedDisplay.innerHTML = `Last viewed: "${text}" (${category})`;
  }
}

/* Quote Management */
function addQuote() {
  const text = document.getElementById('newQuoteText').value.trim();
  const category = document.getElementById('newQuoteCategory').value.trim();
  
  if (text && category) {
    quotes.push({ text, category, timestamp: Date.now() });
    saveQuotes();
    populateCategories();
    document.getElementById('newQuoteText').value = '';
    document.getElementById('newQuoteCategory').value = '';
    showRandomQuote();
    showNotification('Quote added successfully!');
  } else {
    showNotification('Please enter both quote text and category.', true);
  }
}

/* Server Sync Functions */
async function fetchQuotesFromServer() {
  try {
    const response = await fetch('https://jsonplaceholder.typicode.com/posts?_limit=5');
    if (!response.ok) throw new Error(`Server error: ${response.status}`);
    
    const serverData = await response.json();
    return serverData.map(post => ({
      id: `server-${post.id}`,
      text: post.title,
      category: 'server',
      body: post.body,
      timestamp: Date.now()
    }));
  } catch (error) {
    console.error('Fetch error:', error);
    showNotification('Failed to fetch from server', true);
    return [];
  }
}

async function postQuotesToServer(quotesToSend) {
  try {
    const response = await fetch('https://jsonplaceholder.typicode.com/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify({
        data: quotesToSend,
        meta: {
          syncTime: new Date().toISOString(),
          client: 'QuoteGeneratorWeb'
        }
      })
    });

    if (!response.ok) throw new Error(`Server rejected with status ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Post error:', error);
    showNotification('Failed to sync with server', true);
    return null;
  }
}

async function syncQuotes() {
  if (syncInProgress) {
    showNotification('Sync already in progress', true);
    return;
  }

  syncInProgress = true;
  showNotification('Starting quote synchronization...');

  try {
    // Step 1: Fetch server quotes
    const serverQuotes = await fetchQuotesFromServer();
    showNotification(`Retrieved ${serverQuotes.length} quotes from server`);

    // Step 2: Detect and handle conflicts
    const conflicts = detectConflicts(quotes, serverQuotes);
    if (conflicts.length > 0) {
      showNotification(`${conflicts.length} conflicts detected`, true);
      return showConflictResolution(conflicts);
    }

    // Step 3: Merge quotes
    const mergedQuotes = mergeQuotes(quotes, serverQuotes);
    const newQuotesCount = mergedQuotes.length - quotes.length;
    
    if (newQuotesCount > 0) {
      showNotification(`Added ${newQuotesCount} new quotes from server`);
    }

    // Step 4: Update local storage
    quotes = mergedQuotes;
    saveQuotes();

    // Step 5: Post local changes to server
    const postResult = await postQuotesToServer(quotes);
    if (postResult) {
      showNotification('Quotes synced with server successfully!');
    }

    // Update sync status
    lastSyncTime = Date.now();
    localStorage.setItem(LAST_SYNC_KEY, lastSyncTime.toString());
    updateSyncStatus();

  } catch (error) {
    console.error('Sync error:', error);
    showNotification('Sync failed: ' + error.message, true);
  } finally {
    syncInProgress = false;
  }
}

function setupSync() {
  // Initial sync
  syncQuotes();
  
  // Set up periodic sync
  setInterval(syncQuotes, syncInterval);
  
  // Update sync status display
  updateSyncStatus();
}

function manualSync() {
  syncQuotes();
}

/* Conflict Resolution */
function detectConflicts(localQuotes, serverQuotes) {
  return serverQuotes.filter(serverQuote => {
    const localMatch = localQuotes.find(q => q.text === serverQuote.text);
    return localMatch && localMatch.timestamp < serverQuote.timestamp;
  }).map(serverQuote => ({
    server: serverQuote,
    local: localQuotes.find(q => q.text === serverQuote.text)
  }));
}

function mergeQuotes(localQuotes, serverQuotes) {
  const merged = [...localQuotes];
  serverQuotes.forEach(serverQuote => {
    if (!merged.some(q => q.text === serverQuote.text)) {
      merged.push(serverQuote);
    }
  });
  return merged;
}

function showConflictResolution(conflicts) {
  conflictResolutionDiv.style.display = 'block';
  conflictResolutionDiv.dataset.conflicts = JSON.stringify(conflicts);
  showNotification(`Found ${conflicts.length} conflicts that need resolution`);
}

function resolveConflict(resolutionType) {
  const conflicts = JSON.parse(conflictResolutionDiv.dataset.conflicts);
  
  switch (resolutionType) {
    case 'local':
      // Keep local versions
      break;
    case 'server':
      conflicts.forEach(({ local, server }) => {
        quotes = quotes.filter(q => q !== local);
        quotes.push(server);
      });
      break;
    case 'merge':
      conflicts.forEach(({ server }) => {
        if (!quotes.some(q => q.text === server.text)) {
          quotes.push(server);
        }
      });
      break;
  }

  saveQuotes();
  conflictResolutionDiv.style.display = 'none';
  showNotification('Conflicts resolved successfully!');
  showRandomQuote();
}

/* Notification System */
function showNotification(message, isError = false) {
  notificationDiv.textContent = message;
  notificationDiv.style.backgroundColor = isError ? '#f44336' : '#4CAF50';
  notificationDiv.style.display = 'block';
  setTimeout(() => notificationDiv.style.display = 'none', 3000);
}

function updateSyncStatus() {
  const lastSync = localStorage.getItem(LAST_SYNC_KEY);
  syncStatusDiv.textContent = lastSync ? 
    `Last sync: ${new Date(parseInt(lastSync)).toLocaleTimeString()}` : 
    'Last sync: Never';
}

/* Data Import/Export */
function exportToJson() {
  const blob = new Blob([JSON.stringify(quotes, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'quotes.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showNotification('Quotes exported successfully!');
}

function importFromJsonFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = e => {
    try {
      const imported = JSON.parse(e.target.result);
      if (!Array.isArray(imported)) throw new Error('Invalid format');
      
      quotes = imported.map(q => ({ 
        ...q, 
        timestamp: q.timestamp || Date.now() 
      }));
      saveQuotes();
      populateCategories();
      showRandomQuote();
      showNotification(`Successfully imported ${imported.length} quotes`);
    } catch (error) {
      showNotification('Import failed: ' + error.message, true);
    }
    event.target.value = '';
  };
  reader.readAsText(file);
}

function clearAllQuotes() {
  if (confirm('Are you sure you want to clear all quotes? This cannot be undone.')) {
    quotes = [];
    saveQuotes();
    populateCategories();
    quoteDisplay.innerHTML = `
      <p class="quote-text">All quotes have been cleared.</p>
      <p class="quote-category"></p>
    `;
    showNotification('All quotes cleared successfully');
  }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', init);