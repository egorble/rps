# Stress Test for Room Creation

This stress test script sends room creation mutations to the Linera blockchain endpoint at a controlled rate.

## Configuration

The stress test is configured to:
- Send 1 transaction per second
- Target endpoint: `http://62.72.35.202:8080/chains/9457a192e095a93b01342102a43c251fc551026167440ba238a881a8dc153a20/applications/fc34d424ce0af74314a1003b09a29b6ba5990e50ac37f6ae3b84b85b1f7a3f64`
- Generate unique room IDs for each request
- Log results and statistics

## Running the Stress Test

1. Make sure you're in the `client` directory:
   ```
   cd source_code/client
   ```

2. Install dependencies (if not already done):
   ```
   npm install
   ```

3. Run the stress test:
   ```
   npm run stress-test
   ```

## Stopping the Test

Press `Ctrl+C` to gracefully stop the stress test. The script will display a summary of results including:
- Total execution time
- Number of successful transactions
- Number of failed transactions
- Average transactions per second

## Monitoring Results

The script will output:
- Each successful room creation with its ID
- Any errors encountered
- Periodic statistics every 10 transactions
- Final summary when stopped

## Customization

To modify the transaction rate, edit the `stress-test.js` file and adjust:
- `TRANSACTIONS_PER_SECOND` - Number of transactions per second
- `INTERVAL` - Interval in milliseconds between transactions (1000ms = 1 second for 1 TPS)