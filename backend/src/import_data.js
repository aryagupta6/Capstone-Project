require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");
const fs = require("fs");
const csv = require("csv-parser");
const path = require("path");

// DB setup
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
});

// ---------------- COUNTRY ----------------
async function importCountry() {
  const existing = await prisma.country.findFirst({
    where: { code: "IN" },
  });

  if (existing) {
    console.log("Country already exists");
    return;
  }

  await prisma.country.create({
    data: {
      name: "India",
      code: "IN",
    },
  });

  console.log("Country inserted");
}

// ---------------- STATES ----------------
async function importStates() {
  const states = [];

  return new Promise((resolve, reject) => {
    fs.createReadStream(
      path.join(__dirname, "../../dataset/normalized_data/states.csv")
    )
      .pipe(csv())
      .on("data", (row) => states.push(row))
      .on("end", async () => {
        try {
          const country = await prisma.country.findFirst({
            where: { code: "IN" },
          });

          for (const state of states) {
            const exists = await prisma.state.findFirst({
              where: { stateCode: state.state_code },
            });

            if (!exists) {
              await prisma.state.create({
                data: {
                  stateCode: state.state_code,
                  stateName: state.state_name,
                  countryId: country.id,
                },
              });
            }
          }

          console.log("States inserted:", states.length);
          resolve();
        } catch (err) {
          reject(err);
        }
      });
  });
}
// ---------------- DISTRICTS ----------------
async function importDistricts() {
  const districts = [];

  return new Promise((resolve, reject) => {
    fs.createReadStream(
      path.join(__dirname, "../../dataset/normalized_data/districts.csv")
    )
      .pipe(csv())
      .on("data", (row) => districts.push(row))
      .on("end", async () => {
        try {
          for (const d of districts) {
            // find state
            const state = await prisma.state.findFirst({
              where: { stateCode: d.state_code },
            });

            if (!state) continue;

            const exists = await prisma.district.findFirst({
              where: { districtCode: d.district_code },
            });

            if (!exists) {
              await prisma.district.create({
                data: {
                  districtCode: d.district_code,
                  districtName: d.district_name,
                  stateId: state.id,
                },
              });
            }
          }

          console.log("Districts inserted:", districts.length);
          resolve();
        } catch (err) {
          reject(err);
        }
      });
  });
}
// ---------------- SUB-DISTRICTS ----------------
async function importSubDistricts() {
  const subs = [];

  return new Promise((resolve, reject) => {
    fs.createReadStream(
      path.join(__dirname, "../../dataset/normalized_data/subdistricts.csv")
    )
      .pipe(csv())
      .on("data", (row) => subs.push(row))
      .on("end", async () => {
        try {
          for (const s of subs) {
            const district = await prisma.district.findFirst({
              where: { districtCode: s.district_code },
            });

            if (!district) continue;

            const exists = await prisma.subDistrict.findFirst({
              where: { subDistrictCode: s.subdistrict_code },
            });

            if (!exists) {
              await prisma.subDistrict.create({
                data: {
                  subDistrictCode: s.subdistrict_code,
                  subDistrictName: s.subdistrict_name,
                  districtId: district.id,
                },
              });
            }
          }

          console.log("SubDistricts inserted:", subs.length);
          resolve();
        } catch (err) {
          reject(err);
        }
      });
  });
}

//----------------- VILLAGES ----------------
async function importVillages() {
  console.log("Starting village import...");

  // Step 1: Load subdistrict map
  const subDistricts = await prisma.subDistrict.findMany({
    select: { id: true, subDistrictCode: true },
  });

  const subMap = {};
  for (const s of subDistricts) {
    subMap[s.subDistrictCode] = s.id;
  }

  console.log("SubDistrict map loaded");

  const allVillages = [];

  // Step 2: Read ALL data first (no async here)
  await new Promise((resolve, reject) => {
    fs.createReadStream(
      path.join(__dirname, "../../dataset/normalized_data/villages.csv")
    )
      .pipe(csv())
      .on("data", (row) => {
        const subId = subMap[row.subdistrict_code];
         if (!subId) {
         console.log("Missing subdistrict for:", row.subdistrict_code, row.village_name);
         return;
         }

        allVillages.push({
          villageCode: row.village_code,
          villageName: row.village_name,
          subDistrictId: subId,
        });
      })
      .on("end", resolve)
      .on("error", reject);
  });

  console.log("Total villages loaded:", allVillages.length);

  // Step 3: Controlled batch insert
  const BATCH_SIZE = 1000;

  for (let i = 0; i < allVillages.length; i += BATCH_SIZE) {
    const batch = allVillages.slice(i, i + BATCH_SIZE);

    await prisma.village.createMany({
      data: batch,
      skipDuplicates: true,
    });

    console.log(`Inserted batch ${i / BATCH_SIZE + 1}`);
  }

  console.log("All villages inserted 🚀");
}

// ---------------- MAIN ----------------
async function main() {
  await importCountry();
  await importStates();
  await importDistricts();
  await importSubDistricts();
  await importVillages();
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });