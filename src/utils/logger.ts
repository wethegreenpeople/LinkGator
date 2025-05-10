// utils/logger.ts
import { ansiColorFormatter, configure, getConsoleSink, Logger as LoggerType, getLogger as getLogTapeLogger } from "@logtape/logtape";

let isConfigured = false;
let configPromise: Promise<void> | null = null;

// Create a logger configuration function
export function configureLogger(): Promise<void> {
  if (isConfigured) {
    return Promise.resolve();
  }
  
  if (configPromise) {
    return configPromise;
  }
  
  configPromise = configure({
    reset: true,
    sinks: { console: getConsoleSink({formatter: ansiColorFormatter}) },
    filters: {},
    loggers: [
      { category: "fedify",  sinks: ["console"], lowestLevel: "info" },
      { category: "LinkGator",  sinks: ["console"], lowestLevel: "debug" },
    ],
  })
  .then(() => {
    isConfigured = true;
  })
  .catch((error) => {
    console.error("Failed to configure logger:", error);
    // Still mark as configured to avoid repeated failures
    isConfigured = true;
  });
  
  return configPromise;
}

// Helper function to get logger instances
export function getLogger(category: string): LoggerType {
  if (!isConfigured) {
    // Try to configure if not yet done
    configureLogger().catch(err => {
      console.error("Failed to configure logger on demand:", err);
    });
  }
  return getLogTapeLogger(category);
}