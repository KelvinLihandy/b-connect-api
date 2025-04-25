import jwt from "jsonwebtoken";

const OTPMiddleware = (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]
  if (!token) {
    return res.status(401).json({ error: "Akses ditolak! Validasi OTP tidak ditemukan." });
  }
  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.token = verified.token;
    next();
  } catch (err) {
    return res.status(403).json({ error: "Token tidak valid!" });
  }
};

export default OTPMiddleware;
