/**
 * Supabase Query Helpers with Timeout and Logging
 */

// Debug logger
const log = (message, data = null) => {
  const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
  const prefix = `[QUERY ${timestamp}]`;
  if (data) {
    console.log(prefix, message, data);
  } else {
    console.log(prefix, message);
  }
};

/**
 * Wraps a Supabase query with a timeout.
 * If the query doesn't complete within the timeout, it rejects with 'Query timeout'.
 *
 * @param {Promise} promise - The Supabase query promise
 * @param {number} ms - Timeout in milliseconds (default 5000)
 * @param {string} label - Optional label for logging
 * @returns {Promise} - Resolves with query result or rejects on timeout
 */
export const withTimeout = (promise, ms = 5000, label = 'unnamed') => {
  const startTime = Date.now();
  log(`Starting query: ${label}`);

  const timeout = new Promise((_, reject) => {
    setTimeout(() => {
      log(`TIMEOUT after ${ms}ms: ${label}`);
      reject(new Error('Query timeout'));
    }, ms);
  });

  return Promise.race([promise, timeout]).then(result => {
    const duration = Date.now() - startTime;
    log(`Query completed in ${duration}ms: ${label}`, {
      hasData: !!result?.data,
      hasError: !!result?.error,
      rowCount: result?.data?.length ?? (result?.data ? 1 : 0)
    });
    return result;
  }).catch(err => {
    const duration = Date.now() - startTime;
    log(`Query failed after ${duration}ms: ${label}`, { error: err.message });
    throw err;
  });
};

/**
 * Wraps a Supabase query with timeout and auto-refresh on timeout.
 * If query times out, refreshes the page (with cooldown to prevent loops).
 *
 * @param {Promise} promise - The Supabase query promise
 * @param {number} ms - Timeout in milliseconds (default 5000)
 * @param {string} label - Optional label for logging
 * @returns {Promise} - Resolves with query result or triggers refresh
 */
export const withTimeoutAndRefresh = async (promise, ms = 5000, label = 'unnamed') => {
  try {
    return await withTimeout(promise, ms, label);
  } catch (err) {
    if (err.message === 'Query timeout') {
      // Check if we already refreshed recently (30 second cooldown)
      const lastRefresh = sessionStorage.getItem('queryRefreshTime');
      const now = Date.now();

      if (!lastRefresh || now - parseInt(lastRefresh) > 30000) {
        log(`Auto-refreshing page due to timeout: ${label}`);
        sessionStorage.setItem('queryRefreshTime', now.toString());
        window.location.reload();
        // Return a never-resolving promise to prevent further execution
        return new Promise(() => {});
      } else {
        const timeSinceRefresh = Math.round((now - parseInt(lastRefresh)) / 1000);
        log(`Skipping auto-refresh (cooldown), last refresh was ${timeSinceRefresh}s ago: ${label}`);
      }
    }
    throw err;
  }
};

/**
 * Wraps a Supabase query with timeout but NO auto-refresh.
 * Use this when you want to handle timeout gracefully without page reload.
 *
 * @param {Promise} promise - The Supabase query promise
 * @param {number} ms - Timeout in milliseconds (default 5000)
 * @param {string} label - Optional label for logging
 * @returns {Promise} - Resolves with query result or { data: null, error: { message: 'Query timeout' } }
 */
export const withTimeoutSafe = async (promise, ms = 5000, label = 'unnamed') => {
  try {
    return await withTimeout(promise, ms, label);
  } catch (err) {
    if (err.message === 'Query timeout') {
      log(`Returning safe timeout response: ${label}`);
      return { data: null, error: { message: 'Query timeout' } };
    }
    throw err;
  }
};
