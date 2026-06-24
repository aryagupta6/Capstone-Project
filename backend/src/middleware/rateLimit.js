const cache = require("../utils/cache");

const DAILY_LIMITS = {
  FREE: 5000,
  PREMIUM: 50000,
  PRO: 300000,
  UNLIMITED: 1000000,
};

const BURST_LIMITS = {
  FREE: 100,
  PREMIUM: 500,
  PRO: 2000,
  UNLIMITED: 5000,
};

module.exports = (prisma) => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const plan = (user.planType || "FREE").toUpperCase();
      const dailyLimit = DAILY_LIMITS[plan] || 5000;
      const burstLimit = BURST_LIMITS[plan] || 100;

      const now = new Date();
      const todayStr = now.toISOString().split("T")[0];
      const currentMinute = Math.floor(Date.now() / 60000);

      const dailyKey = `rate:daily:${user.id}:${todayStr}`;
      const burstKey = `rate:burst:${user.id}:${currentMinute}`;

      // Get current counts from cache
      let dailyCount = Number(await cache.get(dailyKey)) || 0;
      let burstCount = Number(await cache.get(burstKey)) || 0;

      // Check limits
      if (burstCount >= burstLimit) {
        return res.status(429).json({
          error: "Rate limit exceeded (burst limit reached)",
        });
      }

      if (dailyCount >= dailyLimit) {
        return res.status(429).json({
          error: "Rate limit exceeded (daily quota reached)",
        });
      }

      // Increment counts (Daily expires in 24 hours, Burst expires in 1 minute)
      dailyCount += 1;
      burstCount += 1;

      // Set to cache
      await cache.set(dailyKey, String(dailyCount), 86400);
      await cache.set(burstKey, String(burstCount), 60);

      // Calculate rate limit headers
      const tomorrow = new Date(todayStr);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const resetTime = Math.floor(tomorrow.getTime() / 1000);

      res.setHeader("X-RateLimit-Limit", dailyLimit);
      res.setHeader("X-RateLimit-Remaining", Math.max(dailyLimit - dailyCount, 0));
      res.setHeader("X-RateLimit-Reset", resetTime);

      next();
    } catch (err) {
      console.error("Rate limit middleware error:", err);
      // Fallback: don't block the request if cache fails
      next();
    }
  };
};