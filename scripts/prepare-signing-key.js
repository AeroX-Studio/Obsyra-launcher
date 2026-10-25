/**
 * scripts/prepare-signing-key.js
 *
 * Pre-flight validator and normalizer for Tauri Updater Minisign private keys.
 * Safely inspects the private key and password environment variables:
 *  - Checks for presence and detects common copy-paste errors (such as missing "untrusted comment:" line)
 *  - Automatically normalizes the key by prepending the required minisign comment header if missing
 *  - Checks if key is password-encrypted and confirms password presence
 *  - Writes the normalized key to a secure temporary key file and sets TAURI_SIGNING_PRIVATE_KEY
 *    to that file path, eliminating shell escaping / newline corruption issues across OSes
 *  - Never logs, echoes, or exposes private keys or passwords
 */

import fs from "fs";
import os from "os";
import path from "path";

function main() {
  const isTag =
    process.env.GITHUB_REF_TYPE === "tag" ||
    (process.env.GITHUB_REF && process.env.GITHUB_REF.startsWith("refs/tags/"));
  const requireSigning = process.env.REQUIRE_SIGNING === "true" || isTag;

  // Retrieve raw key and password from supported variable names
  let rawKey =
    process.env.TAURI_SIGNING_PRIVATE_KEY ||
    process.env.TAURI_PRIVATE_KEY ||
    "";
  let password =
    process.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD ||
    process.env.TAURI_KEY_PASSWORD ||
    "";

  // Strip UTF-8 BOM if present and trim accidental trailing whitespace/newlines
  rawKey = rawKey.replace(/^\uFEFF/, "").trim();
  password = password.replace(/^\uFEFF/, "").replace(/[\r\n]+$/, "");

  if (!rawKey) {
    if (requireSigning) {
      console.error(
        "::error::[Signing Validation Failed] No Tauri updater private key found in TAURI_SIGNING_PRIVATE_KEY or TAURI_PRIVATE_KEY."
      );
      console.error(
        "[Signing Setup] To configure signing credentials in GitHub Actions:\n" +
          "  1. Go to repository Settings -> Secrets and variables -> Actions\n" +
          "  2. Create/update secret: TAURI_SIGNING_PRIVATE_KEY\n" +
          "  3. Paste the entire content of your .key file (including 'untrusted comment: ...')\n" +
          "  4. If your key has a password, also set TAURI_SIGNING_PRIVATE_KEY_PASSWORD"
      );
      process.exit(1);
    } else {
      console.log(
        "[Signing Validation] No updater private key provided. Build will proceed without updater signing."
      );
      process.exit(0);
    }
  }

  // If rawKey points to an existing file on disk, read it
  if (fs.existsSync(rawKey) && fs.statSync(rawKey).isFile()) {
    try {
      rawKey = fs.readFileSync(rawKey, "utf8").trim();
    } catch (e) {
      console.error("::error::[Signing Validation] Failed to read private key file from disk.");
      process.exit(1);
    }
  }

  // Check for minisign header
  let normalizedKey = rawKey;
  if (!normalizedKey.startsWith("untrusted comment:")) {
    console.log(
      "::warning::[Signing Validation] Private key is missing the 'untrusted comment:' header line. Automatically prepending standard minisign header."
    );
    normalizedKey = `untrusted comment: minisign secret key\n${normalizedKey}`;
  }

  // Verify that there are at least two non-empty lines
  const lines = normalizedKey
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    console.error(
      "::error::[Signing Validation Failed] Private key format is invalid. Minisign keys must contain at least 2 lines (header + base64 key body)."
    );
    console.error(
      "[Signing Setup] Ensure newlines were not flattened into single-line spaces when copied to GitHub Secrets."
    );
    process.exit(1);
  }

  // Validate that the second line contains valid base64 key material
  const base64Candidate = lines[1];
  let keyBuffer;
  try {
    keyBuffer = Buffer.from(base64Candidate, "base64");
    if (keyBuffer.length < 32 || base64Candidate.length < 40) {
      console.error(
        "::error::[Signing Validation Failed] Second line of private key does not contain sufficient base64 key material."
      );
      process.exit(1);
    }
  } catch {
    console.error(
      "::error::[Signing Validation Failed] Second line of private key is not valid base64."
    );
    process.exit(1);
  }

  // Check if key is Scrypt password-encrypted (minisign signature algorithm "Ed", KDF algorithm "Sc")
  if (
    keyBuffer.length >= 4 &&
    keyBuffer[0] === 0x45 &&
    keyBuffer[1] === 0x64 &&
    keyBuffer[2] === 0x53 &&
    keyBuffer[3] === 0x63
  ) {
    if (!password) {
      console.log(
        "::warning::[Signing Validation] Private key appears to be Scrypt password-protected, but TAURI_SIGNING_PRIVATE_KEY_PASSWORD is empty. If decryption fails during bundle signing, ensure the password secret is set in GitHub Actions."
      );
    } else {
      console.log(
        "[Signing Validation] Password detected for password-protected private key."
      );
    }
  }

  // Create a secure temporary directory and write the normalized key file
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "obsyra-signing-"));
  const keyFilePath = path.join(tempDir, "updater.key");
  fs.writeFileSync(keyFilePath, normalizedKey + "\n", { mode: 0o600 });

  // Export path to GitHub Actions environment so Tauri bundler reads it directly from file
  const githubEnv = process.env.GITHUB_ENV;
  if (githubEnv && fs.existsSync(githubEnv)) {
    fs.appendFileSync(githubEnv, `TAURI_SIGNING_PRIVATE_KEY=${keyFilePath}\n`);
    fs.appendFileSync(githubEnv, `TAURI_PRIVATE_KEY=${keyFilePath}\n`);
    if (password) {
      fs.appendFileSync(githubEnv, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD=${password}\n`);
      fs.appendFileSync(githubEnv, `TAURI_KEY_PASSWORD=${password}\n`);
    }
    fs.appendFileSync(githubEnv, `OBSYRA_UPDATER_SIGNED=true\n`);
  }

  console.log(
    "[Signing Validation] Private key successfully validated and prepared at secure path."
  );
}

main();
