import { execSync } from 'child_process';
import { getErrorMessage } from '../src/types';

interface TestDef {
  file: string;
  args: string[];
  name: string;
}

const tests: TestDef[] = [
  { file: 'dist/test/login.js', args: [], name: 'Login' },
  { file: 'dist/test/search.js', args: [], name: 'Search' },
  { file: 'dist/test/profile.js', args: [], name: 'Profile' },
  { file: 'dist/test/stats.js', args: [], name: 'Stats' },
  { file: 'dist/test/items.js', args: [], name: 'Items' },
  { file: 'dist/test/like.js', args: ['616257968', 'IND', '1'], name: 'Like' }
];

console.log('='.repeat(60));
console.log(' RUNNING ALL TESTS');
console.log('='.repeat(60));
console.log();

const results: Array<{ name: string; status: string; error?: string }> = [];

for (const test of tests) {
  console.log(`[TEST] ${test.name}...`);
  try {
    const command = `node ${test.file} ${test.args.join(' ')}`;
    execSync(command, { stdio: 'inherit' });
    results.push({ name: test.name, status: 'PASS' });
    console.log(`[✓] ${test.name} PASSED\n`);
  } catch (error) {
    results.push({ name: test.name, status: 'FAIL', error: getErrorMessage(error) });
    console.error(`[✗] ${test.name} FAILED\n`);
  }
}

console.log('='.repeat(60));
console.log(' TEST SUMMARY');
console.log('='.repeat(60));

let passed = 0;
let failed = 0;

for (const result of results) {
  const symbol = result.status === 'PASS' ? '✓' : '✗';
  console.log(`[${symbol}] ${result.name}: ${result.status}`);
  if (result.status === 'PASS') passed++;
  else failed++;
}

console.log('='.repeat(60));
console.log(`Passed: ${passed}/${results.length}`);
console.log(`Failed: ${failed}/${results.length}`);
console.log('='.repeat(60));

if (failed > 0) {
  console.log('\n[!] SOME TESTS FAILED');
  process.exit(1);
} else {
  console.log('\n[✓] ALL TESTS PASSED');
  process.exit(0);
}
