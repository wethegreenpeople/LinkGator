import { For, Show } from "solid-js";
import { createAsync, query } from "@solidjs/router";
import { PluginManager } from "~/plugins/manager";
import { AbstractBasePlugin } from "~/plugins/models/base-plugin";

interface PluginDisplayInfo {
  name: string;
  version: string;
  description: string;
  settings: Record<string, any>;
  error?: string;
}

const getPluginData = query(async () => {
  "use server";
  const pluginManager = PluginManager.getInstance(); // No await needed for getInstance itself, initialization is handled within
  await PluginManager.initializePlugins(); // Ensure plugins are discovered and loaded, call explicitly if needed.
  const plugins = pluginManager.getAll(); // Use getAll() on the instance

  const pluginInfo: PluginDisplayInfo[] = [];

  for (const plugin of plugins) {
    if (plugin instanceof AbstractBasePlugin) {
      try {
        // Ensure settings are loaded if not already. loadSettings is synchronous in AbstractBasePlugin.
        // if (!plugin.settings || Object.keys(plugin.settings).length === 0) {
        //   plugin.loadSettings(); // loadSettings is sync
        // }
        // Settings should be loaded during registration or by accessing plugin.settings which calls loadSettings if needed.
        // To be safe, we can call it, or rely on the getter to do its job.
        // Let's ensure it's called if not present, but it's synchronous.
        if (!plugin.settings) plugin.loadSettings();

        pluginInfo.push({
          name: plugin.name,
          version: plugin.version,
          description: plugin.description,
          settings: plugin.settings || { enabled: plugin.isEnabled() }, // Fallback for settings
        });
      } catch (error: any) {
        console.error(`Error processing plugin ${plugin.name}:`, error);
        pluginInfo.push({
          name: plugin.name,
          version: plugin.version,
          description: plugin.description,
          settings: { enabled: false }, // Default settings on error
          error: error.message || "Failed to load settings",
        });
      }
    }
  }
  return pluginInfo;
}, "getPluginData");

export const route = {
  preload: () => getPluginData()
};

export default function PluginManagerPage() {
  const plugins = createAsync(() => getPluginData());

  return (
    <div class="container mx-auto p-4">
      <h1 class="text-2xl font-bold mb-6">Plugin Management</h1>
      <Show when={plugins()} fallback={<p>Loading plugins...</p>}>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-black">
          <For each={plugins()}>{(plugin) => (
            <div class="bg-white shadow-md rounded-lg p-6">
              <h2 class="text-xl font-semibold mb-2">{plugin.name} <span class="text-sm text-gray-500">v{plugin.version}</span></h2>
              <p class="text-gray-700 mb-4">{plugin.description}</p>
              <Show when={plugin.error}>
                <p class="text-red-500 mb-2">Error: {plugin.error}</p>
              </Show>
              <h3 class="text-lg font-semibold mb-2">Settings:</h3>
              <Show when={Object.keys(plugin.settings).length > 0} fallback={<p class="text-sm text-gray-500">No settings available.</p>}>
                <ul class="list-disc list-inside pl-4 space-y-1">
                  <For each={Object.entries(plugin.settings)}>{([key, value]) => (
                    <li><strong>{key}:</strong> {String(value)}</li>
                  )}</For>
                </ul>
              </Show>
            </div>
          )}</For>
        </div>
      </Show>
    </div>
  );
}
