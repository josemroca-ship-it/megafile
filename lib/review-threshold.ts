import { prisma } from "@/lib/prisma";

export const REVIEW_THRESHOLD_SETTING_KEY = "review.confidence.threshold";
export const DEFAULT_REVIEW_THRESHOLD = 0.78;

function clamp(value: number) {
  return Math.max(0, Math.min(1, value));
}

export async function getReviewThreshold() {
  const row = await prisma.appSetting.findUnique({
    where: { key: REVIEW_THRESHOLD_SETTING_KEY },
    select: { value: true }
  });
  if (!row) return DEFAULT_REVIEW_THRESHOLD;
  const parsed = Number(row.value);
  if (Number.isNaN(parsed)) return DEFAULT_REVIEW_THRESHOLD;
  return Number(clamp(parsed).toFixed(2));
}

export async function setReviewThreshold(value: number) {
  const normalized = Number(clamp(value).toFixed(2));
  await prisma.appSetting.upsert({
    where: { key: REVIEW_THRESHOLD_SETTING_KEY },
    update: { value: String(normalized) },
    create: { key: REVIEW_THRESHOLD_SETTING_KEY, value: String(normalized) }
  });
  return normalized;
}

