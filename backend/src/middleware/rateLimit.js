module.exports = (prisma) => {
  return async (req, res, next) => {
    try {
      const user = req.user;

      // ⏱ last 24 hours
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const requestCount = await prisma.apiLog.count({
        where: {
          userId: user.id,
          createdAt: {
            gte: since,
          },
        },
      });

      // 🎯 plan limits
      const limits = {
        FREE: 100,
        PRO: 10000,
        ENTERPRISE: Infinity,
      };

      const userLimit = limits[user.planType] || 100;

      if (requestCount >= userLimit) {
        return res.status(429).json({
          error: "Rate limit exceeded",
        });
      }

      next();
    } catch (err) {
      console.error("Rate limit error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  };
};