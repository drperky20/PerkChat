const { chromium } = require('playwright');

/**
 * Simple Voice Call Manual Test
 * This script opens two browser windows for manual testing of voice calls
 */

async function setupManualTest() {
  console.log('🧪 Setting up manual voice call test environment...');
  console.log('=' .repeat(60));
  
  // Launch two browser instances
  const browser1 = await chromium.launch({ 
    headless: false,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--allow-file-access-from-files',
      '--disable-web-security'
    ]
  });
  
  const browser2 = await chromium.launch({ 
    headless: false,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--allow-file-access-from-files',
      '--disable-web-security'
    ]
  });

  // Create contexts with media permissions
  const context1 = await browser1.newContext({
    permissions: ['microphone', 'camera']
  });
  
  const context2 = await browser2.newContext({
    permissions: ['microphone', 'camera']
  });

  // Create pages
  const page1 = await context1.newPage();
  const page2 = await context2.newPage();

  // Position windows side by side
  await page1.setViewportSize({ width: 600, height: 800 });
  await page2.setViewportSize({ width: 600, height: 800 });

  // Navigate to the app
  await page1.goto('http://localhost:5173');
  await page2.goto('http://localhost:5173');

  console.log('✅ Two browser windows opened');
  console.log('🌐 Both navigated to http://localhost:5173');
  console.log('🔊 Media permissions granted');
  console.log('');
  console.log('📋 MANUAL TEST INSTRUCTIONS:');
  console.log('=' .repeat(60));
  console.log('');
  console.log('1. 👤 LOGIN USERS:');
  console.log('   Window 1: Login with austinminecraft09@gmail.com / Austin09');
  console.log('   Window 2: Create a new account or login with different credentials');
  console.log('');
  console.log('2. 🤝 ADD CONTACTS:');
  console.log('   - Go to Contacts page in both windows');
  console.log('   - Search for the other user and send/accept friend requests');
  console.log('');
  console.log('3. 📞 TEST VOICE CALLING:');
  console.log('   - In Window 1: Go to Contacts, click "Voice call" button');
  console.log('   - In Window 2: Answer the incoming call notification');
  console.log('   - Test mute/unmute functionality');
  console.log('   - Test call ending');
  console.log('');
  console.log('4. 🔍 THINGS TO VERIFY:');
  console.log('   ✓ Call interface appears on both sides');
  console.log('   ✓ Call status updates (initiating → ringing → connected)');
  console.log('   ✓ Call duration timer works');
  console.log('   ✓ Mute/unmute buttons work');
  console.log('   ✓ End call works from either side');
  console.log('   ✓ Other call buttons disabled during active call');
  console.log('   ✓ WebRTC connection establishes properly');
  console.log('');
  console.log('🔴 Press Ctrl+C to close browsers when done');
  console.log('=' .repeat(60));

  // Set up console message logging
  page1.on('console', msg => {
    console.log(`[Window 1] ${msg.type()}: ${msg.text()}`);
  });
  
  page2.on('console', msg => {
    console.log(`[Window 2] ${msg.type()}: ${msg.text()}`);
  });

  // Keep browsers open until user closes them
  await new Promise((resolve) => {
    process.on('SIGINT', async () => {
      console.log('\n👋 Closing browsers...');
      await browser1.close();
      await browser2.close();
      console.log('✅ Test environment closed');
      resolve();
    });
  });
}

// Handle errors gracefully
async function main() {
  try {
    await setupManualTest();
  } catch (error) {
    console.error('❌ Error setting up test environment:', error);
    process.exit(1);
  }
}

main(); 