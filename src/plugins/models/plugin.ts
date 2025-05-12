/**
 * Core plugin system types and interfaces
 */

// Base plugin interface that all plugins should implement
export interface Plugin {
  id: string;
  name: string;
  version: string;
  description?: string;
}