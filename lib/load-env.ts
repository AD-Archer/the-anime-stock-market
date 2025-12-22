import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";

const tryLoad = (filename: string) => {
  const filePath = path.join(process.cwd(), filename);
  if (!fs.existsSync(filePath)) return false;
  dotenv.config({ path: filePath });
  return true;
};

// Prefer local overrides for development.
tryLoad(".env.local");
tryLoad(".env");
