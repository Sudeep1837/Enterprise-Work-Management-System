import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const isProduction = process.env.NODE_ENV === "production";

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: process.env.PORT || 5000,
  clientUrl: process.env.CLIENT_URL,
  jwtSecret: process.env.JWT_SECRET || "super-secret-demo-key",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "8h",
  mongoUri: process.env.MONGODB_URI,
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },
};

if (!env.mongoUri) {
  const message = "MONGODB_URI is not defined in the environment.";
  if (isProduction) {
    throw new Error(message);
  }
  console.warn(`WARNING: ${message}`);
}

if (isProduction && (!process.env.JWT_SECRET || env.jwtSecret === "super-secret-demo-key")) {
  throw new Error("JWT_SECRET must be set to a strong non-demo value in production.");
}

if (isProduction && !env.clientUrl) {
  console.warn("WARNING: CLIENT_URL is not defined. Set it to the deployed frontend origin.");
}

if (!env.cloudinary.cloudName || !env.cloudinary.apiKey || !env.cloudinary.apiSecret) {
  console.warn("WARNING: Cloudinary environment variables are not fully configured.");
}

export default env;
