#!/usr/bin/env node

/**
 * Build Docker Container Script
 *
 * This script builds the Docker image for the anime stock market application.
 * Usage: node scripts/build-docker.mjs [tag]
 *
 * Examples:
 *   node scripts/build-docker.mjs                    # Uses default tag 'latest'
 *   node scripts/build-docker.mjs v1.0.0             # Uses tag 'v1.0.0'
 *   node scripts/build-docker.mjs adarcher/anime-stock-market:dev
 */

import { execSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

// Get tag from command line arguments, default to 'latest'
const tag = process.argv[2] || "latest";

// Ensure tag is properly formatted
const imageName = tag.includes("/")
  ? tag
  : `adarcher/the-anime-stock-market:${tag}`;

console.log("🐳 Building Docker image...");
console.log(`📦 Image name: ${imageName}`);
console.log(`📂 Working directory: ${projectRoot}`);
console.log("");

const envPath = path.join(projectRoot, ".env.local");
const buildArgs = [];

if (existsSync(envPath)) {
  const envLines = readFileSync(envPath, "utf-8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));

  const quoteTrim = (value) => {
    let trimmed = value.trim();
    if (
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
      trimmed = trimmed.slice(1, -1);
    }
    return trimmed;
  };

  const escapeValue = (value) =>
    value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

  // Skip list for NEXT_PUBLIC_* variables that should NOT be passed as build args
  // Default: never pass the database id into the client bundle
  const skipBuildVars = new Set(
    (process.env.SKIP_BUILD_VARS || "NEXT_PUBLIC_APPWRITE_DATABASE_ID")
      .split(/[,\s]+/)
      .filter(Boolean)
  );

  const skipped = [];
  for (const line of envLines) {
    const [key, ...rest] = line.split("=");
    if (!key || !rest.length) continue;
    const trimmedKey = key.trim();
    const trimmedValue = quoteTrim(rest.join("="));
    if (!trimmedValue) continue;

    if (trimmedKey.startsWith("NEXT_PUBLIC_")) {
      if (skipBuildVars.has(trimmedKey)) {
        skipped.push(trimmedKey);
        continue;
      }

      buildArgs.push(
        `--build-arg ${trimmedKey}="${escapeValue(trimmedValue)}"`
      );
    }
  }

  if (skipped.length) {
    console.log(`ℹ️  Skipping NEXT_PUBLIC_* build args: ${skipped.join(", ")}`);
    console.log(
      "   (These are omitted to avoid exposing sensitive or internal IDs in the client bundle)"
    );
  }

  if (buildArgs.length > 0) {
    console.log(
      `ℹ️  Passing build args: ${buildArgs
        .map((arg) => arg.split("=")[0].replace("--build-arg ", ""))
        .join(", ")}`
    );
  }
} else {
  console.warn("⚠️  .env.local not found; no build args will be passed");
}

try {
  const argString = buildArgs.length ? buildArgs.join(" ") + " " : "";
  const command = `docker build ${argString}-t ${imageName} ${projectRoot}`;

  console.log(`Running: ${command}`);
  console.log("");

  execSync(command, {
    cwd: projectRoot,
    stdio: "inherit",
  });

  console.log("");
  console.log("✅ Docker image built successfully!");
  console.log(`🎉 Image: ${imageName}`);
  console.log("");
  console.log("Next steps:");
  console.log(`  1. Run the container: node scripts/run-docker.mjs ${tag}`);
  console.log(`  2. Or use docker-compose: docker-compose up`);
} catch (error) {
  console.error("");
  console.error("❌ Docker build failed!");
  console.error("Error:", error.message);
  process.exit(1);
}
