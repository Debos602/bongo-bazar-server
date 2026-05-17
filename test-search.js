// Import the executeTool function from ai.tools
const { executeTool } = require('./src/app/modules/ai/ai.tools');

async function testSearch() {
  try {
    console.log('Testing search_products tool...');

    // Test with a generic search
    const result = await executeTool('search_products', {
      name: 'phone',  // Try searching for a common product
      limit: 5
    });

    console.log('Search result:', result);

    // Test with empty search (should return all products)
    const result2 = await executeTool('search_products', {
      limit: 5
    });

    console.log('Empty search result:', result2);
  } catch (error) {
    console.error('Error during test:', error);
  }
}

testSearch();