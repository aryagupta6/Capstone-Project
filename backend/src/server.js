require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { PrismaClient } = require("@prisma/client");
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const path = require("path");
const fs = require("fs");

const cache = require("./utils/cache");

// ---------------- DB SETUP ----------------
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ---------------- MIDDLEWARE ----------------
const authMiddleware = require("./middleware/auth")(prisma);
const loggerMiddleware = require("./middleware/logger")(prisma);
const rateLimitMiddleware = require("./middleware/rateLimit")(prisma);
const dashboardAuth = require("./middleware/dashboardAuth")(prisma);
const adminCheck = require("./middleware/adminCheck")();

const JWT_SECRET = process.env.JWT_SECRET || "supersecretjwtkey_villageapi_9821";

// ---------------- APP ----------------
const app = express();
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  req.startTime = Date.now();
  next();
});

// ---------------- SECURITY HEADERS (Section 10.3) ----------------
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  res.setHeader("Content-Security-Policy", "default-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://unpkg.com; img-src 'self' data:; font-src 'self' data:;");
  next();
});

// Helper: State Access Helper
async function verifyStateAccess(user, stateCodeOrId) {
  if (user.role === "ADMIN" || user.planType === "PRO" || user.planType === "UNLIMITED") {
    return true;
  }

  const isNumeric = /^\d+$/.test(stateCodeOrId);
  const whereClause = isNumeric ? { id: Number(stateCodeOrId) } : { stateCode: String(stateCodeOrId) };
  
  const state = await prisma.state.findFirst({ where: whereClause });
  if (!state) return false;

  const access = await prisma.userStateAccess.findFirst({
    where: {
      userId: user.id,
      stateId: state.id,
    },
  });

  return !!access;
}

// Helper: Get Allowed State IDs for Restricted Users
async function getAllowedStateIds(user) {
  if (user.role === "ADMIN" || user.planType === "PRO" || user.planType === "UNLIMITED") {
    return null; // Null indicates full access
  }

  const access = await prisma.userStateAccess.findMany({
    where: { userId: user.id },
    select: { stateId: true },
  });

  return access.map((a) => a.stateId);
}

// ---------------- ROUTES ----------------
const router = express.Router();

// ---------------- HEALTH ----------------
router.get("/health", (req, res) => {
  res.json({ message: "Village API running 🚀", timestamp: new Date() });
});

// ---------------- REGISTER ----------------
router.post("/register", async (req, res) => {
  const { email, password, businessName, phone, gstNumber } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, error: "Email and password required" });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ success: false, error: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { 
        email, 
        passwordHash, 
        businessName, 
        phone,
        gstNumber,
        status: "PENDING_APPROVAL", // Section 9.1
        role: "USER"
      },
    });

    // Create session token (JWT)
    const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "24h" });

    res.json({
      success: true,
      data: { 
        userId: user.id, 
        email: user.email, 
        status: user.status, 
        role: user.role,
        token
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Registration failed" });
  }
});

// ---------------- LOGIN ----------------
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, error: "Email and password required" });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ success: false, error: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ success: false, error: "Invalid credentials" });
    }

    const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "24h" });

    res.json({
      success: true,
      data: { 
        userId: user.id, 
        email: user.email, 
        planType: user.planType, 
        role: user.role, 
        status: user.status,
        token 
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Login failed" });
  }
});

// ---------------- GEOGRAPHICAL DATA ENDPOINTS (Require API Key) ----------------

// STATES
router.get("/states", authMiddleware, loggerMiddleware, rateLimitMiddleware, async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const cacheKey = `geo:states:p:${page}:l:${limit}:u:${req.user.id}`;
  const cachedData = await cache.get(cacheKey);
  if (cachedData) {
    return res.json(JSON.parse(cachedData));
  }

  const allowedStateIds = await getAllowedStateIds(req.user);
  const whereClause = allowedStateIds ? { id: { in: allowedStateIds } } : {};

  const states = await prisma.state.findMany({
    where: whereClause,
    skip,
    take: Number(limit),
    select: {
      id: true,
      stateCode: true,
      stateName: true,
    },
  });

  const response = {
    success: true,
    data: states,
    meta: {
      page: Number(page),
      limit: Number(limit),
      count: states.length,
    },
  };

  await cache.set(cacheKey, JSON.stringify(response), 3600); // cache for 1hr
  res.json(response);
});

