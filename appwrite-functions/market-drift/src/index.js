const { Client, Databases, ID, Query } = require("node-appwrite");
const fetch = require("node-fetch");

module.exports = async (req, res, context) => {
  const log = context?.log || console.log;
  const logError = context?.error || console.error;

  const startTime = Date.now();

  try {
    log("Market drift function started");

    // Initialize client inside handler to ensure env vars are loaded
    const client = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT)
      .setProject(process.env.APPWRITE_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);

    // Query all stocks (handle pagination)
    log("Querying all stocks from database");
    const allStocks = [];
    let offset = 0;
    const limit = 100; // Appwrite max limit
    const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    while (true) {
      const stocksResponse = await databases.listDocuments(
        process.env.APPWRITE_DATABASE_ID,
        "stocks",
        [Query.limit(limit), Query.offset(offset)]
      );

      log(
        `Fetched ${stocksResponse.documents.length} stocks (offset=${offset}) of total=${stocksResponse.total}`
      );
      allStocks.push(...stocksResponse.documents);

      // If response.total is available use it to determine completion, otherwise fall back to page size
      const total = stocksResponse.total ?? 0;
      if (total > 0) {
        if (offset + stocksResponse.documents.length >= total) break;
      } else if (stocksResponse.documents.length < limit) {
        break;
      }

      offset += stocksResponse.documents.length || limit;

      // Brief pause between pages to avoid rate limiting
      await pause(100);
    }

    const totalStocks = allStocks.length;
    log(`Found ${totalStocks} stocks to update`);

    const BATCH_SIZE = Number(process.env.DRIFT_BATCH_SIZE) || 10; // Process in batches (smaller default to avoid rate limits)
    let processedCount = 0;
    const CHUNK_PAUSE_MS = Number(process.env.DRIFT_CHUNK_PAUSE_MS) || 300; // pause between concurrency chunks
    const BATCH_PAUSE_MS = Number(process.env.DRIFT_BATCH_PAUSE_MS) || 2000; // pause between batches

    // Process stocks in batches
    for (let i = 0; i < totalStocks; i += BATCH_SIZE) {
      const batch = allStocks.slice(i, i + BATCH_SIZE);
      log(
        `Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(
          totalStocks / BATCH_SIZE
        )} (${batch.length} stocks)`
      );

      // Process each stock in the batch with limited concurrency and retries to handle rate limits.
      const CONCURRENCY = Number(process.env.DRIFT_CONCURRENCY) || 5;
      const MAX_RETRIES = Number(process.env.DRIFT_MAX_RETRIES) || 3;
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      const backoffMs = (attempt) =>
        Math.min(2000, 200 * Math.pow(2, attempt)) +
        Math.floor(Math.random() * 100);

      const retryWithBackoff = async (fn, retries = MAX_RETRIES) => {
        let attempt = 0;
        while (true) {
          try {
            return await fn();
          } catch (err) {
            attempt++;
            const code = err?.code || err?.status || err?.statusCode;
            // Retry on transient HTTP/SDK errors (429, 500, 502, 503) or when no retries left, rethrow
            if (
              attempt > retries ||
              (code && ![429, 500, 502, 503].includes(Number(code)))
            ) {
              throw err;
            }
            const ms = backoffMs(attempt);
            log(
              `Transient error (attempt ${attempt}/${retries}) - retrying in ${ms}ms:`,
              err?.message || err
            );
            await sleep(ms);
          }
        }
      };

      const processStock = async (stock) => {
        // Apply random drift (e.g., -5% to +5%)
        const drift = (Math.random() - 0.5) * 0.1; // Adjust range as needed
        const newPrice = Math.max(0.01, stock.currentPrice * (1 + drift));

        // Update stock price with retry
        await retryWithBackoff(() =>
          databases.updateDocument(
            process.env.APPWRITE_DATABASE_ID,
            "stocks",
            stock.$id,
            { currentPrice: newPrice }
          )
        );

        // Log price history (create a new document in price_history) so drift changes are persisted.
        try {
          await retryWithBackoff(() =>
            databases.createDocument(
              process.env.APPWRITE_DATABASE_ID,
              "price_history",
              ID.unique(),
              {
                stockId: stock.$id,
                price: newPrice,
                timestamp: new Date().toISOString(),
              }
            )
          );
          log(`Price history saved for ${stock.characterName}: ${newPrice}`);
        } catch (priceHistoryError) {
          logError(
            `Failed to save price history for ${stock.characterName}:`,
            priceHistoryError
          );
          // Continue processing even if price history fails
        }

        processedCount++;
      };

      // Run stocks in chunks with the configured concurrency
      for (let i = 0; i < batch.length; i += CONCURRENCY) {
        const chunk = batch.slice(i, i + CONCURRENCY);
        await Promise.all(
          chunk.map((stock) =>
            processStock(stock).catch((err) => {
              // Log and continue
              logError(`Failed processing stock ${stock.$id}`, err);
            })
          )
        );

        // small pause between chunks to avoid bursts
        if (i + CONCURRENCY < batch.length) {
          log(`Pausing ${CHUNK_PAUSE_MS}ms between chunks to avoid bursts`);
          await sleep(CHUNK_PAUSE_MS);
        }
      }

      // Pause between batches to give the API breathing room
      if (i + BATCH_SIZE < totalStocks) {
        log(
          `Completed batch ${
            Math.floor(i / BATCH_SIZE) + 1
          }. Pausing ${BATCH_PAUSE_MS}ms before next batch.`
        );
        await sleep(BATCH_PAUSE_MS);
      }

      // Small delay between batches to avoid overwhelming the API
      if (i + BATCH_SIZE < totalStocks) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    const duration = Date.now() - startTime;
    log(
      `Market drift completed. Updated ${processedCount}/${totalStocks} stocks in ${duration}ms`
    );

    // Upsert last drift timestamp to metadata collection so clients can sync
    try {
      const metadataCollection = "metadata";
      const lastDriftKey = "market_last_drift";
      const nowMs = Date.now();

      const listResp = await databases.listDocuments(
        process.env.APPWRITE_DATABASE_ID,
        metadataCollection
      );
      const existing = (listResp.documents || []).find(
        (d) => d.key === lastDriftKey
      );

      const payload = {
        key: lastDriftKey,
        value: nowMs,
        updatedAt: new Date().toISOString(),
      };

      if (existing) {
        try {
          await databases.updateDocument(
            process.env.APPWRITE_DATABASE_ID,
            metadataCollection,
            existing.$id,
            payload
          );
        } catch (metaErr) {
          logError("Failed to update last drift metadata:", metaErr);
        }
      } else {
        try {
          await databases.createDocument(
            process.env.APPWRITE_DATABASE_ID,
            metadataCollection,
            ID.unique(),
            payload
          );
        } catch (metaErr) {
          logError("Failed to create last drift metadata:", metaErr);
        }
      }
    } catch (metaError) {
      logError("Error upserting last drift metadata:", metaError);
    }

    // Send system event for market drift completion
    try {
      const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
      const systemEventResponse = await fetch(`${siteUrl}/api/system-events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "market_drift_completed",
          userId: "system", // System event, not tied to a specific user
          metadata: {
            stocksProcessed: processedCount,
            totalStocks: totalStocks,
            duration: duration,
            timestamp: new Date().toISOString(),
          },
        }),
      });

      if (systemEventResponse.ok) {
        log("System event sent successfully");
      } else {
        logError("Failed to send system event:", systemEventResponse.status);
      }
    } catch (eventError) {
      logError("Error sending system event:", eventError);
    }

    return {
      success: true,
      message: `Market drift completed. Updated ${processedCount}/${totalStocks} stocks`,
      stocksProcessed: processedCount,
      totalStocks: totalStocks,
      duration: duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    logError(`Market drift error after ${duration}ms:`, error);
    return { error: "Internal server error" };
  }
};
