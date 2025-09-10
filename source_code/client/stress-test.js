// Stress test script for creating rooms on Linera blockchain
// Sends 1 room creation mutation per second to the specified endpoint

const axios = require('axios');

// Configuration
const ENDPOINT = 'http://62.72.35.202:8080/chains/349cb0da052a21eb26879aae2893fde1a1d1c14bca3894b09d1bdc6f60ec8bc4/applications/39f4c13960411fb384018674e20706bb81d728905937fb3d6d61149e94d9de85';
const TRANSACTIONS_PER_SECOND = 2;
const INTERVAL = 500; // 1000ms = 1 second

// Helper function to generate UUID
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Function to create a room
async function createRoom() {
  const roomId = generateUUID();
  
  const mutation = `
    mutation {
      createRoom(private: false, roomId: "${roomId}")
    }
  `;

  try {
    const response = await axios.post(ENDPOINT, {
      query: mutation
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 5000 // 5 second timeout
    });

    if (response.data.errors) {
      console.error(`Error creating room ${roomId}:`, response.data.errors[0].message);
      return false;
    }

    console.log(`Successfully created room ${roomId}:`, response.data.data.createRoom);
    return true;
  } catch (error) {
    console.error(`Failed to create room ${roomId}:`, error.message);
    return false;
  }
}

// Main stress test function
async function runStressTest() {
  let successCount = 0;
  let errorCount = 0;
  const startTime = Date.now();

  console.log(`Starting stress test: ${TRANSACTIONS_PER_SECOND} transaction(s) per second`);
  console.log(`Target endpoint: ${ENDPOINT}`);
  console.log('Press Ctrl+C to stop the test\n');

  const intervalId = setInterval(async () => {
    try {
      const success = await createRoom();
      if (success) {
        successCount++;
      } else {
        errorCount++;
      }
      
      // Log stats every 10 transactions
      const totalTransactions = successCount + errorCount;
      if (totalTransactions % 10 === 0) {
        const elapsedTime = (Date.now() - startTime) / 1000; // in seconds
        console.log(`Stats - Time: ${elapsedTime.toFixed(1)}s, Success: ${successCount}, Errors: ${errorCount}`);
      }
    } catch (error) {
      console.error('Unexpected error in stress test loop:', error.message);
      errorCount++;
    }
  }, INTERVAL);

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\nStopping stress test...');
    clearInterval(intervalId);
    
    const endTime = Date.now();
    const totalTime = (endTime - startTime) / 1000; // in seconds
    const totalTransactions = successCount + errorCount;
    const avgTPS = totalTransactions / totalTime;
    
    console.log('\n=== Stress Test Results ===');
    console.log(`Total time: ${totalTime.toFixed(2)} seconds`);
    console.log(`Total transactions: ${totalTransactions}`);
    console.log(`Successful transactions: ${successCount}`);
    console.log(`Failed transactions: ${errorCount}`);
    console.log(`Average TPS: ${avgTPS.toFixed(2)}`);
    console.log('===========================\n');
    
    process.exit(0);
  });
}

// Run the stress test
runStressTest();