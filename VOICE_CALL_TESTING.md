# 🎤 Voice Call Testing Guide

## 🏗️ Test Environment Setup

This guide explains how to test the voice calling functionality in PerkChat with actual call connections between 2 clients.

### Prerequisites

1. **Development Server Running**: Make sure the app is running with `npm run dev`
2. **Supabase Configuration**: Ensure `.env` file has correct Supabase credentials
3. **Browser Requirements**: Modern browser with WebRTC support
4. **Microphone Access**: Allow microphone permissions when prompted

## 🧪 Automated Test Scripts

### Manual Testing Environment

```bash
npm run test:call:manual
```

**What it does:**
- Opens 2 browser windows with media permissions pre-granted
- Navigates both to the PerkChat app
- Provides step-by-step testing instructions
- Logs console messages from both windows
- Keeps browsers open for manual interaction

### Full Automated Test (Coming Soon)

```bash
npm run test:call:auto
```

**What it will do:**
- Complete end-to-end automated testing
- Creates test accounts
- Simulates call flow
- Verifies WebRTC connections
- Captures screenshots and logs

## 📋 Manual Testing Steps

### 1. User Setup

**Window 1 (Primary User):**
- Login with: `austinminecraft09@gmail.com` / `Austin09`

**Window 2 (Test User):**
- Create a new account with unique email/username
- OR login with existing secondary account

### 2. Contact Management

1. Both users go to **Contacts** page
2. User 1 searches for User 2's username
3. User 1 sends friend request
4. User 2 accepts the friend request
5. Verify both users appear in each other's contact lists

### 3. Voice Call Testing

**Initiate Call:**
1. User 1 clicks "Voice call" button next to User 2's name
2. Verify call interface appears on User 1's screen
3. Verify call notification appears on User 2's screen

**Answer Call:**
1. User 2 clicks "Answer" button
2. Verify call connects on both sides
3. Check call duration timer starts

**During Call:**
- Test mute/unmute functionality
- Verify call status updates (initiating → ringing → connected)
- Check that other call buttons are disabled during active call
- Test call minimize/expand functionality

**End Call:**
1. Either user clicks "End call" button
2. Verify call ends on both sides
3. Check call session is properly recorded in database

## ✅ Test Checklist

### Pre-Call
- [ ] Both users logged in successfully
- [ ] Contact requests sent/accepted
- [ ] Voice call button visible and enabled
- [ ] Microphone permissions granted

### Call Initiation
- [ ] Call interface appears for caller
- [ ] Call notification appears for recipient
- [ ] Call status shows "initiating" then "ringing"
- [ ] WebRTC signaling works through Supabase

### Active Call
- [ ] Call connects successfully
- [ ] Call status shows "connected"
- [ ] Duration timer works correctly
- [ ] Mute/unmute functionality works
- [ ] Audio streams established (simulated in test environment)
- [ ] Call interface responsive and functional

### Call Termination
- [ ] End call works from either side
- [ ] Call interface disappears
- [ ] Resources cleaned up properly
- [ ] Call session recorded with correct duration

### Error Scenarios
- [ ] Decline call works correctly
- [ ] Missed call handling
- [ ] Network disconnection handling
- [ ] Microphone permission denied handling

## 🔧 Technical Architecture

### Components Tested
- `CallStore`: State management and WebRTC coordination
- `CallInterface`: Active call UI and controls
- `CallNotification`: Incoming call notifications
- `ContactList`: Call initiation buttons
- `WebRTCManager`: Peer-to-peer connection handling

### Supabase Edge Functions
- `initiate-call`: Creates call sessions
- `answer-call`: Handles call acceptance
- `end-call`: Manages call termination
- `webrtc-signal`: Facilitates WebRTC signaling

### Database Tables
- `call_sessions`: Stores call metadata and status
- `conversations`: Links calls to chat conversations
- `profiles`: User information for call participants

## 🐛 Common Issues & Solutions

### Call Not Connecting
- Check browser console for WebRTC errors
- Verify Supabase Edge Functions are deployed
- Ensure microphone permissions granted
- Check network connectivity

### No Call Notification
- Verify Supabase Realtime is working
- Check if recipient is logged in
- Ensure call store subscriptions are active

### Audio Issues
- In test environment, audio is simulated
- For real testing, use actual devices with microphones
- Check browser audio settings

### Permission Issues
- Refresh page and re-grant microphone permissions
- Use HTTPS or localhost for microphone access
- Check browser security settings

## 📊 Test Results Structure

```
test-results/
├── user1-screenshot.png     # Caller's interface
├── user2-screenshot.png     # Recipient's interface
├── console-logs.txt         # Combined console output
└── test-report.json         # Automated test results
```

## 🚀 Advanced Testing

### Multiple Call Scenarios
- Test call rejection
- Test simultaneous incoming calls
- Test call during existing conversation
- Test network interruption recovery

### Performance Testing
- Call setup time measurement
- WebRTC connection establishment time
- Memory usage during calls
- Battery impact on mobile devices

### Cross-Browser Testing
- Chrome/Chromium support
- Safari WebRTC compatibility
- Firefox functionality
- Mobile browser testing

---

## 📝 Notes

- Test environment uses fake media streams for consistent testing
- Real microphone testing requires actual devices
- WebRTC connections are peer-to-peer after signaling
- Call data is stored in Supabase for persistence

**Happy Testing! 🎉** 