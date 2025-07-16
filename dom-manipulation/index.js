// Initial quotes database
let quotes = [
  { text: "The only way to do great work is to love what you do.", category: "inspiration" },
  { text: "Innovation distinguishes between a leader and a follower.", category: "business" },
  { text: "Your time is limited, don't waste it living someone else's life.", category: "life" },
  { text: "Stay hungry, stay foolish.", category: "inspiration" },
  { text: "The greatest glory in living lies not in never falling, but in rising every time we fall.", category: "life" },
  { text: "The way to get started is to quit talking and begin doing.", category: "motivation" }
];

// DOM elements
const quoteDisplay = document.getElementById('quoteDisplay');
const newQuoteBtn = document.getElementById('newQuote');
const categorySelect = document.getElementById('categorySelect');
const newQuoteText = document.getElementById('newQuoteText');
const newQuoteCategory = document.getElementById('newQuoteCategory');

// Initialize the app
function init() {
  // Populate category dropdown
  updateCategoryDropdown();
  
  // Display a random quote on page load
  showRandomQuote();
  
  // Event listeners
  newQuoteBtn.addEventListener('click', showRandomQuote);
  categorySelect.addEventListener('change', showRandomQuote);
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
}

// Add a new quote to the database
function addQuote() {
  const text = newQuoteText.value.trim();
  const category = newQuoteCategory.value.trim();
  
  if (text && category) {
    // Add new quote
    quotes.push({ text, category });
    
    // Clear form fields
    newQuoteText.value = '';
    newQuoteCategory.value = '';
    
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

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', init);