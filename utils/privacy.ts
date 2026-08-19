export type TechnicalErrorCode = "delivery_failed" | "operation_failed" | `http_${number}`;

export function technicalErrorCode(error: unknown, fallback: TechnicalErrorCode = "operation_failed"): TechnicalErrorCode {
  if (typeof error === "object" && error !== null && "status" in error) {
    const status = Number(error.status);
    if (Number.isInteger(status) && status >= 400 && status <= 599) return `http_${status}`;
  }
  return fallback;
}

export function safeUserMessage(error: unknown, fallback: string) {
  return `${fallback} (código: ${technicalErrorCode(error)})`;
}

export function safeLogEvent(error: unknown, fallback: TechnicalErrorCode = "operation_failed") {
  return { code: technicalErrorCode(error, fallback) };
}
