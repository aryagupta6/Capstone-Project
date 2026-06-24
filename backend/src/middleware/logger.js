module.exports = (prisma) => {
  return async (req, res, next) => {
    const start = Date.now();

    res.on("finish", async () => {
      try {
        // Only log programmatic requests that use an API Key
        if (!req.apiKey || !req.user) {
          return;
        }

        await prisma.apiLog.create({
          data: {
            userId: req.user.id,
            apiKeyId: req.apiKey.id,
            endpoint: req.originalUrl,
            responseTime: Date.now() - start,
            statusCode: res.statusCode,
          },
        });
      } catch (err) {
        console.error("❌ Logging error:", err.message);
      }
    });

    next();
  };
};