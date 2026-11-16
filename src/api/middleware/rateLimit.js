const authRateLimitMap = new Map();

export const cleanExpiredRateLimitEntries = () => {
  const currentTimestamp = Date.now();
  for (const [rateLimitKey, rateLimitRecord] of authRateLimitMap.entries()) {
    if (currentTimestamp > rateLimitRecord.resetTimestamp) {
      authRateLimitMap.delete(rateLimitKey);
    }
  }
};

export const isRequestWithinRateLimit = (
  rateLimitKey,
  maximumRequestsAllowed = 10,
  timeWindowMilliseconds = 60 * 1000
) => {
  if (authRateLimitMap.size > 500) {
    cleanExpiredRateLimitEntries();
  }

  const currentTimestamp = Date.now();
  const existingRateLimitRecord = authRateLimitMap.get(rateLimitKey);

  if (!existingRateLimitRecord || currentTimestamp > existingRateLimitRecord.resetTimestamp) {
    authRateLimitMap.set(rateLimitKey, {
      requestCount: 1,
      resetTimestamp: currentTimestamp + timeWindowMilliseconds
    });
    return true;
  }

  if (existingRateLimitRecord.requestCount >= maximumRequestsAllowed) {
    return false;
  }

  existingRateLimitRecord.requestCount += 1;
  return true;
};
