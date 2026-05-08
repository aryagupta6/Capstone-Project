const crypto = require("crypto");

const secret = "super_secret_123";
const hash = crypto.createHash("sha256").update(secret).digest("hex");

console.log(hash);
