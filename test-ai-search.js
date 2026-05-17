// Test the AI search tool directly
const prisma = require('./src/shared/prisma').default;
const { executeTool } = require('./src/app/modules/ai/ai.tools');

async function testSearch() {
  try {
    console.log('Testing search_products tool...');

    // Test with a generic search
    const result = await executeTool('search_products', {
      name: '',  // Empty name to get all products
      limit: 5
    });

    console.log('Search result:', result);
  } catch (error) {
    console.error('Error during test:', error);
  }
}

testSearch();