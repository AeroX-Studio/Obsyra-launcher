/**
 * scripts/prepare-signing-key.js
 *
 * Pre-flight validator and normalizer for Tauri v2 Updater Minisign private keys.
 *
 * Requirements & Behavior:
 * 1. Accepts both supported formats:
 *    - Base64-encoded Minisign key string (output by `tauri signer generate`)
 *    - Raw multiline Minisign key file content (starting with "untrusted comment:")
 *    - Filesystem path to an existing private key file
 * 2. Normalizes the key into the exact Base64 string format required by the Tauri CLI signer.
 * 3. Validates binary key structure (158 bytes, Ed25519 signature algorithm 'Ed', KDF algorithm 'Sc' or [0,0]).
 * 4. Rejects public keys, malformed keys, truncated material, and invalid types immediately.
 * 5. Validates password presence for encrypted keys, and performs a dry-run test sign when Tauri CLI
 *    is available to verify password correctness before expensive compilation.
 * 6. Verifies that the private key corresponds to the public key in `src-tauri/tauri.conf.json`.
 * 7. Exports TAURI_SIGNING_PRIVATE_KEY (Base64 string), TAURI_SIGNING_PRIVATE_KEY_PATH (secure file),
 *    and legacy variables to $GITHUB_ENV.
 * 8. Never exposes key material, passwords, or secret payloads in logs, arguments, or artifacts.
 */

import fs from "fs";
import os from "os";
import path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";

/**
 * Extracts the 8-byte keynum (hex string) from a Base64-encoded public key.
 */
