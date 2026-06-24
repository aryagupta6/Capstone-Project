const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "supersecretjwtkey_villageapi_9821";

module.exports = (prisma) => {
  return async (req, res, next) => {
    const authHeader = req.headers["authorization"];
    if (!authHeader) {
      return res.status(401).json({ error: "Authorization header required" });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Access token required" });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
      });

      if (!user) {
        return res.status(401).json({ error: "User no longer exists" });
      }

      if (user.status !== "ACTIVE" && user.role !== "ADMIN") {
        return res.status(403).json({ error: `Account status is ${user.status}. Please wait for admin approval.` });
      }

      req.user = user;
      next();
    } catch (err) {
      return res.status(401).json({ error: "Invalid or expired session token" });
    }
  };
};
