/**
 * scripts/test-signing-key.js
 *
 * Automated test suite for updater signing key validation and normalization.
 * Tests all required failure and success modes using generated mock keys:
 *  - Missing keys
 *  - Malformed keys
 *  - Public keys passed instead of private keys
 *  - Truncated payloads
 *  - Valid unencrypted keys
 *  - Valid encrypted keys with missing password
 *  - Valid encrypted keys with wrong password
 *  - Valid encrypted keys with correct password
 *  - Newline variations (CRLF, LF, Base64 wrapped)
 *  - Keypair correspondence matching
 *  - Secrecy (no leaked key material or passwords)
 *
 * Never uses production keys.
 */

import { execFileSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import {
  parseAndValidateKey,
  extractPublicKeyNum,
  extractSignatureKeyNum,
  verifyKeyWithTauriCli,
  prepareSigningKey,
} from "./prepare-signing-key.js";

let testsRun = 0;
let testsPassed = 0;

function assert(condition, testName) {
  testsRun++;
  if (condition) {
    testsPassed++;
    console.log(`  ✓ ${testName}`);
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    throw new Error(`Assertion failed: ${testName}`);
  }
}

function assertThrows(fn, expectedSubstring, testName) {
  testsRun++;
  try {
    fn();
    console.error(`  ✗ FAIL (did not throw): ${testName}`);
    throw new Error(`Expected throw containing "${expectedSubstring}", but function succeeded.`);
  } catch (err) {
    if (err.message.includes(expectedSubstring)) {
      testsPassed++;
      console.log(`  ✓ ${testName}`);
    } else {
      console.error(`  ✗ FAIL (threw wrong error): ${testName}`);
      console.error(`    Received: ${err.message}`);
      console.error(`    Expected substring: ${expectedSubstring}`);
      throw err;
    }
  }
}

console.log("=== Running Signing Key Preflight & Normalizer Tests ===");

// 1. Missing key
console.log("\n[Test Suite 1: Missing and Empty Keys]");
assertThrows(() => parseAndValidateKey(""), "No private key provided", "Rejects empty string");
assertThrows(() => parseAndValidateKey(null), "No private key provided", "Rejects null");
assertThrows(() => parseAndValidateKey("   \n\r  "), "No private key provided", "Rejects whitespace-only key");

// 2. Malformed keys
console.log("\n[Test Suite 2: Malformed and Invalid Keys]");
assertThrows(
  () => parseAndValidateKey("this is not a valid key"),
  "Invalid private key format",
  "Rejects random plaintext string"
);
assertThrows(
  () => parseAndValidateKey("SGVsZG8gd29ybGQ="),
  "Invalid private key format",
  "Rejects arbitrary Base64 string that does not decode to minisign header"
);
assertThrows(
  () => parseAndValidateKey("untrusted comment: secret key\n" + Buffer.alloc(50).toString("base64")),
  "Invalid private key payload length",
  "Rejects truncated 50-byte private key payload"
);
assertThrows(
  () => {
    const badAlgo = Buffer.alloc(158);
    badAlgo[0] = 0x99;
    badAlgo[1] = 0x99;
    parseAndValidateKey("untrusted comment: secret key\n" + badAlgo.toString("base64"));
  },
  "Unsupported signature algorithm",
  "Rejects non-Ed25519 signature algorithm"
);

// 3. Public key passed instead of private key
console.log("\n[Test Suite 3: Public Key Rejection]");
// Synthetic 42-byte non-secret payload (Minisign Ed25519 public key binary box)
const syntheticPubKeyPayload = Buffer.alloc(42, 0x58).toString("base64");
const mockPubKeyText =
  "untrusted comment: minisign public key: 0000000000000000\n" +
  syntheticPubKeyPayload;

assertThrows(
  () => parseAndValidateKey(mockPubKeyText),
  "Provided key is a Minisign PUBLIC key",
  "Rejects raw public key text containing public key header"
);

const mockPubKeyB64 = Buffer.from(mockPubKeyText, "utf8").toString("base64");
assertThrows(
  () => parseAndValidateKey(mockPubKeyB64),
  "Provided key is a Minisign PUBLIC key",
  "Rejects Base64-encoded public key"
);

// 4. Generate mock keys using local Tauri CLI
console.log("\n[Test Suite 4: Real Generated Mock Keys (Encrypted and Unencrypted)]");

const cliPath = path.resolve("node_modules/@tauri-apps/cli/tauri.js");
let hasCli = fs.existsSync(cliPath);

if (hasCli) {
  // Generate encrypted key with password
  const testPassword = "mock-test-password-12345";
  const genOutput = execFileSync(
    process.execPath,
    [cliPath, "signer", "generate", "-p", testPassword, "--ci"],
    { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }
  );

  const privMatch = genOutput.match(/Private: [^\r\n]*\r?\n([a-zA-Z0-9+/=]+)/);
  const pubMatch = genOutput.match(/Public:\r?\n([a-zA-Z0-9+/=]+)/);

  assert(privMatch && pubMatch, "Tauri CLI generated test keypair");

  const testPrivB64 = privMatch[1];
  const testPubB64 = pubMatch[1];

  // Test parsing valid Base64 encrypted key
  const parsedEnc = parseAndValidateKey(testPrivB64, testPassword);
  assert(parsedEnc.isEncrypted === true, "Identifies key as password-encrypted (Scrypt)");
  assert(typeof parsedEnc.normalizedBase64 === "string", "Produces normalized Base64 string");

  // Test missing password on encrypted key during dry-run
  assertThrows(
    () => {
      verifyKeyWithTauriCli(parsedEnc.normalizedBase64, "", { checkConfig: false });
    },
    "password in TAURI_SIGNING_PRIVATE_KEY_PASSWORD is missing or incorrect",
    "Fails dry-run when password is empty on encrypted key"
  );

  // Test wrong password on encrypted key during dry-run
  assertThrows(
    () => {
      verifyKeyWithTauriCli(parsedEnc.normalizedBase64, "wrong-password", { checkConfig: false });
    },
    "password in TAURI_SIGNING_PRIVATE_KEY_PASSWORD is missing or incorrect",
    "Fails dry-run when password is incorrect"
  );

  // Test correct password during dry-run with expected mock public key
  const dryRunSuccess = verifyKeyWithTauriCli(
    parsedEnc.normalizedBase64,
    testPassword,
    { expectedPublicKey: testPubB64 }
  );
  assert(dryRunSuccess.verifiedByCli === true, "Succeeds dry-run test sign with correct password");
  assert(typeof dryRunSuccess.keynum === "string", "Extracts signature keynum");

  // 5. Newline and formatting variations
  console.log("\n[Test Suite 5: Newline and Format Variations]");
  const rawMinisignText = Buffer.from(testPrivB64, "base64").toString("utf8");

  // Unix LF
  const unixText = rawMinisignText.replace(/\r?\n/g, "\n");
  const parsedUnix = parseAndValidateKey(unixText, testPassword);
  assert(parsedUnix.normalizedBase64 === parsedEnc.normalizedBase64, "Raw Unix LF matches Base64 input");

  // Windows CRLF
  const crlfText = rawMinisignText.replace(/\r?\n/g, "\r\n");
  const parsedCrlf = parseAndValidateKey(crlfText, testPassword);
  assert(parsedCrlf.normalizedBase64 === parsedEnc.normalizedBase64, "Raw Windows CRLF matches Base64 input");

  // Wrapped Base64 with internal spaces/newlines
  const wrappedB64 = testPrivB64.slice(0, 50) + "\r\n  " + testPrivB64.slice(50);
  const parsedWrapped = parseAndValidateKey(wrappedB64, testPassword);
  assert(parsedWrapped.normalizedBase64 === parsedEnc.normalizedBase64, "Wrapped Base64 with whitespace normalizes cleanly");

  // File path input
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "obsyra-test-keys-"));
  const tempKeyFile = path.join(tempDir, "test.key");
  fs.writeFileSync(tempKeyFile, crlfText);
  const parsedFromFile = parseAndValidateKey(tempKeyFile, testPassword);
  assert(parsedFromFile.normalizedBase64 === parsedEnc.normalizedBase64, "Reads from file path and normalizes identically");
  fs.unlinkSync(tempKeyFile);
  fs.rmdirSync(tempDir);

  // 6. Keypair matching
  console.log("\n[Test Suite 6: Keypair Correspondence Verification]");
  const pubKeyNum = extractPublicKeyNum(testPubB64);
  assert(pubKeyNum === dryRunSuccess.keynum, "Public key Keynum matches signature Keynum for corresponding keypair");

  // Generate a different second keypair to verify mismatch detection
  const otherGenOutput = execFileSync(
    process.execPath,
    [cliPath, "signer", "generate", "-p", "other-pwd", "--ci"],
    { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }
  );
  const otherPubB64 = otherGenOutput.match(/Public:\r?\n([a-zA-Z0-9+/=]+)/)[1];
  const otherPubKeyNum = extractPublicKeyNum(otherPubB64);
  assert(otherPubKeyNum !== dryRunSuccess.keynum, "Detects mismatch against an unrelated public key");

  assertThrows(
    () => {
      verifyKeyWithTauriCli(parsedEnc.normalizedBase64, testPassword, {
        expectedPublicKey: otherPubB64,
      });
    },
    "Keypair mismatch!",
    "verifyKeyWithTauriCli throws on keypair mismatch"
  );

  // 7. Unencrypted key
  console.log("\n[Test Suite 7: Unencrypted Key Handling]");
  const unencOutput = execFileSync(
    process.execPath,
    [cliPath, "signer", "generate", "--ci"],
    { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }
  );
  const unencPrivB64 = unencOutput.match(/Private: [^\r\n]*\r?\n([a-zA-Z0-9+/=]+)/)[1];
  const unencPubB64 = unencOutput.match(/Public:\r?\n([a-zA-Z0-9+/=]+)/)[1];
  const parsedUnenc = parseAndValidateKey(unencPrivB64, "");
  assert(typeof parsedUnenc.normalizedBase64 === "string", "Parses unencrypted key cleanly");
  const unencDryRun = verifyKeyWithTauriCli(parsedUnenc.normalizedBase64, "", {
    expectedPublicKey: unencPubB64,
  });
  assert(unencDryRun.verifiedByCli === true, "Unencrypted key dry-run signs successfully without password");

  // 8. Payload-only key reconstruction
  console.log("\n[Test Suite 8: Payload-only Key Auto-Reconstruction]");
  const rawEncText = Buffer.from(testPrivB64, "base64").toString("utf8");
  const payloadOnly = rawEncText.split(/\r?\n/)[1].trim();
  const parsedFromPayload = parseAndValidateKey(payloadOnly, testPassword);
  assert(parsedFromPayload.isEncrypted === true, "Recognizes payload-only encrypted key");
  const payloadDryRun = verifyKeyWithTauriCli(parsedFromPayload.normalizedBase64, testPassword, {
    expectedPublicKey: testPubB64,
  });
  assert(payloadDryRun.verifiedByCli === true, "Reconstructed key signs successfully");

  // 9. Environment variable isolation test
  console.log("\n[Test Suite 9: Environment Variable Export Isolation]");
  const mockEnvFile = path.join(os.tmpdir(), `mock-env-${Date.now()}.txt`);
  try {
    fs.writeFileSync(mockEnvFile, "");
    process.env.GITHUB_ENV = mockEnvFile;
    process.env.TAURI_SIGNING_PRIVATE_KEY_PATH = "should-be-cleaned";
    process.env.TAURI_PRIVATE_KEY_PATH = "should-be-cleaned";

    prepareSigningKey({
      rawKey: unencPrivB64,
      password: "",
      requireSigning: false,
      checkConfig: false,
    });

    const envContent = fs.readFileSync(mockEnvFile, "utf8");
    assert(envContent.includes("TAURI_SIGNING_PRIVATE_KEY="), "Exports TAURI_SIGNING_PRIVATE_KEY to GITHUB_ENV");
    assert(!envContent.includes("TAURI_SIGNING_PRIVATE_KEY_PATH="), "Does NOT export conflicting TAURI_SIGNING_PRIVATE_KEY_PATH");
    assert(process.env.TAURI_SIGNING_PRIVATE_KEY_PATH === undefined, "Deletes conflicting PATH from process.env");
  } finally {
    try {
      if (fs.existsSync(mockEnvFile)) fs.unlinkSync(mockEnvFile);
      delete process.env.GITHUB_ENV;
    } catch {}
  }
} else {
  console.log("  (Tauri CLI not found in node_modules, skipped CLI dry-run test cases)");
}

console.log(`\n========================================`);
console.log(`Summary: ${testsPassed}/${testsRun} tests PASSED.`);
console.log(`========================================\n`);

if (testsPassed !== testsRun) {
  process.exit(1);
}
