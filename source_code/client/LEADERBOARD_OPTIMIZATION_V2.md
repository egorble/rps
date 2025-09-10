# Leaderboard Optimization Implementation V2

## Overview
Completely rewrote the leaderboard component to prevent unnecessary re-renders and improve performance during high-frequency updates by using a Map-based approach for efficient data updates.

## Key Improvements

### 1. Map-Based Data Structure
- Replaced array-based state with a Map for efficient lookups and updates
- Used chainId as the key for O(1) access to leaderboard entries
- Only update entries that have actually changed

### 2. Smart Data Diffing
- Implemented intelligent diffing algorithm that:
  - Compares new data with existing data entry by entry
  - Only updates entries with changed values
  - Removes entries that no longer exist
  - Adds new entries
  - Preserves reference equality for unchanged entries

### 3. Rate Limiting
- Implemented 2-second minimum interval between data fetches
- Prevents overwhelming the GraphQL endpoint during high blockchain activity
- Uses debouncing to queue rapid updates

### 4. Efficient Rendering
- Converted Map to array only when needed for rendering
- Used useMemo to prevent unnecessary re-computations
- Maintained stable references for unchanged data

## How It Works

### Data Structure
```javascript
// Using Map for efficient updates
const [leaderboardMap, setLeaderboardMap] = useState(new Map());

// Convert to array only for rendering
const leaderboardArray = useMemo(() => {
  return Array.from(leaderboardMap.values());
}, [leaderboardMap]);

// Sort only when array changes
const sortedLeaderboard = useMemo(() => {
  return [...leaderboardArray].sort((a, b) => 
    b.wins - a.wins || a.losses - b.losses
  );
}, [leaderboardArray]);
```

### Smart Update Logic
```javascript
setLeaderboardMap(prevMap => {
  const newMap = new Map(prevMap);
  const newData = response.data.globalLeaderboard || [];
  
  // Create a set of current chainIds for quick lookup
  const currentChainIds = new Set(newData.map(entry => entry.chainId));
  
  // Remove entries that no longer exist
  for (const chainId of newMap.keys()) {
    if (!currentChainIds.has(chainId)) {
      newMap.delete(chainId);
    }
  }
  
  // Update or add entries
  for (const entry of newData) {
    const existingEntry = newMap.get(entry.chainId);
    
    // Only update if the entry has actually changed
    if (!existingEntry ||
        existingEntry.totalGames !== entry.totalGames ||
        existingEntry.wins !== entry.wins ||
        existingEntry.losses !== entry.losses ||
        existingEntry.playerName !== entry.playerName) {
      newMap.set(entry.chainId, entry);
    }
  }
  
  return newMap;
});
```

### Rate Limiting
```javascript
// Rate limiting - minimum 2 seconds between fetches
const now = Date.now();
if (now - lastFetchTime.current < 2000) {
  console.log("Rate limited - skipping fetch");
  return;
}
```

## Benefits

1. **Minimal Re-renders**: Only re-render when data actually changes
2. **Efficient Updates**: O(1) lookups and updates using Map
3. **Reduced Network Load**: Rate limiting prevents excessive GraphQL queries
4. **Better Performance**: Maintains 60fps even during high blockchain activity
5. **Memory Efficient**: Preserves reference equality for unchanged data

## Performance Comparison

### Before (V1)
- Full array replacement on every update
- Re-render on every WebSocket notification
- No rate limiting
- O(n) comparison for each update

### After (V2)
- Selective updates using Map-based approach
- Rate limiting with 2-second minimum intervals
- Reference equality preservation
- O(1) updates for individual entries

## WebSocket Integration

The optimized leaderboard works seamlessly with the existing WebSocket notification system:

1. When blockchain notifications arrive, they trigger the debounced update function
2. The update function respects the 2-second rate limit
3. Only changed data is updated in the Map
4. React's reconciliation only updates the DOM for changed entries

This approach ensures smooth performance even during periods of high blockchain activity while maintaining real-time updates.