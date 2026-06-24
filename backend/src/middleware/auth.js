const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "supersecretjwtkey_villageapi_9821";

module.exports = (prisma) => {
  return async (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const apiKey = req.headers["x-api-key"];
    const apiSecret = req.headers["x-api-secret"];

    // 1. Check for Dashboard JWT Token Session (Bearer token)
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
        });

        if (user) {
          // Verify status
          if (user.status !== "ACTIVE" && user.role !== "ADMIN") {
            return res.status(403).json({ error: `Account status is ${user.status}` });
          }

          req.user = user;
          // Set key to null since this is a dashboard session, not a programmatic key request
          req.apiKey = null; 
          return next();
        }
      } catch (err) {
        // Token invalid or expired: fall through to check API Key
        console.log("JWT verification failed in auth middleware:", err.message);
      }
    }

    // 2. Validate API key + secret headers for programmatic requests
    if (!apiKey || !apiSecret) {
      return res.status(401).json({ error: "API key + secret or Authorization Bearer token required" });
    }

    // 3. Fetch API key
    const keyData = await prisma.apiKey.findUnique({
      where: { apiKey },
      include: { user: true },
    });

    if (!keyData || !keyData.isActive) {
      return res.status(403).json({ error: "Invalid API key" });
    }

    // 4. Hash incoming secret
    const incomingHash = crypto
      .createHash("sha256")
      .update(apiSecret.trim())
      .digest("hex");

    // 5. Compare safely
    if (incomingHash !== keyData.apiSecretHash) {
      return res.status(403).json({ error: "Invalid API secret" });
    }

    // 6. Attach user and key info to request context
    req.user = keyData.user;
    req.apiKey = keyData;

    next();
  };
};