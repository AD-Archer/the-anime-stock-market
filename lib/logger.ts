/**
 * Server-side logger utility
 * Logs to terminal (Node.js stdout/stderr), not browser console
 */

type LogLevel = "info" | "warn" | "error" | "debug";

const formatTimestamp = (): string => {
  return new Date().toISOString();
};

const formatMessage = (level: LogLevel, message: string, data?: unknown): string => {
  const timestamp = formatTimestamp();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  
  if (data !== undefined) {
    try {
      const dataStr = typeof data === "string" ? data : JSON.stringify(data, null, 2);
      return `${prefix} ${message}\n${dataStr}`;
    } catch {
      return `${prefix} ${message}\n${String(data)}`;
    }
  }
  
  return `${prefix} ${message}`;
};

export const logger = {
  info: (message: string, data?: unknown) => {
    console.log(formatMessage("info", message, data));
  },
  
  warn: (message: string, data?: unknown) => {
    console.warn(formatMessage("warn", message, data));
  },
  
  error: (message: string, error?: unknown) => {
    const errorData = error instanceof Error 
      ? { message: error.message, stack: error.stack, name: error.name }
      : error;
    console.error(formatMessage("error", message, errorData));
  },
  
  debug: (message: string, data?: unknown) => {
    if (process.env.NODE_ENV === "development") {
      console.log(formatMessage("debug", message, data));
    }
  },
};