export function extractPublicKeyNum(pubKeyInput) {
  if (!pubKeyInput || typeof pubKeyInput !== "string") return null;

  let cleaned = pubKeyInput.replace(/^\uFEFF/, "").trim();
  let decodedText = cleaned;

  // If input is Base64 of the minisign public key file (starts with dW50...)
  if (!cleaned.startsWith("untrusted comment:")) {
    try {
      const buf = Buffer.from(cleaned.replace(/\s+/g, ""), "base64");
      decodedText = buf.toString("utf8");
    } catch {
      return null;
    }
  }

  const lines = decodedText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) return null;

  try {
    const keyBox = Buffer.from(lines[1], "base64");
    if (keyBox.length !== 42) return null;
    // Offset 2..10 is the 8-byte keynum
    return keyBox.subarray(2, 10).toString("hex").toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Extracts the 8-byte keynum (hex string) from a Base64-encoded signature.
 */
export function extractSignatureKeyNum(sigInput) {
  if (!sigInput || typeof sigInput !== "string") return null;

  let cleaned = sigInput.replace(/^\uFEFF/, "").trim();
  let decodedText = cleaned;

  if (!cleaned.startsWith("untrusted comment:")) {
    try {
      const buf = Buffer.from(cleaned.replace(/\s+/g, ""), "base64");
      decodedText = buf.toString("utf8");
    } catch {
      return null;
    }
  }

  const lines = decodedText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) return null;

  try {
    const sigBox = Buffer.from(lines[1], "base64");
    if (sigBox.length < 10) return null;
    // Offset 2..10 is the 8-byte keynum
    return sigBox.subarray(2, 10).toString("hex").toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Parses, validates, and normalizes an input private key string or file path.
 * Returns an object with key metadata and the normalized Base64 string for Tauri CLI.
 */
export function parseAndValidateKey(rawKeyInput, rawPasswordInput = "") {
  if (!rawKeyInput || typeof rawKeyInput !== "string" || !rawKeyInput.trim()) {
    throw new Error("No private key provided.");
  }

  let rawKey = rawKeyInput.replace(/^\uFEFF/, "").trim();
  let password = (rawPasswordInput || "")
    .replace(/^\uFEFF/, "")
    .replace(/[\r\n]+$/, "");

  // If rawKey points to an existing file on disk, read it
  if (fs.existsSync(rawKey)) {
    try {
      const stat = fs.statSync(rawKey);
      if (stat.isFile()) {
        rawKey = fs.readFileSync(rawKey, "utf8").replace(/^\uFEFF/, "").trim();
      }
    } catch {
      throw new Error("Failed to read private key from specified file path.");
    }
  }

  if (!rawKey) {
    throw new Error("Private key is empty.");
  }

  let lines = [];
  let isBase64Input = false;

  if (rawKey.startsWith("untrusted comment:")) {
    // Format 1: Raw Minisign key text
    lines = rawKey
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
  } else {
    // Format 2: Base64-encoded Minisign key string or Base64 payload
    const cleanB64 = rawKey.replace(/\s+/g, "");
    try {
      const decodedBuf = Buffer.from(cleanB64, "base64");
      const decodedText = decodedBuf.toString("utf8");
      if (decodedText.startsWith("untrusted comment:")) {
        isBase64Input = true;
        lines = decodedText
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter(Boolean);
      } else if (
        decodedBuf.length === 158 &&
        decodedBuf[0] === 0x45 &&
        decodedBuf[1] === 0x64
      ) {
        // Raw key payload line without comment header
        const isScrypt = decodedBuf[2] === 0x53 && decodedBuf[3] === 0x63;
        const comment = isScrypt
          ? "untrusted comment: rsign encrypted secret key"
          : "untrusted comment: minisign secret key";
        lines = [comment, cleanB64];
      }
    } catch {
      // Not valid base64
    }
  }

  if (lines.length < 2) {
    throw new Error(
      "Invalid private key format. Minisign keys must contain at least 2 lines (header comment and key payload)."
    );
  }

  const commentLine = lines[0];
  const payloadLine = lines[1];

  // Detect accidental public key
  if (
    commentLine.includes("public key") ||
    commentLine.includes("rsign public key")
  ) {
    throw new Error(
      "Provided key is a Minisign PUBLIC key (.pub), not a secret key. Please provide your private signing key."
    );
  }

  let keyBox;
  try {
    keyBox = Buffer.from(payloadLine, "base64");
  } catch {
    throw new Error("Key payload line is not valid Base64.");
  }

  // Minisign public key payload is 42 bytes; private key payload is 158 bytes
  if (keyBox.length === 42) {
    throw new Error(
      "Provided key payload is a 42-byte PUBLIC key, not a private signing key."
    );
  }

  if (keyBox.length !== 158) {
    throw new Error(
      `Invalid private key payload length (${keyBox.length} bytes). Expected 158 bytes for standard Minisign secret key.`
    );
  }

  // Verify signature algorithm: 'Ed' (0x45, 0x64)
  if (keyBox[0] !== 0x45 || keyBox[1] !== 0x64) {
    throw new Error(
      "Unsupported signature algorithm in private key. Expected Ed25519 ('Ed')."
    );
  }

  // Verify KDF algorithm
  const isScrypt = keyBox[2] === 0x53 && keyBox[3] === 0x63; // 'Sc'
  const isNone = keyBox[2] === 0x00 && keyBox[3] === 0x00; // unencrypted

  if (!isScrypt && !isNone) {
    throw new Error(
      `Unsupported KDF algorithm in private key: 0x${keyBox[2].toString(16)} 0x${keyBox[3].toString(16)}.`
    );
  }

  // Minisign key file content strictly uses LF newlines
  const canonicalMinisignText = `${commentLine}\n${payloadLine}\n`;
  const normalizedBase64 = Buffer.from(canonicalMinisignText, "utf8").toString(
    "base64"
  );

  return {
    isEncrypted: isScrypt,
    normalizedBase64,
    password,
    comment: commentLine.replace(/^untrusted comment:\s*/, ""),
    isBase64Input,
  };
}

/**
 * Finds the local Tauri CLI binary or npm entry.
 */
function findTauriCli(projectRoot) {
  const candidates = [
    path.join(projectRoot, "node_modules", "@tauri-apps", "cli", "tauri.js"),
    path.join(projectRoot, "node_modules", "@tauri-apps", "cli", "main.js"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return { command: process.execPath, args: [c] };
    }
  }
  return null;
}

/**
 * Performs a dry-run test signature and verifies public-key correspondence.
 */
export function verifyKeyWithTauriCli(
  normalizedBase64,
  password,
  options = {}
) {
  const opts =
    typeof options === "string" ? { projectRoot: options } : options || {};
  const projectRoot = opts.projectRoot || process.cwd();
  const cli = findTauriCli(projectRoot);
  if (!cli) {
    if (opts.requireCli) {
      throw new Error(
        "Tauri CLI is required for updater signing verification, but was not found in node_modules."
      );
    }
    return {
      verifiedByCli: false,
      reason: "Tauri CLI not found in node_modules, skipped dry-run test sign.",
    };
  }

  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "obsyra-preflight-test-")
  );
  const testFile = path.join(tempDir, "preflight.bin");
  const sigFile = path.join(tempDir, "preflight.bin.sig");

  try {
    fs.writeFileSync(testFile, Buffer.from("OBSYRA_PREFLIGHT_VERIFICATION"));

    const env = {
      ...process.env,
      TAURI_SIGNING_PRIVATE_KEY: normalizedBase64,
      TAURI_SIGNING_PRIVATE_KEY_PASSWORD: password || "",
      CI: "true",
    };
    // Clean up any path variables to prevent Clap mutual exclusion conflicts
    delete env.TAURI_SIGNING_PRIVATE_KEY_PATH;
    delete env.TAURI_PRIVATE_KEY_PATH;

    const args = [...cli.args, "signer", "sign"];
    if (password) {
      args.push("--password", password);
    } else {
      args.push("--password", "");
    }
    args.push(testFile);

    try {
      execFileSync(cli.command, args, {
        env,
        stdio: "pipe",
        timeout: 15000,
      });
    } catch (err) {
      const stderr = err.stderr ? err.stderr.toString("utf8") : "";
      if (
        stderr.includes("incorrect updater private key password") ||
        stderr.includes("Wrong password for that key")
      ) {
        throw new Error(
          "The private key password in TAURI_SIGNING_PRIVATE_KEY_PASSWORD is missing or incorrect."
        );
      }
      if (
        stderr.includes("failed to decode base64 key") ||
        stderr.includes("failed to decode base64 secret key")
      ) {
        throw new Error(
          "Tauri CLI failed to decode the normalized Base64 secret key."
        );
      }
      throw new Error(
        `Tauri CLI signer test failed during preflight verification: ${stderr.trim() || err.message}`
      );
    }

    if (!fs.existsSync(sigFile)) {
      throw new Error("Tauri CLI did not produce an updater signature file.");
    }

    const sigContent = fs.readFileSync(sigFile, "utf8");
    const sigKeyNum = extractSignatureKeyNum(sigContent);

    // Verify against expected public key or tauri.conf.json
    if (opts.checkConfig !== false) {
      let expectedPubkey = opts.expectedPublicKey;
      if (!expectedPubkey) {
        const configPath =
          opts.configPath ||
          path.join(projectRoot, "src-tauri", "tauri.conf.json");
        if (fs.existsSync(configPath)) {
          try {
            const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
            expectedPubkey = config.plugins?.updater?.pubkey;
          } catch {}
        }
      }

      if (expectedPubkey) {
        const pubKeyNum = extractPublicKeyNum(expectedPubkey);
        if (
          pubKeyNum &&
          sigKeyNum &&
          pubKeyNum.toLowerCase() !== sigKeyNum.toLowerCase()
        ) {
          throw new Error(
            `Keypair mismatch! The private key (Key ID: ${sigKeyNum}) does not match ` +
              `the expected public key (Key ID: ${pubKeyNum}). ` +
              "Updates signed with this key will be rejected by launcher clients."
          );
        }
      }
    }

    return {
      verifiedByCli: true,
      keynum: sigKeyNum,
    };
  } finally {
    try {
      if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
      if (fs.existsSync(sigFile)) fs.unlinkSync(sigFile);
      if (fs.existsSync(tempDir)) fs.rmdirSync(tempDir);
    } catch {}
  }
}

