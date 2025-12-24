#!/usr/bin/env node

/**
 * Stop Docker Container Script
 *
 * This script stops and removes the running Docker container.
 *
 * Usage: node scripts/stop-docker.mjs [options]
 *
 * Examples:
 *   node scripts/stop-docker.mjs                     # Stop the default container
 *   node scripts/stop-docker.mjs --force             # Force stop
 */

import { execSync } from "child_process";

const containerName = "anime-stock-market-dev";
const forceStop = process.argv.includes("--force");

console.log("🛑 Stopping Docker container...");
console.log(`📦 Container name: ${containerName}`);
console.log("");

try {
  // Stop the container
  const stopCommand = `docker stop ${forceStop ? "-t 0" : ""} ${containerName}`;

  console.log(`Running: ${stopCommand}`);
  execSync(stopCommand, {
    stdio: "inherit",
  });

  console.log("");
  console.log("✅ Container stopped successfully!");

  // Remove the container
  console.log("");
  console.log("Removing container...");
  const rmCommand = `docker rm ${containerName}`;
  console.log(`Running: ${rmCommand}`);
  execSync(rmCommand, {
    stdio: "inherit",
  });

  console.log("");
  console.log("✅ Container removed successfully!");
} catch (error) {
  // Check if container doesn't exist
  if (error.message.includes("No such container")) {
    console.log("ℹ️  Container is not running.");
    process.exit(0);
  }

  console.error("");
  console.error("❌ Failed to stop container!");
  console.error("Error:", error.message);
  process.exit(1);
}
