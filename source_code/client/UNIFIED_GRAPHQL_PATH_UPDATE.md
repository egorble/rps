# Unified GraphQL Path Structure Implementation

## Overview
This document explains the implementation of the unified GraphQL path structure for the rps-linera.xyz domain, where all chain requests are routed under the GraphQL path as `https://rps-linera.xyz/graphql/chains/{chainId}/applications/{appId}`.

## Changes Made

### 1. LineraGameClient.js Updates

#### Constants Updated:
- Added `GRAPHQL_URL` constant: `https://rps-linera.xyz/graphql`
- Updated all endpoint construction to use the unified path structure

#### Key Method Changes:

1. **initializePlayer()**:
   - Changed OpenChain mutation endpoint from `BASE_URL` to `GRAPHQL_URL`
   - Now sends mutations to `https://rps-linera.xyz/graphql` instead of directly to chain endpoints

2. **Endpoint Helper Methods**:
   - `getPlayerChainEndpoint()`: Now returns `https://rps-linera.xyz/graphql/chains/{chainId}/applications/{appId}`
   - `getReadChainEndpoint()`: Now returns `https://rps-linera.xyz/graphql/chains/{chainId}/applications/{appId}`

#### Benefits:
- All GraphQL requests now follow a consistent path structure
- Prevents path conflicts with the main GraphQL endpoint
- Aligns with standard GraphQL API design patterns
- Improves maintainability and clarity of request routing

### 2. Stress Test Script Update

#### Endpoint Configuration:
- Updated `ENDPOINT` constant to use unified GraphQL path:
  - From: `https://rps-linera.xyz/chains/...`
  - To: `https://rps-linera.xyz/graphql/chains/...`

### 3. Path Structure Implementation

#### New URL Patterns:
1. **OpenChain Mutation**: `https://rps-linera.xyz/graphql`
2. **Player Chain Requests**: `https://rps-linera.xyz/graphql/chains/{playerChainId}/applications/{appId}`
3. **Read Chain Requests**: `https://rps-linera.xyz/graphql/chains/{readChainId}/applications/{appId}`
4. **WebSocket Connection**: `wss://rps-linera.xyz/ws`

#### Example Request Paths:
```
# OpenChain mutation (special case - goes directly to /graphql)
POST https://rps-linera.xyz/graphql

# Room creation on read chain
POST https://rps-linera.xyz/graphql/chains/349cb0da052a21eb26879aae2893fde1a1d1c14bca3894b09d1bdc6f60ec8bc4/applications/39f4c13960411fb384018674e20706bb81d728905937fb3d6d61149e94d9de85

# Player-specific operations
POST https://rps-linera.xyz/graphql/chains/{playerChainId}/applications/39f4c13960411fb384018674e20706bb81d728905937fb3d6d61149e94d9de85

# WebSocket notifications
wss://rps-linera.xyz/ws
```

## Implementation Details

### Request Routing Logic:
1. **OpenChain Mutation**: Special case that goes directly to the GraphQL endpoint
2. **All Other Operations**: Use the chain-specific path under the GraphQL endpoint
3. **WebSocket**: Maintains separate endpoint for real-time notifications

### Nginx Configuration Compatibility:
The updated path structure is compatible with the Nginx configuration that:
- Routes `/graphql` requests to the Linera service
- Routes `/graphql/chains/` requests with proper path forwarding
- Maintains WebSocket support at `/ws`

## Testing Verification

### Verified Endpoints:
- ✅ OpenChain mutation at `https://rps-linera.xyz/graphql`
- ✅ Room creation at `https://rps-linera.xyz/graphql/chains/...`
- ✅ Player operations at `https://rps-linera.xyz/graphql/chains/...`
- ✅ WebSocket connections at `wss://rps-linera.xyz/ws`

## Benefits of Unified Path Structure

1. **Consistency**: All chain requests follow the same URL pattern
2. **Scalability**: Easy to add new chain operations under the same structure
3. **Maintainability**: Clear separation between GraphQL endpoint and chain paths
4. **Security**: Prevents path conflicts and ensures proper request routing
5. **Standards Compliance**: Follows common GraphQL API design patterns

This implementation ensures that all chain requests are properly routed through the GraphQL endpoint while maintaining compatibility with the existing application functionality.