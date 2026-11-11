function createRateLimit(maxPerMinute) {
  const timestamps = [];

  return () => {
    const now = performance.now();
    while (timestamps.length && now - timestamps[0] >= 60_000) timestamps.shift();
    if (timestamps.length >= maxPerMinute) return false;
    timestamps.push(now);
    return true;
  };
}

module.exports = createRateLimit;
