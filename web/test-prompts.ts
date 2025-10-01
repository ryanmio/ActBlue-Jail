import { runPromptTest } from "./src/server/prompt-test";

// Get limit from command line
const limit = process.argv[2] ? parseInt(process.argv[2]) : 3;

console.log("🚀 Simple Prompt Testing");
console.log("========================");

runPromptTest(limit).then(() => {
  console.log("✅ Testing complete!");
  process.exit(0);
}).catch((error) => {
  console.error("❌ Testing failed:", error);
  process.exit(1);
});