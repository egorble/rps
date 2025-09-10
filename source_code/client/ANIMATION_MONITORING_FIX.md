# Animation Monitoring Fix Implementation

## Overview
Implemented a solution to pause WebSocket monitoring during animations to prevent interruptions, and resume monitoring once animations complete.

## Changes Made

### 1. SocketContext.js
- Added `isAnimating` state to track animation status
- Added effect to pause/resume WebSocket monitoring based on animation state
- Exposed `isAnimating` and `setIsAnimating` to context consumers

### 2. Room/index.jsx
- Updated animation logic to set `isAnimating` state during animations
- Set `isAnimating` to true when starting animation
- Set `isAnimating` to false when animation completes

### 3. LineraGameClient.js
- Added `isPaused` flag to track monitoring state
- Added `pendingNotifications` queue for notifications during pause
- Implemented `pauseMonitoring()` method to pause WebSocket monitoring
- Implemented `resumeMonitoring()` method to resume monitoring and process queued notifications
- Modified `handleBlockchainNotification()` to queue notifications when paused

## How It Works
1. When an animation starts in the Room component, `isAnimating` is set to true
2. The SocketContext detects this change and calls `lineraClient.pauseMonitoring()`
3. During pause, incoming blockchain notifications are queued instead of processed immediately
4. When animation completes, `isAnimating` is set to false
5. The SocketContext detects this change and calls `lineraClient.resumeMonitoring()`
6. Any queued notifications are processed, and normal monitoring resumes

## Benefits
- Prevents room state updates from interrupting ongoing animations
- Maintains responsiveness of the UI during high transaction flow
- Ensures smooth user experience without visual interruptions
- Processes all notifications in order, maintaining data consistency