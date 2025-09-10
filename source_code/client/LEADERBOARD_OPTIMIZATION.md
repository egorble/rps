# Leaderboard Optimization Implementation

## Overview
Optimized the leaderboard component to prevent unnecessary re-renders and improve performance during high-frequency updates.

## Key Optimizations Implemented

### 1. Memoization with `useMemo`
- Memoized the sorted leaderboard data to prevent re-computation on every render
- Only recalculates when the source leaderboard data actually changes

### 2. Smart Data Diffing
- Implemented a diffing algorithm that compares new data with existing data
- Only updates entries that have actually changed
- Maintains reference equality for unchanged entries to prevent unnecessary re-renders

### 3. Debounced Updates
- Added a 300ms debounce to prevent too frequent updates from WebSocket notifications
- Queues rapid updates and processes them at a controlled rate
- Prevents UI freezing during high transaction flow

### 4. useCallback Optimization
- Wrapped functions in `useCallback` to prevent recreation on every render
- Ensures stable function references for child components

### 5. Efficient Rendering
- Moved sorting logic out of the render phase to prevent repeated computations
- Used proper React patterns to minimize DOM updates

## How It Works

### Data Comparison Logic
```javascript
// Create a map of existing entries for quick lookup
const prevEntriesMap = new Map(prevLeaderboard.map(entry => [entry.chainId, entry]));

// Check if data has actually changed
let hasChanges = false;
const updatedLeaderboard = newLeaderboard.map(newEntry => {
  const prevEntry = prevEntriesMap.get(newEntry.chainId);
  
  // If entry doesn't exist or has changed, update it
  if (!prevEntry || 
      prevEntry.totalGames !== newEntry.totalGames ||
      prevEntry.wins !== newEntry.wins ||
      prevEntry.losses !== newEntry.losses ||
      prevEntry.playerName !== newEntry.playerName) {
    hasChanges = true;
    return newEntry;
  }
  
  // Otherwise, keep the previous entry to maintain reference equality
  return prevEntry;
});

// If no changes, return the previous array to maintain reference equality
return hasChanges ? updatedLeaderboard : prevLeaderboard;
```

### Debouncing Mechanism
```javascript
const debouncedFetchLeaderboard = useCallback(() => {
  const now = Date.now();
  const timeSinceLastUpdate = now - lastUpdateTimestamp.current;
  
  // Minimum 300ms between updates
  if (timeSinceLastUpdate < 300) {
    // Clear existing timeout and schedule update for later
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    
    updateTimeoutRef.current = setTimeout(() => {
      lastUpdateTimestamp.current = Date.now();
      fetchLeaderboard();
    }, 300 - timeSinceLastUpdate);
  } else {
    // Update immediately
    lastUpdateTimestamp.current = now;
    fetchLeaderboard();
  }
}, [fetchLeaderboard]);
```

## Benefits

1. **Reduced CPU Usage**: Prevents unnecessary computations during high-frequency updates
2. **Smaller Memory Footprint**: Maintains reference equality for unchanged data
3. **Smoother UI**: Debouncing prevents UI freezing during rapid updates
4. **Better User Experience**: Maintains responsiveness even during high transaction flow
5. **Optimized Rendering**: Only re-renders when data actually changes

## Performance Impact

- **Before**: Full re-render on every WebSocket notification, regardless of data changes
- **After**: Selective updates only for changed data with rate limiting

The optimized implementation ensures that the leaderboard remains responsive and efficient even during periods of high blockchain activity.