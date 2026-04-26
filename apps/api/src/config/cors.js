import { URL } from "node:url";

const normalizeOrigin = (origin) => {
  if (!origin || typeof origin !== "string") return null;

  try {
    const parsedUrl = new URL(origin.trim());
    return parsedUrl.origin;
  } catch {
    return null;
  }
};

const createOriginValidator = (allowedOrigins) => {
  const allowedOriginSet = new Set(allowedOrigins);

  return (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }

    const normalizedOrigin = normalizeOrigin(origin);
    if (normalizedOrigin && allowedOriginSet.has(normalizedOrigin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`CORS origin not allowed: ${origin}`));
  };
};

export const allowedClientOrigins = [
  "http://localhost:5173",
  "https://enterprise-work-management-system-w.vercel.app",
];

export const corsOptions = {
  origin: createOriginValidator(allowedClientOrigins),
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204,
};

export const socketCorsOptions = {
  origin: allowedClientOrigins,
  credentials: true,
  methods: ["GET", "POST"],
};
