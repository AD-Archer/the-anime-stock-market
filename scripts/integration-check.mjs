#!/usr/bin/env node
import fetch from "node-fetch";

const base = process.argv[2] || "http://localhost:3000";

(async () => {
  try {
    console.log(`Checking ${base}`);

    const cfgRes = await fetch(`${base}/api/appwrite-config`);
    const cfg = await cfgRes.json();
    console.log("\n/api/appwrite-config ->", cfgRes.status);
    console.log(JSON.stringify(cfg, null, 2));

    const envRes = await fetch(`${base}/api/_internal/env-check`);
    let env;
    if (envRes.status === 404) {
      console.log("\n/api/_internal/env-check -> 404 (disabled)");
    } else {
      env = await envRes.json();
      console.log("\n/api/_internal/env-check ->", envRes.status);
      console.log(JSON.stringify(env, null, 2));
    }

    // Basic validations
    if (!cfg.endpoint || !cfg.projectId) {
      console.error(
        "\n❌ appwrite-config missing endpoint/projectId. Check APPWRITE_ENDPOINT/APPWRITE_PROJECT_ID envs."
      );
      process.exitCode = 2;
      return;
    }

    if (!cfg.databaseId) {
      console.warn(
        "\n⚠️  databaseId NOT exposed to client. This means the client cannot directly access Appwrite databases (you will see 404s to /databases//collections)."
      );
      console.warn(
        "  - For local testing you can set EXPOSE_APPWRITE_DATABASE_ID=true in .env.local (not recommended in production)"
      );
      console.warn(
        "  - Or set NEXT_PUBLIC_APPWRITE_DATABASE_ID if you want it in the client bundle at build time."
      );
    } else {
      console.log(
        "\n✅ databaseId is present in /api/appwrite-config. Client database calls should work."
      );
    }

    if (env) {
      const missing = env.missing || [];
      if (missing.length) {
        console.warn(
          "\n⚠️  env-check reports missing required server variables:",
          missing.join(", ")
        );
      } else {
        console.log(
          "\n✅ All required server env vars are present according to env-check."
        );
      }
    }

    console.log("\nDone");
  } catch (err) {
    console.error("Failed to run integration check:", err);
    process.exitCode = 2;
  }
})();
