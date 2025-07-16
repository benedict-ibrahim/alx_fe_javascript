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