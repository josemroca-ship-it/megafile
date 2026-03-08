import crypto from "node:crypto";

const PREFIX = "enc:v1:";

function getMasterKey() {
  const raw = process.env.APP_SECRETS_KEY?.trim();
  if (raw) {
    // Accept base64(32 bytes) or raw 32+ char string.
    try {
      const decoded = Buffer.from(raw, "base64");
      if (decoded.length === 32) return decoded;
    } catch {
      // ignore
    }
    if (raw.length >= 32) return crypto.createHash("sha256").update(raw).digest();
  }

  const fallback = process.env.AUTH_SECRET?.trim();
  if (fallback) return crypto.createHash("sha256").update(fallback).digest();

  if (process.env.NODE_ENV === "production") {
    throw new Error("APP_SECRETS_KEY (or AUTH_SECRET) is required in production.");
  }
  return crypto.createHash("sha256").update("dev-secrets-key-change-me").digest();
}

export function encryptSecret(plain: string) {
  const trimmed = plain.trim();
  if (!trimmed) return "";
  const key = getMasterKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(trimmed, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("base64url")}.${tag.toString("base64url")}.${ciphertext.toString("base64url")}`;
}

export function decryptSecret(input: string) {
  if (!input) return "";
  if (!input.startsWith(PREFIX)) return input;
  const raw = input.slice(PREFIX.length);
  const [ivB64, tagB64, cipherB64] = raw.split(".");
  if (!ivB64 || !tagB64 || !cipherB64) throw new Error("Invalid encrypted secret payload.");
  const key = getMasterKey();
  const iv = Buffer.from(ivB64, "base64url");
  const tag = Buffer.from(tagB64, "base64url");
  const encrypted = Buffer.from(cipherB64, "base64url");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  return plain;
}

export function isEncryptedSecret(input: string | null | undefined) {
  return Boolean(input && input.startsWith(PREFIX));
}

