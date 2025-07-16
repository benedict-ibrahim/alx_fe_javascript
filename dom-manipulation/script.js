// Quotes database
let quotes = [];

// DOM elements
const quoteDisplay = document.getElementById('quoteDisplay');
const newQuoteBtn = document.getElementById('newQuote');
const categorySelect = document.getElementById('categorySelect');
const lastViewedDisplay = document.getElementById('lastViewed');

// Storage keys
const LOCAL_STORAGE_KEY = 'dynamicQuoteGenerator_quotes';
const SESSION_STORAGE_KEY = 'dynamicQuoteGenerator_lastViewed';

// Initialize the app
function init() {
  // Load quotes from local storage
  loadQuotes();
  
  // Populate category dropdown
  updateCategoryDropdown();
  
  // Display a random quote on page load
  showRandomQuote();
  
  // Check session storage for last viewed quote
  checkLastViewedQuote();
  
  // Event listeners
  newQuoteBtn.addEventListener('click', showRandomQuote);
  categorySelect.addEventListener('change', showRandomQuote);
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

// Display a random quote
function showRandomQuote() {
  const selectedCategory = categorySelect.value;
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
    quotes.push({ text, category });
    
    // Save to local storage
    saveQuotes();
    
    // Clear form fields
    document.getElementById('newQuoteText').value = '';
    document.getElementById('newQuoteCategory').value = '';
    
    // Update UI
    updateCategoryDropdown();
    showRandomQuote();
    
    alert('Quote added successfully!');
  } else {
    alert('Please enter both quote text and category.');
  }
}

// Update the category dropdown with available categories
function updateCategoryDropdown() {
  // Get all unique categories
  const categories = ['all', ...new Set(quotes.map(quote => quote.category))];
  
  // Clear existing options
  categorySelect.innerHTML = '';
  
  // Add new options
  categories.forEach(category => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category.charAt(0).toUpperCase() + category.slice(1);
    categorySelect.appendChild(option);
  });
}

// Export quotes to JSON file using Blob
function exportToJson() {
  if (quotes.length === 0) {
    alert('No quotes to export!');
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
      
      // Add imported quotes
      quotes.push(...importedQuotes);
      saveQuotes();
      updateCategoryDropdown();
      showRandomQuote();
      
      alert(`${importedQuotes.length} quotes imported successfully!`);
    } catch (error) {
      alert('Error importing quotes: ' + error.message);
      console.error(error);
    }
    
    // Reset file input
    event.target.value = '';
  };
  
  fileReader.onerror = function() {
    alert('Error reading file');
    event.target.value = '';
  };
  
  fileReader.readAsText(file);
}

// Clear all quotes
function clearAllQuotes() {
  if (confirm('Are you sure you want to clear all quotes? This cannot be undone.')) {
    quotes = [];
    saveQuotes();
    updateCategoryDropdown();
    quoteDisplay.innerHTML = `
      <p class="quote-text">All quotes have been cleared.</p>
      <p class="quote-category"></p>
    `;
    lastViewedDisplay.textContent = '';
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', init);