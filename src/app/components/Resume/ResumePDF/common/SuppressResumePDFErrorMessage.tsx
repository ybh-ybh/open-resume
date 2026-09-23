"use client";

/**
 * Suppress ResumePDF development errors.
 * See ResumePDF doc string for context.
 */
if (typeof window !== "undefined" && window.location.hostname === "localhost") {
  const consoleError = console.error;
  const SUPPRESSED_WARNINGS = ["DOCUMENT", "PAGE", "TEXT", "VIEW"];
  console.error = function filterWarnings(msg, ...args) {
    // React 的 console.error 参数不保证是字符串，先做类型保护再匹配标签。
    const warningTag = typeof args[0] === "string" ? args[0] : "";
    // 只过滤 React PDF 已知的开发环境标签警告，其余错误保持原样输出。
    const shouldSuppressWarning = SUPPRESSED_WARNINGS.some((entry) =>
      warningTag.includes(entry)
    );

    if (!shouldSuppressWarning) {
      consoleError(msg, ...args);
    }
  };
}

export const SuppressResumePDFErrorMessage = () => {
  return <></>;
};
