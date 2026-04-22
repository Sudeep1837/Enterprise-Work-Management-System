import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const env = {
  port: process.env.PORT || 5000,
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  jwtSecret: process.env.JWT_SECRET || "super-secret-demo-key",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "8h",
  mongoUri: process.env.MONGODB_URI,
};

if (!env.mongoUri) {
  console.warn("WARNING: MONGODB_URI is not defined in the environment.");
}

export default env;
