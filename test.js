const bcrypt = require("bcrypt"); // or "bcrypt" if using that
const hashedPassword = "$2b$10$ijFX6qAV1kdZzF8x0ick2.h7IwgqjQmY3BFPQM24ELvtoOU8j5CXm"; // Copy from Compass
const inputPassword = "delikoes"; // The password you entered

(async () => {
  const isMatch = await bcrypt.compare(inputPassword, hashedPassword);
  console.log("Password Match:", isMatch);
  const hashdPassword = await bcrypt.hash(inputPassword, 10);
console.log("✅ Hashed Password at Registration:", hashdPassword)
})();
