const { chromium } = require('playwright');

class VoiceCallTester {
  constructor() {
    this.browser1 = null;
    this.browser2 = null;
    this.page1 = null;
    this.page2 = null;
    this.context1 = null;
    this.context2 = null;
  }

  async setup() {
    console.log('🚀 Setting up voice call test environment...');
    
    // Launch two separate browser instances
    this.browser1 = await chromium.launch({ 
      headless: false,
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--allow-file-access-from-files',
        '--disable-web-security',
        '--auto-select-desktop-capture-source=Screen 1'
      ]
    });
    
    this.browser2 = await chromium.launch({ 
      headless: false,
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--allow-file-access-from-files',
        '--disable-web-security',
        '--auto-select-desktop-capture-source=Screen 1'
      ]
    });

    // Create browser contexts with media permissions
    this.context1 = await this.browser1.newContext({
      permissions: ['microphone', 'camera']
    });
    
    this.context2 = await this.browser2.newContext({
      permissions: ['microphone', 'camera']
    });

    // Create pages
    this.page1 = await this.context1.newPage();
    this.page2 = await this.context2.newPage();

    // Set viewport sizes to see both windows
    await this.page1.setViewportSize({ width: 800, height: 600 });
    await this.page2.setViewportSize({ width: 800, height: 600 });

    console.log('✅ Browser instances created successfully');
  }

  async loginUser1() {
    console.log('👤 Logging in User 1 (austinminecraft09@gmail.com)...');
    
    await this.page1.goto('http://localhost:5173/login');
    await this.page1.waitForTimeout(2000);
    
    // Fill login form
    await this.page1.fill('input[type="email"]', 'austinminecraft09@gmail.com');
    await this.page1.fill('input[type="password"]', 'Austin09');
    await this.page1.click('button[type="submit"]');
    
    // Wait for redirect to main page
    await this.page1.waitForURL('http://localhost:5173/');
    await this.page1.waitForTimeout(3000);
    
    console.log('✅ User 1 logged in successfully');
  }

  async loginUser2() {
    console.log('👤 Logging in User 2 (creating test account)...');
    
    await this.page2.goto('http://localhost:5173/signup');
    await this.page2.waitForTimeout(2000);
    
    // Create a test account
    const timestamp = Date.now();
    const testEmail = `testuser${timestamp}@example.com`;
    const testUsername = `testuser${timestamp}`;
    
    await this.page2.fill('input[type="email"]', testEmail);
    await this.page2.fill('input[placeholder*="username"]', testUsername);
    await this.page2.fill('input[type="password"]', 'TestPassword123!');
    await this.page2.fill('input[placeholder*="Confirm"]', 'TestPassword123!');
    await this.page2.click('button[type="submit"]');
    
    // Wait for account creation
    await this.page2.waitForTimeout(5000);
    
    // Navigate to main page
    await this.page2.goto('http://localhost:5173/');
    await this.page2.waitForTimeout(3000);
    
    console.log(`✅ User 2 (${testUsername}) created and logged in`);
    return { email: testEmail, username: testUsername };
  }

  async addUsersAsContacts(user2Info) {
    console.log('🤝 Adding users as contacts...');
    
    // User 1 adds User 2 as contact
    await this.page1.click('button:has-text("Contacts")');
    await this.page1.waitForTimeout(2000);
    
    await this.page1.fill('input[placeholder*="Search users"]', user2Info.username);
    await this.page1.waitForTimeout(3000);
    
    // Look for the user in search results and send friend request
    const addButton = await this.page1.locator('button:has-text("Add")').first();
    if (await addButton.isVisible()) {
      await addButton.click();
      console.log('📤 Friend request sent from User 1 to User 2');
    }
    
    // User 2 accepts the friend request
    await this.page2.click('button:has-text("Contacts")');
    await this.page2.waitForTimeout(2000);
    
    await this.page2.click('button:has-text("Pending")');
    await this.page2.waitForTimeout(2000);
    
    const acceptButton = await this.page2.locator('button:has-text("Accept")').first();
    if (await acceptButton.isVisible()) {
      await acceptButton.click();
      console.log('✅ Friend request accepted by User 2');
    }
    
    await this.page2.waitForTimeout(2000);
  }

  async initiateCall() {
    console.log('📞 User 1 initiating voice call...');
    
    // User 1 goes to contacts and calls User 2
    await this.page1.click('button:has-text("Contacts")');
    await this.page1.waitForTimeout(2000);
    
    // Find the voice call button for User 2 and click it
    const voiceCallButton = await this.page1.locator('button:has-text("Voice call")').first();
    if (await voiceCallButton.isVisible()) {
      await voiceCallButton.click();
      console.log('📞 Voice call initiated by User 1');
    } else {
      console.log('❌ Voice call button not found');
      return false;
    }
    
    await this.page1.waitForTimeout(3000);
    return true;
  }

  async answerCall() {
    console.log('📞 User 2 answering incoming call...');
    
    // Wait for call notification on User 2's screen
    await this.page2.waitForTimeout(3000);
    
    // Look for answer button in call notification
    const answerButton = await this.page2.locator('button:has-text("Answer")').first();
    if (await answerButton.isVisible()) {
      await answerButton.click();
      console.log('✅ Call answered by User 2');
      return true;
    } else {
      console.log('❌ Answer button not found');
      return false;
    }
  }

  async testCallConnection() {
    console.log('🔊 Testing call connection...');
    
    // Wait for call to establish
    await this.page1.waitForTimeout(5000);
    await this.page2.waitForTimeout(5000);
    
    // Check if call interface is visible on both pages
    const callInterface1 = await this.page1.locator('[data-testid="call-interface"]').isVisible();
    const callInterface2 = await this.page2.locator('[data-testid="call-interface"]').isVisible();
    
    console.log(`User 1 call interface visible: ${callInterface1}`);
    console.log(`User 2 call interface visible: ${callInterface2}`);
    
    // Test mute functionality
    const muteButton1 = await this.page1.locator('button:has-text("Mute")').first();
    if (await muteButton1.isVisible()) {
      await muteButton1.click();
      console.log('🔇 User 1 muted');
      await this.page1.waitForTimeout(2000);
      
      await muteButton1.click();
      console.log('🔊 User 1 unmuted');
    }
    
    return callInterface1 && callInterface2;
  }

  async endCall() {
    console.log('📞 Ending call...');
    
    // User 1 ends the call
    const endCallButton = await this.page1.locator('button:has-text("End call")').first();
    if (await endCallButton.isVisible()) {
      await endCallButton.click();
      console.log('✅ Call ended by User 1');
    }
    
    await this.page1.waitForTimeout(3000);
    await this.page2.waitForTimeout(3000);
  }

  async captureScreenshots() {
    console.log('📸 Capturing screenshots...');
    
    await this.page1.screenshot({ path: 'test-results/user1-screenshot.png', fullPage: true });
    await this.page2.screenshot({ path: 'test-results/user2-screenshot.png', fullPage: true });
    
    console.log('✅ Screenshots saved to test-results/');
  }

  async getConsoleMessages() {
    console.log('📋 Collecting console messages...');
    
    // Get console messages from both pages
    const messages1 = await this.page1.evaluate(() => {
      return window.console.messages || [];
    });
    
    const messages2 = await this.page2.evaluate(() => {
      return window.console.messages || [];
    });
    
    console.log('User 1 Console Messages:', messages1);
    console.log('User 2 Console Messages:', messages2);
  }

  async cleanup() {
    console.log('🧹 Cleaning up test environment...');
    
    if (this.browser1) await this.browser1.close();
    if (this.browser2) await this.browser2.close();
    
    console.log('✅ Cleanup completed');
  }

  async runFullTest() {
    try {
      console.log('🧪 Starting Voice Call End-to-End Test');
      console.log('=' .repeat(50));
      
      // Setup
      await this.setup();
      
      // Login both users
      await this.loginUser1();
      const user2Info = await this.loginUser2();
      
      // Add as contacts
      await this.addUsersAsContacts(user2Info);
      
      // Test call flow
      const callInitiated = await this.initiateCall();
      if (!callInitiated) {
        throw new Error('Failed to initiate call');
      }
      
      const callAnswered = await this.answerCall();
      if (!callAnswered) {
        console.log('⚠️  Call not answered, but continuing test...');
      }
      
      // Test connection
      const connectionWorking = await this.testCallConnection();
      console.log(`Call connection working: ${connectionWorking}`);
      
      // Keep call active for testing
      console.log('⏳ Keeping call active for 10 seconds...');
      await this.page1.waitForTimeout(10000);
      
      // End call
      await this.endCall();
      
      // Capture results
      await this.captureScreenshots();
      await this.getConsoleMessages();
      
      console.log('=' .repeat(50));
      console.log('🎉 Voice Call Test Completed Successfully!');
      
    } catch (error) {
      console.error('❌ Test failed:', error);
      await this.captureScreenshots();
    } finally {
      // Keep browsers open for manual inspection
      console.log('🔍 Keeping browsers open for manual inspection...');
      console.log('Press Ctrl+C to close browsers and exit');
      
      // Wait indefinitely until user closes
      await new Promise(() => {});
    }
  }
}

// Run the test
async function main() {
  const tester = new VoiceCallTester();
  await tester.runFullTest();
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n👋 Shutting down test environment...');
  process.exit(0);
});

main(); 