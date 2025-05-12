# LinkGator Plugin System

This document describes the plugin system architecture implemented in the LinkGator application, which allows extending functionality with custom implementations of core features.

## Overview

The plugin system provides a flexible way to extend and replace components of the application with custom implementations. The current implementation includes:

- Database plugins: Replace the default Supabase database with alternative implementations
- Authentication plugins: Replace the default Supabase authentication with alternatives

## Plugin Architecture

The plugin system consists of the following components:

1. **Core Plugin Types**: Base interfaces and types for all plugins
2. **Plugin Manager**: Singleton registry for registering and retrieving plugins
3. **Interface Definitions**: Contracts that plugins must implement
4. **Reference Implementations**: Default implementations using Supabase
5. **Factory Functions**: Utilities to easily access and use plugins throughout the application

## Using Plugins

### In Server-Side Code

```typescript
import { getAuthPlugin, getDatabasePlugin } from "~/utils/plugin-factory";

// Authentication example
export async function logout() {
    const authPlugin = getAuthPlugin();
    await authPlugin.signOut();
    return new Response(null, { status: 303, headers: { "Location": "/login" } });
}

// Database example
export async function getUsers() {
    const databasePlugin = getDatabasePlugin();
    const result = await databasePlugin.from('users').select();
    return result.data;
}
```

### In Client-Side Code

```typescript
import { getAuthPlugin, getDatabasePlugin } from "~/utils/plugin-factory-client";

// Authentication example
async function handleLogin() {
    const authPlugin = getAuthPlugin();
    const result = await authPlugin.signInWithPassword(email, password);
    if (result.error) {
        console.error("Login failed:", result.error);
    } else {
        console.log("Login successful:", result.user);
    }
}

// Database example
async function fetchPosts() {
    const databasePlugin = getDatabasePlugin();
    const result = await databasePlugin.from('posts').select();
    return result.data;
}
```

## Creating Custom Plugins

### Custom Database Plugin

To create a custom database plugin (e.g., MongoDB):

1. Implement the `DatabasePlugin` interface
2. Register your plugin with the `PluginManager`

Example:

```typescript
import { PluginManager } from '~/plugins/manager';
import { MongoDBDatabasePlugin } from './path-to-your-plugin';

// Create and register the plugin
const mongoPlugin = new MongoDBDatabasePlugin('mongodb://localhost:27017');
PluginManager.getInstance().register(mongoPlugin, { override: true });
```

### Custom Auth Plugin

To create a custom authentication plugin:

1. Implement the `AuthPlugin` interface
2. Register your plugin with the `PluginManager`

## Migrating Existing Code

For backward compatibility, the following legacy functions are still available:

- `createServerSupabase()` → use `getAuthPlugin()` instead
- `createServerSupabaseClient(event)` → use `getAuthPlugin(event)` instead
- `supabaseClient` → use `getAuthPlugin()` or `getSupabaseClient()` instead

When writing new code, prefer using the plugin system directly for better extensibility.