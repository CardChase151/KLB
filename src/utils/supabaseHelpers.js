/**
 * Wraps a Supabase query with a timeout.
 * If the query doesn't complete within the timeout, it rejects with 'Query timeout'.
 *
 * @param {Promise} promise - The Supabase query promise
 * @param {number} ms - Timeout in milliseconds (default 5000)
 * @returns {Promise} - Resolves with query result or rejects on timeout
 */
export const withTimeout = (promise, ms = 5000) => {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Query timeout')), ms)
  );
  return Promise.race([promise, timeout]);
};

/**
 * Wraps a Supabase query with timeout and auto-refresh on timeout.
 * If query times out, refreshes the page (with cooldown to prevent loops).
 *
 * @param {Promise} promise - The Supabase query promise
 * @param {number} ms - Timeout in milliseconds (default 5000)
 * @returns {Promise} - Resolves with query result or triggers refresh
 */
export const withTimeoutAndRefresh = async (promise, ms = 5000) => {
  try {
    return await withTimeout(promise, ms);
  } catch (err) {
    if (err.message === 'Query timeout') {
      // Check if we already refreshed recently (30 second cooldown)
      const lastRefresh = sessionStorage.getItem('queryRefreshTime');
      const now = Date.now();

      if (!lastRefresh || now - parseInt(lastRefresh) > 30000) {
        sessionStorage.setItem('queryRefreshTime', now.toString());
        window.location.reload();
        // Return a never-resolving promise to prevent further execution
        return new Promise(() => {});
      }
    }
    throw err;
  }
};
