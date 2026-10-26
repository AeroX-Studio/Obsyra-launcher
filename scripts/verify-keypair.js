/**
 * scripts/verify-keypair.js
 *
 * Safe local verification tool to audit updater keypair correspondence.
 * Checks whether the configured public key in `src-tauri/tauri.conf.json`
 * corresponds to a private key, without exposing or printing private material.
 *
 * Usage:
 *   node scripts/verify-keypair.js [path-to-private-key]
 *   Or via environment variables:
 *   TAURI_SIGNING_PRIVATE_KEY="..." TAURI_SIGNING_PRIVATE_KEY_PASSWORD="..." node scripts/verify-keypair.js
 */

import fs from "fs";
import path from "path";
import {
  parseAndValidateKey,
  verifyKeyWithTauriCli,
  extractPublicKeyNum,
} from "./prepare-signing-key.js";

function main() {
  const projectRoot = process.cwd();
  const configPath = path.join(projectRoot, "src-tauri", "tauri.conf.json");

  console.log("=== Obsyra Launcher — Updater Keypair Verification ===");

  if (!fs.existsSync(configPath)) {
    console.error(`Error: Could not find tauri.conf.json at ${configPath}`);
    process.exit(1);
  }

  let config;
  try {
    config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch (err) {
    console.error("Error: Failed to parse tauri.conf.json:", err.message);
    process.exit(1);
  }

  const pubkey = config.plugins?.updater?.pubkey;
  if (!pubkey) {
    console.error(
      "Error: No updater public key configured under plugins > updater > pubkey in tauri.conf.json."
    );
    process.exit(1);
  }

  // Validate public key format
  const pubKeyNum = extractPublicKeyNum(pubkey);
  if (!pubKeyNum) {
    console.error(
      "Error: The pubkey in tauri.conf.json is not a valid 42-byte Minisign public key."
    );
    process.exit(1);
  }

  let commentKeyId = "unknown";
  try {
    const pubDecoded = Buffer.from(pubkey, "base64").toString("utf8");
    const commentMatch = pubDecoded.match(/minisign public key:\s*([0-9A-Fa-f]+)/);
    if (commentMatch) {
      commentKeyId = commentMatch[1].toUpperCase();
    }
  } catch {}

  console.log(`[Configured Public Key]`);
  console.log(`  Configuration field : plugins > updater > pubkey`);
  console.log(`  Key ID (Comment)    : ${commentKeyId}`);
  console.log(`  Keynum (Hex LE)     : ${pubKeyNum}`);
  console.log(`  Format              : Valid Base64-encoded Minisign Ed25519 public key`);
  console.log(
    `  Endpoint            : ${config.plugins?.updater?.endpoints?.[0] || "none"}`
  );

  // Check if private key was supplied for comparison
  let candidateKey =
    process.argv[2] ||
    process.env.TAURI_SIGNING_PRIVATE_KEY ||
    process.env.TAURI_PRIVATE_KEY ||
    "";
  const candidatePassword =
    process.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD ||
    process.env.TAURI_KEY_PASSWORD ||
    "";

  if (!candidateKey) {
    console.log("\n[Private Key Verification]");
    console.log(
      "  No private key was provided to test against this public key."
    );
    console.log(
      "\nTo verify correspondence locally without exposing secrets:\n" +
        "  1. Pass the private key file path as an argument:\n" +
        "     node scripts/verify-keypair.js path/to/your.key\n" +
        "  2. Or set environment variables:\n" +
        "     $env:TAURI_SIGNING_PRIVATE_KEY=\"<key>\"\n" +
        "     $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD=\"<pwd>\"\n" +
        "     node scripts/verify-keypair.js\n"
    );
    process.exit(0);
  }

  console.log("\n[Private Key Verification]");
  let parsed;
  try {
    parsed = parseAndValidateKey(candidateKey, candidatePassword);
    console.log(`  Format valid        : Yes (${parsed.isEncrypted ? "Password-encrypted Scrypt" : "Unencrypted"})`);
  } catch (err) {
    console.error(`  Validation failed   : ${err.message}`);
    process.exit(1);
  }

  try {
    const testResult = verifyKeyWithTauriCli(
      parsed.normalizedBase64,
      parsed.password,
      projectRoot
    );

    if (testResult.verifiedByCli) {
      if (testResult.keynum === pubKeyNum) {
        console.log(`  Signature Keynum    : ${testResult.keynum}`);
        console.log(
          "\n>> [RESULT: MATCH] The private key corresponds to the configured public key in tauri.conf.json."
        );
        console.log("   Updater artifacts signed with this private key will be accepted by launcher clients.");
        process.exit(0);
      } else {
        console.error(`  Signature Keynum    : ${testResult.keynum}`);
        console.error(
          "\n>> [RESULT: MISMATCH] The private key does NOT match the public key in tauri.conf.json!"
        );
        console.error(
          `   Private key Keynum : ${testResult.keynum}\n` +
            `   Public key Keynum  : ${pubKeyNum}`
        );
        console.error(
          "   Updates signed with this private key will be REJECTED at runtime with signature errors."
        );
        process.exit(1);
      }
    } else {
      console.log(`  CLI Dry-run         : Skipped (${testResult.reason})`);
    }
  } catch (err) {
    console.error(`  Test sign failed    : ${err.message}`);
    process.exit(1);
  }
}

main();