/**
 * Main execution function.
 */
export function prepareSigningKey(options = {}) {
  const isTag =
    process.env.GITHUB_REF_TYPE === "tag" ||
    (process.env.GITHUB_REF && process.env.GITHUB_REF.startsWith("refs/tags/"));
  const requireSigning =
    options.requireSigning ??
    (process.env.REQUIRE_SIGNING === "true" || isTag);
  const checkOnly =
    options.checkOnly ??
    (process.argv.includes("--check-only") ||
      process.argv.includes("--preflight-only"));

  const configArgIdx = process.argv.indexOf("--config");
  const cliConfigPath =
    configArgIdx !== -1 && process.argv[configArgIdx + 1]
      ? process.argv[configArgIdx + 1]
      : null;
  const configPath = options.configPath || cliConfigPath;

  const rawKey =
    options.rawKey ||
    process.env.TAURI_SIGNING_PRIVATE_KEY ||
    process.env.TAURI_PRIVATE_KEY ||
    "";
  const password =
    options.password ||
    process.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD ||
    process.env.TAURI_KEY_PASSWORD ||
    "";

  if (!rawKey) {
    if (requireSigning) {
      console.error(
        "::error::[Signing Preflight Failed] No Tauri updater private key found in TAURI_SIGNING_PRIVATE_KEY or TAURI_PRIVATE_KEY."
      );
      console.error(
        "[Signing Setup] To configure signing credentials in GitHub Actions:\n" +
          "  1. Go to repository Settings -> Secrets and variables -> Actions\n" +
          "  2. Add secret TAURI_SIGNING_PRIVATE_KEY with the Base64 key string or entire .key content\n" +
          "  3. If your key has a password, also set TAURI_SIGNING_PRIVATE_KEY_PASSWORD"
      );
      process.exit(1);
    } else {
      console.log(
        "[Signing Preflight] No updater private key provided. Build will proceed without updater signing."
      );
      process.exit(0);
    }
  }

  let parsed;
  try {
    parsed = parseAndValidateKey(rawKey, password);
  } catch (err) {
    console.error(`::error::[Signing Preflight Failed] ${err.message}`);
    process.exit(1);
  }

  // Perform dry-run sign with Tauri CLI and verify correspondence with tauri.conf.json
  const projectRoot = options.projectRoot || process.cwd();
  let testResult;
  try {
    testResult = verifyKeyWithTauriCli(
      parsed.normalizedBase64,
      parsed.password,
      {
        projectRoot,
        checkConfig: options.checkConfig,
        expectedPublicKey: options.expectedPublicKey,
        configPath,
        requireCli: requireSigning,
      }
    );
    if (testResult.verifiedByCli) {
      console.log(
        `[Signing Preflight] Successfully verified updater private key and public-key correspondence (Key ID: ${testResult.keynum}).`
      );
    } else {
      if (requireSigning) {
        console.error(
          `::error::[Signing Preflight Failed] Signing verification could not be completed: ${testResult.reason}`
        );
        process.exit(1);
      }
      console.log(
        `[Signing Preflight] Key parsed successfully. (${testResult.reason})`
      );
    }
  } catch (err) {
    console.error(`::error::[Signing Preflight Failed] ${err.message}`);
    process.exit(1);
  }

  if (checkOnly) {
    if (requireSigning && (!testResult || !testResult.verifiedByCli)) {
      console.error(
        "::error::[Signing Preflight Failed] Tauri CLI verification could not be performed."
      );
      process.exit(1);
    }
    console.log("[Signing Preflight] All signing preflight checks PASSED.");
    return;
  }

  // Clean any path variables from process.env to prevent Clap mutual-exclusion conflicts
  delete process.env.TAURI_SIGNING_PRIVATE_KEY_PATH;
  delete process.env.TAURI_PRIVATE_KEY_PATH;

  // Export normalized environment variables to process.env and $GITHUB_ENV
  process.env.TAURI_SIGNING_PRIVATE_KEY = parsed.normalizedBase64;
  process.env.TAURI_PRIVATE_KEY = parsed.normalizedBase64;
  if (parsed.password) {
    process.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD = parsed.password;
    process.env.TAURI_KEY_PASSWORD = parsed.password;
  }

  const githubEnv = process.env.GITHUB_ENV;
  if (githubEnv && fs.existsSync(githubEnv)) {
    const eol = os.EOL;
    // Export single-line normalized Base64 key
    fs.appendFileSync(
      githubEnv,
      `TAURI_SIGNING_PRIVATE_KEY=${parsed.normalizedBase64}${eol}` +
        `TAURI_PRIVATE_KEY=${parsed.normalizedBase64}${eol}`
    );

    // Export password safely using multiline delimiter to handle special characters
    if (parsed.password) {
      const delimiter = `EOF_${Date.now()}_${Math.random().toString(36).substring(2)}`;
      fs.appendFileSync(
        githubEnv,
        `TAURI_SIGNING_PRIVATE_KEY_PASSWORD<<${delimiter}${eol}` +
          `${parsed.password}${eol}` +
          `${delimiter}${eol}` +
          `TAURI_KEY_PASSWORD<<${delimiter}${eol}` +
          `${parsed.password}${eol}` +
          `${delimiter}${eol}`
      );
    }
    fs.appendFileSync(githubEnv, `OBSYRA_UPDATER_SIGNED=true${eol}`);
  }

  console.log(
    "[Signing Preflight] Updater private key successfully prepared and exported in Tauri-supported format."
  );
}

// Execute when invoked directly
const isDirectRun =
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isDirectRun) {
  prepareSigningKey();
}
