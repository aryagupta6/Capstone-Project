
module.exports = (prisma) => {
  return async (req, res, next) => {
    console.log("🔥 LOGGER HIT"); // ADD THIS
    const start = Date.now();

    res.on("finish", async () => {
      console.log("🔥 RESPONSE FINISHED"); // ADD THIS
      try {
        console.log("➡️ Logging request:", req.originalUrl);

        console.log("User:", req.user);
        console.log("ApiKey:", req.apiKey);

        await prisma.apiLog.create({
          data: {
            userId: req.user?.id || 7,       // fallback for testing
            apiKeyId: req.apiKey?.id || 1,   // fallback for testing
            endpoint: req.originalUrl,
            responseTime: Date.now() - start,
            statusCode: res.statusCode,
          },
        });

        console.log("✅ Log saved");
      } catch (err) {
        console.error("❌ Logging error:", err.message);
      }
    });

    next();
  };
};