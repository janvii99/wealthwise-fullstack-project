import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const rootDir = path.resolve(__dirname, "..");
export const publicDir = path.join(rootDir, "public");
export const dataDir = path.join(rootDir, "data");

export const config = {
  port: Number(process.env.PORT || 4000),
  jwtSecret: process.env.JWT_SECRET || "change-this-in-production",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  adminName: process.env.ADMIN_NAME || "WealthWise Admin",
  adminEmail: process.env.ADMIN_EMAIL || "admin@wealthwise.local",
  adminPassword: process.env.ADMIN_PASSWORD || "Admin@123"
};
