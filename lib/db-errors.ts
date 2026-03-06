export function isDbUnavailableError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const maybe = error as { code?: string; message?: string };
  if (maybe.code === "P1001" || maybe.code === "P1002") return true;
  const msg = String(maybe.message ?? "").toLowerCase();
  return msg.includes("can't reach database server") || msg.includes("cannot reach database server");
}

