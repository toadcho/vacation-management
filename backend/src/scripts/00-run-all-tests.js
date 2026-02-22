#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');

console.log('\n');
console.log('╔════════════════════════════════════════════════════╗');
console.log('║     🚀 Google API 통합 테스트 시작                ║');
console.log('╚════════════════════════════════════════════════════╝');
console.log('\n');

const tests = [
  '01-check-env.js',
  '02-test-token.js',
  '03-test-calendar.js',
  '04-test-gmail.js'
];

async function runTest(scriptName) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, scriptName);
    const child = spawn('node', [scriptPath], {
      stdio: 'inherit'
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${scriptName} 실패 (종료 코드: ${code})`));
      }
    });
  });
}

async function runAllTests() {
  for (const test of tests) {
    try {
      await runTest(test);
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.log('\n❌ 테스트 중단:', error.message);
      console.log('💡 이전 단계를 먼저 해결하세요.\n');
      process.exit(1);
    }
  }

  console.log('\n');
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║     ✨ 모든 테스트 통과! 시스템 준비 완료!       ║');
  console.log('╚════════════════════════════════════════════════════╝');
  console.log('\n');
}

runAllTests();