// DISTRICTS BY STATE (Path Parameter Route)
router.get("/states/:id/districts", authMiddleware, loggerMiddleware, rateLimitMiddleware, async (req, res) => {
  const { id } = req.params;
  const { page = 1, limit = 10 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const hasAccess = await verifyStateAccess(req.user, id);
  if (!hasAccess) {
    return res.status(403).json({ error: "ACCESS_DENIED: User not authorized for requested state" });
  }

  const cacheKey = `geo:districts:s:${id}:p:${page}:l:${limit}`;
  const cachedData = await cache.get(cacheKey);
  if (cachedData) {
    return res.json(JSON.parse(cachedData));
  }

  const isNumeric = /^\d+$/.test(id);
  const whereClause = isNumeric ? { id: Number(id) } : { stateCode: id };
  const state = await prisma.state.findFirst({ where: whereClause });

  if (!state) {
    return res.status(404).json({ success: false, error: "State not found" });
  }

  const districts = await prisma.district.findMany({
    where: { stateId: state.id },
    skip,
    take: Number(limit),
    select: {
      id: true,
      districtCode: true,
      districtName: true,
    },
  });

  const response = {
    success: true,
    data: districts,
    meta: {
      page: Number(page),
      limit: Number(limit),
      count: districts.length,
    },
  };

  await cache.set(cacheKey, JSON.stringify(response), 3600);
  res.json(response);
});

// Legacy Districts support
router.get("/districts", authMiddleware, loggerMiddleware, rateLimitMiddleware, async (req, res) => {
  const { stateCode, page = 1, limit = 10 } = req.query;
  if (!stateCode) {
    return res.status(400).json({ success: false, error: "stateCode query parameter required" });
  }
  
  // Forward to path-param method
  req.params.id = stateCode;
  nextRouteHandler(req, res, "/states/:id/districts");
});

// SUB-DISTRICTS BY DISTRICT (Path Parameter Route)
router.get("/districts/:id/subdistricts", authMiddleware, loggerMiddleware, rateLimitMiddleware, async (req, res) => {
  const { id } = req.params;
  const { page = 1, limit = 10 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const isNumeric = /^\d+$/.test(id);
  const whereClause = isNumeric ? { id: Number(id) } : { districtCode: id };
  const district = await prisma.district.findFirst({ 
    where: whereClause,
    include: { state: true }
  });

  if (!district) {
    return res.status(404).json({ success: false, error: "District not found" });
  }

  const hasAccess = await verifyStateAccess(req.user, district.state.stateCode);
  if (!hasAccess) {
    return res.status(403).json({ error: "ACCESS_DENIED: User not authorized for requested state" });
  }

  const cacheKey = `geo:subdistricts:d:${id}:p:${page}:l:${limit}`;
  const cachedData = await cache.get(cacheKey);
  if (cachedData) {
    return res.json(JSON.parse(cachedData));
  }

  const subs = await prisma.subDistrict.findMany({
    where: { districtId: district.id },
    skip,
    take: Number(limit),
    select: {
      id: true,
      subDistrictCode: true,
      subDistrictName: true,
    },
  });

  const response = {
    success: true,
    data: subs,
    meta: {
      page: Number(page),
      limit: Number(limit),
      count: subs.length,
    },
  };

  await cache.set(cacheKey, JSON.stringify(response), 3600);
  res.json(response);
});

// Legacy Subdistricts support
router.get("/subdistricts", authMiddleware, loggerMiddleware, rateLimitMiddleware, async (req, res) => {
  const { districtCode, page = 1, limit = 10 } = req.query;
  if (!districtCode) {
    return res.status(400).json({ success: false, error: "districtCode query parameter required" });
  }
  req.params.id = districtCode;
  nextRouteHandler(req, res, "/districts/:id/subdistricts");
});

// VILLAGES BY SUB-DISTRICT (Path Parameter Route)
router.get("/subdistricts/:id/villages", authMiddleware, loggerMiddleware, rateLimitMiddleware, async (req, res) => {
  const { id } = req.params;
  const { page = 1, limit = 10 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const isNumeric = /^\d+$/.test(id);
  const whereClause = isNumeric ? { id: Number(id) } : { subDistrictCode: id };
  const sub = await prisma.subDistrict.findFirst({ 
    where: whereClause,
    include: { district: { include: { state: true } } }
  });

  if (!sub) {
    return res.status(404).json({ success: false, error: "Sub-district not found" });
  }

  const hasAccess = await verifyStateAccess(req.user, sub.district.state.stateCode);
  if (!hasAccess) {
    return res.status(403).json({ error: "ACCESS_DENIED: User not authorized for requested state" });
  }

  const cacheKey = `geo:villages:sub:${id}:p:${page}:l:${limit}`;
  const cachedData = await cache.get(cacheKey);
  if (cachedData) {
    return res.json(JSON.parse(cachedData));
  }

  const villages = await prisma.village.findMany({
    where: { subDistrictId: sub.id },
    skip,
    take: Number(limit),
    select: {
      id: true,
      villageCode: true,
      villageName: true,
    },
  });

  const response = {
    success: true,
    data: villages,
    meta: {
      page: Number(page),
      limit: Number(limit),
      count: villages.length,
    },
  };

  await cache.set(cacheKey, JSON.stringify(response), 3600);
  res.json(response);
});

// Legacy Villages support
router.get("/villages", authMiddleware, loggerMiddleware, rateLimitMiddleware, async (req, res) => {
  const { subDistrictCode, page = 1, limit = 10 } = req.query;
  if (!subDistrictCode) {
    return res.status(400).json({ success: false, error: "subDistrictCode query parameter required" });
  }
  req.params.id = subDistrictCode;
  nextRouteHandler(req, res, "/subdistricts/:id/villages");
});

// Helper for redirecting legacy controllers
function nextRouteHandler(req, res, endpoint) {
  // Directly trigger route handler matching path parameters
  app._router.handle(req, res, () => {});
}

// SEARCH
router.get("/search", authMiddleware, loggerMiddleware, rateLimitMiddleware, async (req, res) => {
  const { q, page = 1, limit = 10 } = req.query;

  if (!q) {
    return res.status(400).json({ success: false, error: "Query required" });
  }

  const skip = (Number(page) - 1) * Number(limit);
  const cacheKey = `geo:search:q:${q}:p:${page}:l:${limit}:u:${req.user.id}`;

  const cachedData = await cache.get(cacheKey);
  if (cachedData) {
    return res.json(JSON.parse(cachedData));
  }

  const allowedStateIds = await getAllowedStateIds(req.user);
  const stateFilter = allowedStateIds ? { subDistrict: { district: { stateId: { in: allowedStateIds } } } } : {};

  const results = await prisma.village.findMany({
    where: {
      villageName: {
        contains: q,
        mode: "insensitive",
      },
      ...stateFilter
    },
    take: Number(limit),
    skip: Number(skip),
    include: {
      subDistrict: {
        include: {
          district: {
            include: {
              state: true,
            },
          },
        },
      },
    },
  });

  const formatted = results.map((v) => ({
    value: v.villageCode,
    label: v.villageName,
    fullAddress: `${v.villageName}, ${v.subDistrict.subDistrictName}, ${v.subDistrict.district.districtName}, ${v.subDistrict.district.state.stateName}, India`,
    hierarchy: {
      village: v.villageName,
      subDistrict: v.subDistrict.subDistrictName,
      district: v.subDistrict.district.districtName,
      state: v.subDistrict.district.state.stateName,
      country: "India",
    },
  }));

  const responseTime = Date.now() - req.startTime;

  // Enforce correct standard response rate limit header metrics
  const todayStr = new Date().toISOString().split("T")[0];
  const dailyKey = `rate:daily:${req.user.id}:${todayStr}`;
  const dailyCount = Number(await cache.get(dailyKey)) || 0;
  
  const limits = { FREE: 5000, PREMIUM: 50000, PRO: 300000, UNLIMITED: 1000000 };
  const dailyLimit = limits[req.user.planType] || 5000;

  const response = {
    success: true,
    count: formatted.length,
    data: formatted,
    meta: {
      page: Number(page),
      limit: Number(limit),
      requestId: crypto.randomUUID(),
      responseTime: `${responseTime}ms`,
      rateLimit: {
        remaining: Math.max(dailyLimit - dailyCount, 0),
        limit: dailyLimit,
      },
    },
  };

  await cache.set(cacheKey, JSON.stringify(response), 300); // cache search for 5 mins
  res.json(response);
});

// AUTOCOMPLETE
router.get("/autocomplete", authMiddleware, async (req, res) => {
  const { q } = req.query;

  if (!q || q.length < 2) {
    return res.status(400).json({ success: false, error: "Query too short" });
  }

  const cacheKey = `geo:autocomplete:q:${q}:u:${req.user.id}`;
  const cachedData = await cache.get(cacheKey);
  if (cachedData) {
    return res.json(JSON.parse(cachedData));
  }

  const allowedStateIds = await getAllowedStateIds(req.user);
  const stateFilter = allowedStateIds ? { subDistrict: { district: { stateId: { in: allowedStateIds } } } } : {};

  const results = await prisma.village.findMany({
    where: {
      villageName: {
        contains: q,
        mode: "insensitive",
      },
      ...stateFilter
    },
    take: 10,
    include: {
      subDistrict: {
        include: {
          district: {
            include: {
              state: true,
            },
          },
        },
      },
    },
  });

  const formatted = results.map((v) => ({
    value: v.villageCode,
    label: `${v.villageName} (${v.subDistrict.district.state.stateName})`,
  }));

  const response = {
    success: true,
    data: formatted,
  };

  await cache.set(cacheKey, JSON.stringify(response), 600); // 10 mins cache
  res.json(response);
});

// ---------------- B2B USER CLIENT DASHBOARD APIS (Require JWT Auth) ----------------

// GET USAGE STATS
router.get("/dashboard/usage", dashboardAuth, async (req, res) => {
  try {
    const user = req.user;
    
    // Aggregated real usage in last 24h
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const used24h = await prisma.apiLog.count({
      where: {
        userId: user.id,
        createdAt: { gte: since24h },
      },
    });

    // Month's total requests
    const sinceMonth = new Date();
    sinceMonth.setDate(1); // Start of month
    sinceMonth.setHours(0,0,0,0);
    const usedMonth = await prisma.apiLog.count({
      where: {
        userId: user.id,
        createdAt: { gte: sinceMonth },
      },
    });

    // Average Response Time
    const avgLog = await prisma.apiLog.aggregate({
      where: {
        userId: user.id,
        createdAt: { gte: since24h },
      },
      _avg: {
        responseTime: true,
      },
    });

    // Successful Requests %
    const totalLogs24h = await prisma.apiLog.count({
      where: {
        userId: user.id,
        createdAt: { gte: since24h },
      },
    });

    const successLogs24h = await prisma.apiLog.count({
      where: {
        userId: user.id,
        statusCode: { lt: 400 },
        createdAt: { gte: since24h },
      },
    });

    const successRate = totalLogs24h > 0 ? Math.round((successLogs24h / totalLogs24h) * 100) : 100;

    const limits = { FREE: 5000, PREMIUM: 50000, PRO: 300000, UNLIMITED: 1000000 };
    const limit = limits[user.planType] || 5000;

    // Fetch timeline logs for chart (last 7 days)
    const usageTimeline = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const startOfDay = new Date(d.setHours(0,0,0,0));
      const endOfDay = new Date(d.setHours(23,59,59,999));

      const dayCount = await prisma.apiLog.count({
        where: {
          userId: user.id,
          createdAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      });

      usageTimeline.push({
        date: startOfDay.toLocaleDateString("en-US", { weekday: "short" }),
        requests: dayCount,
      });
    }

    res.json({
      success: true,
      data: {
        plan: user.planType,
        used24h,
        usedMonth,
        limit,
        avgResponseTime: Math.round(avgLog._avg.responseTime || 0),
        successRate,
        timeline: usageTimeline,
      },
    });
  } catch (err) {
    console.error("Usage dashboard stats error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// LEGACY GET USAGE STATS REDIRECT
router.get("/usage", dashboardAuth, async (req, res) => {
  // Simple backward compatibility wrapper
  try {
    const limits = { FREE: 5000, PREMIUM: 50000, PRO: 300000, UNLIMITED: 1000000 };
    const limit = limits[req.user.planType] || 5000;
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const used = await prisma.apiLog.count({
      where: { userId: req.user.id, createdAt: { gte: since24h } },
    });

    res.json({
      success: true,
      data: {
        plan: req.user.planType,
        used,
        limit,
        remaining: limit - used,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// LIST API KEYS
router.get("/api-keys", dashboardAuth, async (req, res) => {
  try {
    const keys = await prisma.apiKey.findMany({
      where: { userId: req.user.id },
      select: {
        id: true,
        apiKey: true,
        keyName: true,
        isActive: true,
        expiresAt: true,
        lastUsedAt: true,
        createdAt: true,
      },
    });
    res.json({ success: true, data: keys });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch keys" });
  }
});

// CREATE NAMED API KEY
router.post("/api-keys/create", dashboardAuth, async (req, res) => {
  const { keyName } = req.body;

  if (!keyName) {
    return res.status(400).json({ success: false, error: "API Key Name required" });
  }

  try {
    const activeCount = await prisma.apiKey.count({
      where: { userId: req.user.id, isActive: true },
    });

    if (activeCount >= 5) {
      return res.status(400).json({ success: false, error: "Maximum limit of 5 active API keys reached." });
    }

    const apiKey = "ak_" + crypto.randomBytes(16).toString("hex");
    const apiSecret = "as_" + crypto.randomBytes(16).toString("hex");
    const apiSecretHash = crypto.createHash("sha256").update(apiSecret).digest("hex");

    await prisma.apiKey.create({
      data: {
        apiKey,
        apiSecretHash,
        keyName,
        userId: req.user.id,
        isActive: true,
      },
    });

    res.json({
      success: true,
      data: { apiKey, apiSecret, keyName },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to generate key" });
  }
});

// REVOKE KEY
router.post("/revoke-key", dashboardAuth, async (req, res) => {
  const { apiKey } = req.body;
  if (!apiKey) {
    return res.status(400).json({ success: false, error: "apiKey required" });
  }

  try {
    const key = await prisma.apiKey.findFirst({
      where: { apiKey, userId: req.user.id },
    });

    if (!key) {
      return res.status(404).json({ success: false, error: "API Key not found" });
    }

    await prisma.apiKey.update({
      where: { id: key.id },
      data: { isActive: false },
    });

    res.json({ success: true, message: "API key revoked successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to revoke key" });
  }
});

// REGENERATE API SECRET
router.post("/api-keys/regenerate", dashboardAuth, async (req, res) => {
  const { apiKey } = req.body;
  if (!apiKey) {
    return res.status(400).json({ success: false, error: "apiKey required" });
  }

  try {
    const key = await prisma.apiKey.findFirst({
      where: { apiKey, userId: req.user.id },
    });

    if (!key) {
      return res.status(404).json({ success: false, error: "API Key not found" });
    }

    const newSecret = "as_" + crypto.randomBytes(16).toString("hex");
    const apiSecretHash = crypto.createHash("sha256").update(newSecret).digest("hex");

    await prisma.apiKey.update({
      where: { id: key.id },
      data: { apiSecretHash },
    });

    res.json({
      success: true,
      message: "Secret key regenerated successfully",
      apiSecret: newSecret,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to regenerate secret" });
  }
});

// ---------------- ADMIN PANEL PORTAL APIS (Require Admin JWT & Auth) ----------------

// LIST USERS
router.get("/admin/users", dashboardAuth, adminCheck, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        stateAccess: {
          include: { state: true },
        },
        apiKeys: true,
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// APPROVE/SUSPEND USER STATUS
router.post("/admin/users/:id/status", dashboardAuth, adminCheck, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // ACTIVE, SUSPENDED, PENDING_APPROVAL

  if (!status) {
    return res.status(400).json({ success: false, error: "Status field required" });
  }

  try {
    const user = await prisma.user.update({
      where: { id: Number(id) },
      data: { status },
    });

    // If approved and has no API keys, generate default key
    if (status === "ACTIVE") {
      const keyCount = await prisma.apiKey.count({ where: { userId: user.id } });
      if (keyCount === 0) {
        const apiKey = "ak_" + crypto.randomBytes(16).toString("hex");
        const apiSecret = "as_" + crypto.randomBytes(16).toString("hex");
        const apiSecretHash = crypto.createHash("sha256").update(apiSecret).digest("hex");

        await prisma.apiKey.create({
          data: {
            apiKey,
            apiSecretHash,
            keyName: "Default Key",
            userId: user.id,
          },
        });
      }
    }

    res.json({ success: true, message: `User status updated to ${status}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// UPGRADE/DOWNGRADE USER PLAN
router.post("/admin/users/:id/plan", dashboardAuth, adminCheck, async (req, res) => {
  const { id } = req.params;
  const { planType } = req.body; // FREE, PREMIUM, PRO, UNLIMITED

  if (!planType) {
    return res.status(400).json({ success: false, error: "planType field required" });
  }

  try {
    await prisma.user.update({
      where: { id: Number(id) },
      data: { planType },
    });
    res.json({ success: true, message: `User plan upgraded to ${planType}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GRANT/REVOKE STATE ACCESS
router.post("/admin/users/:id/access", dashboardAuth, adminCheck, async (req, res) => {
  const { id } = req.params;
  const { stateIds } = req.body; // Array of State IDs representing complete state access permissions

  if (!Array.isArray(stateIds)) {
    return res.status(400).json({ success: false, error: "stateIds array is required" });
  }

  try {
    // Delete all current access mappings
    await prisma.userStateAccess.deleteMany({
      where: { userId: Number(id) },
    });

    // Batch insert new access rules
    const newRules = stateIds.map((sId) => ({
      userId: Number(id),
      stateId: Number(sId),
    }));

    await prisma.userStateAccess.createMany({
      data: newRules,
    });

    res.json({ success: true, message: "State access matrix successfully updated" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// VIEW DETAILED API LOGS
router.get("/admin/logs", dashboardAuth, adminCheck, async (req, res) => {
  const { page = 1, limit = 50, email, endpoint, statusCode } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const filter = {};
  if (email) {
    filter.user = { email: { contains: email, mode: "insensitive" } };
  }
  if (endpoint) {
    filter.endpoint = { contains: endpoint, mode: "insensitive" };
  }
  if (statusCode) {
    filter.statusCode = Number(statusCode);
  }

  try {
    const logs = await prisma.apiLog.findMany({
      where: filter,
      include: {
        user: { select: { email: true, businessName: true } },
        apiKey: { select: { keyName: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: Number(limit),
    });

    const totalLogs = await prisma.apiLog.count({ where: filter });

    res.json({
      success: true,
      data: logs,
      meta: {
        page: Number(page),
        limit: Number(limit),
        total: totalLogs,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// EXPORT LOGS CSV
router.get("/admin/logs/export", dashboardAuth, adminCheck, async (req, res) => {
  try {
    const logs = await prisma.apiLog.findMany({
      include: {
        user: { select: { email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 2000, // Export top 2000 logs
    });

    let csvContent = "ID,Timestamp,User Email,Endpoint,Response Time (ms),Status Code\r\n";
    logs.forEach((log) => {
      csvContent += `${log.id},"${log.createdAt.toISOString()}","${log.user?.email || ""}","${log.endpoint}",${log.responseTime},${log.statusCode}\r\n`;
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=api_logs.csv");
    res.status(200).send(csvContent);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ADMIN ANALYTICS STATS
router.get("/admin/stats", dashboardAuth, adminCheck, async (req, res) => {
  try {
    const totalVillages = await prisma.village.count();
    const activeUsersCount = await prisma.user.count({ where: { status: "ACTIVE" } });
    const pendingUsersCount = await prisma.user.count({ where: { status: "PENDING_APPROVAL" } });
    
    // Average response time
    const avgResponse = await prisma.apiLog.aggregate({
      _avg: { responseTime: true },
    });

    // Requests timeline (last 30 days)
    const requestsTimeline = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const startOfDay = new Date(d.setHours(0,0,0,0));
      const endOfDay = new Date(d.setHours(23,59,59,999));

      const dayCount = await prisma.apiLog.count({
        where: { createdAt: { gte: startOfDay, lte: endOfDay } },
      });

      requestsTimeline.push({
        date: startOfDay.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        requests: dayCount,
      });
    }

    // Top 10 States by Village Count
    const topStatesList = await prisma.state.findMany({
      select: {
        stateName: true,
        districts: {
          select: {
            subDistricts: {
              select: {
                _count: { select: { villages: true } },
              },
            },
          },
        },
      },
    });

    const topStates = topStatesList.map((state) => {
      let count = 0;
      state.districts.forEach((d) => {
        d.subDistricts.forEach((sub) => {
          count += sub._count.villages;
        });
      });
      return { name: state.stateName, count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

    // User plan distribution
    const planCounts = await prisma.user.groupBy({
      by: ["planType"],
      _count: true,
    });

    const userDistribution = planCounts.map((p) => ({
      name: p.planType,
      value: p._count,
    }));

    res.json({
      success: true,
      data: {
        totalVillages,
        activeUsers: activeUsersCount,
        pendingUsers: pendingUsersCount,
        avgResponseTime: Math.round(avgResponse._avg.responseTime || 0),
        timeline: requestsTimeline,
        topStates,
        planDistribution: userDistribution,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------- INTERACTIVE SWAGGER DOCUMENTATION ----------------
app.use("/openapi.json", (req, res) => {
  res.sendFile(path.join(__dirname, "openapi.json"));
});

app.use("/docs", (req, res) => {
  res.setHeader("Content-Type", "text/html");
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Village API - Documentation</title>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui.css" />
        <style>
          html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
          *, *:before, *:after { box-sizing: inherit; }
          body { margin:0; background: #fafafa; }
        </style>
      </head>
      <body>
        <div id="swagger-ui"></div>
        <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-bundle.js"></script>
        <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-standalone-preset.js"></script>
        <script>
        window.onload = function() {
          window.ui = SwaggerUIBundle({
            url: "/openapi.json",
            dom_id: '#swagger-ui',
            deepLinking: true,
            presets: [
              SwaggerUIBundle.presets.apis,
              SwaggerUIStandalonePreset
            ],
            layout: "BaseLayout"
          });
        };
        </script>
      </body>
    </html>
  `);
});

// ---------------- ALL ROUTES MOUNTED UNDER VERSION PREFIX ----------------
app.use("/v1", router);
app.use("/api/v1", router); // Ensure complete gateway standard mapping

// Mount fallback health check at root
app.get("/", (req, res) => {
  res.json({ message: "Village API version v1 ready 🚀. Documentation is available at /docs" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
