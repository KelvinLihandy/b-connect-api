import bcrypt from "bcrypt";
import crypto from "crypto";
import dotenv from "dotenv";
dotenv.config()

const algorithm = "aes-256-cbc";

const hashing = async (string, rounds = 10) => {
  const saltRounds = rounds;
  return await bcrypt.hash(string, saltRounds);
};

const cryptHash = (string) => {
  return crypto.createHash("sha256").update(string).digest("base64")
}

const cryptoEncrypt = (string) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm,
    Buffer.from(process.env.CRYPT_KEY, 'base64'),
    iv
  );
  let encrypted = cipher.update(string, "utf8", "base64");
  encrypted += cipher.final("base64");
  return { encrypted, iv: iv.toString("base64") };
}

const cryptoDecrypt = (string, iv) => {
  const decipher = crypto.createDecipheriv(
    algorithm, 
    Buffer.from(process.env.CRYPT_KEY, 'base64'),
    Buffer.from(iv, 'base64')
  );
  let decrypted = decipher.update(string, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

const verifyHash = async (input, hashed) => {
  return await bcrypt.compare(input, hashed);
};

export { hashing, cryptHash, verifyHash, cryptoEncrypt, cryptoDecrypt };
