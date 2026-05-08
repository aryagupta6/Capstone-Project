require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { PrismaClient } = require("@prisma/client");
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

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

// ---------------- APP ----------------
const app = express();
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  req.startTime = Date.now();
  next();
});

// ---------------- ROUTES ----------------
const router = express.Router();

// ---------------- HEALTH ----------------
app.get("/", (req, res) => {
  res.json({ message: "Village API running 🚀" });
});

// ---------------- REGISTER ----------------
router.post("/register", async (req, res) => {
  const { email, password, businessName } = req.body;

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
      data: { email, passwordHash, businessName, planType: "FREE" },
    });

    // Generate API key
    const apiKey = "ak_" + crypto.randomBytes(16).toString("hex");
    const apiSecret = "as_" + crypto.randomBytes(16).toString("hex");
    const apiSecretHash = crypto.createHash("sha256").update(apiSecret).digest("hex");

    await prisma.apiKey.create({
      data: { apiKey, apiSecretHash, userId: user.id },
    });

    res.json({
      success: true,
      data: { userId: user.id, email: user.email, apiKey, apiSecret },
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

    res.json({
      success: true,
      data: { userId: user.id, email: user.email, planType: user.planType },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Login failed" });
  }
});

// ---------------- STATES ----------------
router.get("/states", authMiddleware, loggerMiddleware, rateLimitMiddleware, async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const states = await prisma.state.findMany({
    skip,
    take: Number(limit),
    select: {
      stateCode: true,
      stateName: true,
    },
  });

  res.json({
    success: true,
    data: states,
    meta: {
      page: Number(page),
      limit: Number(limit),
      count: states.length,
    },
  });
});

// ---------------- DISTRICTS ----------------
router.get("/districts", authMiddleware, loggerMiddleware, rateLimitMiddleware, async (req, res) => {
  const { stateCode, page = 1, limit = 10 } = req.query;

  if (!stateCode) {
    return res.status(400).json({
      success: false,
      error: "stateCode required",
    });
  }

  const skip = (Number(page) - 1) * Number(limit);

  const districts = await prisma.district.findMany({
    where: {
      state: {
        stateCode: stateCode,
      },
    },
    skip,
    take: Number(limit),
    select: {
      districtCode: true,
      districtName: true,
    },
  });

  res.json({
    success: true,
    data: districts,
    meta: {
      page: Number(page),
      limit: Number(limit),
      count: districts.length,
    },
  });
});

// ---------------- SUBDISTRICTS ----------------
router.get("/subdistricts", authMiddleware, loggerMiddleware, rateLimitMiddleware, async (req, res) => {
  const { districtCode, page = 1, limit = 10 } = req.query;

  if (!districtCode) {
    return res.status(400).json({
      success: false,
      error: "districtCode required",
    });
  }

  const skip = (Number(page) - 1) * Number(limit);

  const subs = await prisma.subDistrict.findMany({
    where: {
      district: {
        districtCode: districtCode,
      },
    },
    skip,
    take: Number(limit),
    select: {
      subDistrictCode: true,
      subDistrictName: true,
    },
  });

  res.json({
    success: true,
    data: subs,
    meta: {
      page: Number(page),
      limit: Number(limit),
      count: subs.length,
    },
  });
});

// ---------------- VILLAGES ----------------
router.get("/villages", authMiddleware, loggerMiddleware, rateLimitMiddleware, async (req, res) => {
  const { subDistrictCode, page = 1, limit = 10 } = req.query;

  if (!subDistrictCode) {
    return res.status(400).json({
      success: false,
      error: "subDistrictCode required",
    });
  }

  const skip = (Number(page) - 1) * Number(limit);

  const villages = await prisma.village.findMany({
    where: {
      subDistrict: {
        subDistrictCode: subDistrictCode,
      },
    },
    skip,
    take: Number(limit),
    select: {
      villageCode: true,
      villageName: true,
    },
  });

  res.json({
    success: true,
    data: villages,
    meta: {
      page: Number(page),
      limit: Number(limit),
      count: villages.length,
    },
  });
});

// ---------------- SEARCH ----------------
router.get("/search", authMiddleware, loggerMiddleware, rateLimitMiddleware, async (req, res) => {
  const { q, page = 1, limit = 10 } = req.query;

  if (!q) {
    return res.status(400).json({
      success: false,
      error: "Query required",
    });
  }

  const skip = (Number(page) - 1) * Number(limit);

  const results = await prisma.village.findMany({
    where: {
      villageName: {
        contains: q,
        mode: "insensitive",
      },
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

  res.json({
    success: true,
    count: formatted.length,
    data: formatted,
    meta: {
      page: Number(page),
      limit: Number(limit),
      requestId: crypto.randomUUID(),
      responseTime: `${responseTime}ms`,
      rateLimit: {
        remaining: 9999,
        limit: 10000,
      },
    },
  });
});

// ---------------- AUTOCOMPLETE ----------------
router.get("/autocomplete", authMiddleware, async (req, res) => {
  const { q } = req.query;

  if (!q || q.length < 2) {
    return res.status(400).json({
      success: false,
      error: "Query too short",
    });
  }

  const results = await prisma.village.findMany({
    where: {
      villageName: {
        contains: q,
        mode: "insensitive",
      },
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

  res.json({
    success: true,
    data: formatted,
  });
});

// ---------------- USAGE ----------------
router.get("/usage", authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const used = await prisma.apiLog.count({
      where: {
        userId: user.id,
        createdAt: {
          gte: since,
        },
      },
    });

    const limits = {
      FREE: 100,
      PRO: 10000,
      ENTERPRISE: Infinity,
    };

    const limit = limits[user.planType] || 100;

    res.json({
      success: true,
      data: {
        plan: user.planType,
        used,
        limit,
        remaining: limit === Infinity ? "Unlimited" : Math.max(limit - used, 0),
      },
    });
  } catch (err) {
    console.error("Usage error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// ---------------- API KEYS ----------------
router.get("/api-keys", authMiddleware, async (req, res) => {
  try {
    const keys = await prisma.apiKey.findMany({
      where: { userId: req.user.id },
      select: {
        id: true,
        apiKey: true,
        isActive: true,
        createdAt: true,
      },
    });

    res.json({
      success: true,
      data: keys,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to fetch keys" });
  }
});

// ---------------- REVOKE KEY ----------------
router.post("/revoke-key", authMiddleware, async (req, res) => {
  const { apiKey } = req.body;

  if (!apiKey) {
    return res.status(400).json({
      success: false,
      error: "apiKey required",
    });
  }

  try {
    const key = await prisma.apiKey.findFirst({
      where: {
        apiKey,
        userId: req.user.id,
      },
    });

    if (!key) {
      return res.status(404).json({
        success: false,
        error: "API key not found",
      });
    }

    await prisma.apiKey.update({
      where: { id: key.id },
      data: { isActive: false },
    });

    res.json({
      success: true,
      message: "API key revoked successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to revoke key" });
  }
});

app.use("/api", router);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
