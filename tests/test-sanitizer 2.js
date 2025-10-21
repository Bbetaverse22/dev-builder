// Quick test script for the sanitizer agent
const { sanitizerAgent } = require('../lib/sanitizer.ts');

const testCases = [
  "My API key is sk-1234567890abcdef1234567890abcdef1234567890abcdef",
  "Database: mongodb://user:password123@localhost:27017/mydb",
  "Email: john.doe@example.com, Phone: (555) 123-4567",
  "Credit card: 4532-1234-5678-9012",
  "AWS key: AKIAIOSFODNN7EXAMPLE",
  "Normal text without secrets"
];

console.log("🧪 Testing Sanitizer Agent\n");

testCases.forEach((testCase, index) => {
  console.log(`Test ${index + 1}:`);
  console.log(`Input:  "${testCase}"`);
  
  const result = sanitizerAgent.sanitize(testCase);
  
  console.log(`Output: "${result.sanitizedText}"`);
  console.log(`Secrets found: ${result.secretsFound.length}`);
  
  if (result.secretsFound.length > 0) {
    result.secretsFound.forEach(secret => {
      console.log(`  - ${secret.type} (${secret.severity}): "${secret.match}"`);
    });
  }
  
  console.log(`Sanitized: ${result.isSanitized ? 'Yes' : 'No'}`);
  console.log('---\n');
});
