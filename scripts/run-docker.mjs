#!/usr/bin/env node

/**
 * Run Docker Container Script
 *
 * This script runs the Docker container with environment variables from .env file.
 * The container will automatically load environment variables at runtime (not at build time).
 * This ensures secrets are never baked into the image.
 *
 * Usage: node scripts/run-docker.mjs [tag] [options]
 *
 * Examples:
 *   node scripts/run-docker.mjs                      # Uses default tag 'latest'
 *   node scripts/run-docker.mjs v1.0.0               # Uses tag 'v1.0.0'
 *   node scripts/run-docker.mjs latest --detach      # Run in background
 *   node scripts/run-docker.mjs latest --rm          # Remove container after exit
 */

import { execSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

// Get tag from command line arguments, default to 'latest'
const tag = process.argv[2] || "latest";
const imageName = tag.includes("/")
  ? tag
  : `adarcher/anime-stock-market:${tag}`;

// Get additional docker run options
const additionalOptions = process.argv.slice(3).join(" ");

// Check if .env file exists
const envPath = path.join(projectRoot, ".env.local");
const envExists = existsSync(envPath);

if (!envExists) {
  console.warn("⚠️  Warning: .env.local file not found!");
  console.warn(`   Expected location: ${envPath}`);
  console.warn(
    "   The container will run but may not have required environment variables.\n"
  );
} else {
  // Read and display which env variables will be loaded
  const envContent = readFileSync(envPath, "utf-8");
  const envVars = envContent
    .split("\n")
    .filter(
      (line) => line.trim() && !line.startsWith("#") && line.includes("=")
    )
    .map((line) => line.split("=")[0])
    .filter((varName) => varName.trim());

  console.log(`✅ Found .env.local with ${envVars.length} variables`);
  console.log(`   Variables: ${envVars.join(", ")}`);
  console.log("");
}

console.log("🐳 Running Docker container...");
console.log(`📦 Image name: ${imageName}`);
console.log(`🔧 Port mapping: 3000:3000`);
if (envExists) {
  console.log(`📋 Environment file: .env.local (loaded at runtime)`);
}
console.log("");

try {
  // Build the docker run command
  let command = "docker run";

  // Add environment file if it exists
  if (envExists) {
    // Use absolute path and quote it to handle spaces
    command += ` --env-file "${envPath}"`;
  }

  // Standard options
  command += " -p 3000:3000";
  command += " --name anime-stock-market-dev";

  // Add additional options if provided
  if (additionalOptions) {
    command += ` ${additionalOptions}`;
  }

  // Add image name
  command += ` ${imageName}`;

  console.log(`Running: ${command}`);
  console.log("");

  execSync(command, {
    cwd: projectRoot,
    stdio: "inherit",
  });
} catch (error) {
  const errorMsg = error.toString();

  // Check if it's a container name conflict
  if (
    errorMsg.includes("already in use") ||
    errorMsg.includes("Conflict") ||
    errorMsg.includes("anime-stock-market-dev")
  ) {
    console.error("");
    console.error("⚠️  Container already exists. Cleaning up...");
    console.error("");

    try {
      // First try to remove the container (forcefully)
      console.log("Removing existing container...");
      try {
        execSync("docker rm -f anime-stock-market-dev", {
          stdio: "pipe",
        });
        console.log("✅ Old container removed.");
      } catch (rmError) {
        console.warn("⚠️  Could not remove container:", rmError.message);
      }

      console.log("");
      console.log("🔄 Retrying container start...");
      console.log("");

      // Retry with the original command
      let retryCommand = "docker run";
      if (envExists) {
        retryCommand += ` --env-file "${envPath}"`;
      }
      retryCommand += " -p 3000:3000";
      retryCommand += " --name anime-stock-market-dev";
      if (additionalOptions) {
        retryCommand += ` ${additionalOptions}`;
      }
      retryCommand += ` ${imageName}`;

      console.log(`Running: ${retryCommand}`);
      console.log("");

      execSync(retryCommand, {
        cwd: projectRoot,
        stdio: "inherit",
      });
    } catch (retryError) {
      console.error("");
      console.error("❌ Failed to start container");
      console.error("Error:", retryError.message);
      console.error("");
      console.error("Manual cleanup: docker rm -f anime-stock-market-dev");
      process.exit(1);
    }
  } else {
    console.error("");
    console.error("❌ Docker run failed!");
    console.error("Error:", error.message);
    process.exit(1);
  }
}
