const bcrypt = require("bcrypt");
const crypto = require("crypto");

const hashing = async (string, rounds=10) => {
  const saltRounds = rounds;
  return await bcrypt.hash(string, saltRounds);
};

const cryptHash = (string) => {
  return crypto.createHash("sha256").update(string).digest("hex")
}

const verifyHash = async (input, hashed) => {
  return await bcrypt.compare(input, hashed);
};

module.exports = { hashing, cryptHash, verifyHash };
