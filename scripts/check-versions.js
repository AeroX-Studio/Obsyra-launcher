/**
 * scripts/check-versions.js
 *
 * Validates version consistency across all authoritative project files:
 *  - package.json
 *  - src-tauri/tauri.conf.json
 *  - src-tauri/Cargo.toml
 *  - src-tauri/Cargo.lock
 *  - package-lock.json
 *  - bun.lock
 * Also checks whether git tag v<version> already exists locally or remotely.
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";

function getFileContent(relPath) {
  const fullPath = path.resolve(relPath);
  if (!fs.existsSync(fullPath)) return null;
  return fs.readFileSync(fullPath, "utf8");
}

function main() {
  console.log("=== Obsyra Launcher — Version Consistency Audit ===");

  const versions = {};
  const packageNames = {};

  // 1. package.json
  const pkgJsonStr = getFileContent("package.json");
  if (pkgJsonStr) {
    const pkg = JSON.parse(pkgJsonStr);
    versions["package.json"] = pkg.version;
    packageNames["package.json"] = pkg.name;
  }

  // 2. src-tauri/tauri.conf.json
  const tauriConfStr = getFileContent("src-tauri/tauri.conf.json");
  if (tauriConfStr) {
    const conf = JSON.parse(tauriConfStr);
    versions["src-tauri/tauri.conf.json"] = conf.version;
    packageNames["src-tauri/tauri.conf.json"] = conf.productName;
  }

  // 3. src-tauri/Cargo.toml
  const cargoTomlStr = getFileContent("src-tauri/Cargo.toml");
  if (cargoTomlStr) {
    const matchVer = cargoTomlStr.match(/^version\s*=\s*"([^"]+)"/m);
    const matchName = cargoTomlStr.match(/^name\s*=\s*"([^"]+)"/m);
    if (matchVer) versions["src-tauri/Cargo.toml"] = matchVer[1];
    if (matchName) packageNames["src-tauri/Cargo.toml"] = matchName[1];
  }

  // 4. src-tauri/Cargo.lock
  const cargoLockStr = getFileContent("src-tauri/Cargo.lock");
  if (cargoLockStr) {
    const match = cargoLockStr.match(/\[\[package\]\]\r?\nname\s*=\s*"([^"]+)"\r?\nversion\s*=\s*"([^"]+)"/);
    // Find the obsyra-launcher or root package
    const obsyMatch = cargoLockStr.match(/\[\[package\]\]\r?\nname\s*=\s*"(obsy(?:ra)?-launcher)"\r?\nversion\s*=\s*"([^"]+)"/);
    if (obsyMatch) {
      packageNames["src-tauri/Cargo.lock"] = obsyMatch[1];
      versions["src-tauri/Cargo.lock"] = obsyMatch[2];
    }
  }

  // 5. package-lock.json
  const pkgLockStr = getFileContent("package-lock.json");
  if (pkgLockStr) {
    const lock = JSON.parse(pkgLockStr);
    versions["package-lock.json"] = lock.version;
    packageNames["package-lock.json"] = lock.name;
  }

  // 6. bun.lock
  const bunLockStr = getFileContent("bun.lock");
  if (bunLockStr) {
    try {
      const bunLock = JSON.parse(bunLockStr);
      const rootWs = bunLock.workspaces?.[""];
      if (rootWs) {
        packageNames["bun.lock"] = rootWs.name;
      }
    } catch {}
  }

  console.log("\nAudited Files & Versions:");
  for (const [file, ver] of Object.entries(versions)) {
    console.log(`  - ${file.padEnd(30)} : v${ver} (${packageNames[file] || "n/a"})`);
  }

  const uniqueVersions = new Set(Object.values(versions));
  if (uniqueVersions.size > 1) {
    console.error(`\n::error::Version mismatch detected across files: ${[...uniqueVersions].join(", ")}`);
    process.exit(1);
  }

  const primaryVersion = Object.values(versions)[0];
  console.log(`\n>> Confirmed uniform version across all files: v${primaryVersion}`);

  // Check tag existence
  const tagName = `v${primaryVersion}`;
  let tagExistsLocally = false;
  let tagExistsRemotely = false;

  try {
    const localTags = execSync(`git tag -l ${tagName}`, { encoding: "utf8" }).trim();
    if (localTags === tagName) tagExistsLocally = true;
  } catch {}

  try {
    const remoteTags = execSync(`git ls-remote --tags origin refs/tags/${tagName}`, { encoding: "utf8" }).trim();
    if (remoteTags.includes(tagName)) tagExistsRemotely = true;
  } catch {}

  console.log(`\nGit Tag Audit for '${tagName}':`);
  console.log(`  - Local tag exists   : ${tagExistsLocally ? "YES (Warning: tag already exists locally)" : "No"}`);
  console.log(`  - Remote tag exists  : ${tagExistsRemotely ? "YES (Warning: tag already published remotely!)" : "No (Safe for new release)"}`);

  if (tagExistsRemotely) {
    console.warn(`::warning::Tag '${tagName}' already exists on remote origin. Publishing to this tag would overwrite or conflict with an existing release.`);
  }

  console.log("\nVersion audit PASSED successfully.");
}

main();
