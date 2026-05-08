const crypto = require("crypto");

module.exports = (prisma) => {
  return async (req, res, next) => {
    const apiKey = req.headers["x-api-key"];
    const apiSecret = req.headers["x-api-secret"];

    // 1. Validate headers
    if (!apiKey || !apiSecret) {
      return res.status(401).json({ error: "API key + secret required" });
    }

    // 2. Fetch API key
    const keyData = await prisma.apiKey.findUnique({
      where: { apiKey },
      include: { user: true },
    });

    if (!keyData || !keyData.isActive) {
      return res.status(403).json({ error: "Invalid API key" });
    }

    // 3. Hash incoming secret
    const incomingHash = crypto
      .createHash("sha256")
      .update(apiSecret.trim())
      .digest("hex");

    // 4. Compare safely
    if (incomingHash !== keyData.apiSecretHash) {
      return res.status(403).json({ error: "Invalid API secret" });
    }

    // 5. Attach user
    req.user = keyData.user;
    req.apiKey = keyData;

    next();
  };
};