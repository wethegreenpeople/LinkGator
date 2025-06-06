import { For, Show } from "solid-js";
import { createStore } from "solid-js/store";
import { createAsync, query, revalidate } from "@solidjs/router";
import { PluginManager } from "~/plugins/manager";
import { AbstractBasePlugin } from "~/models/plugin_models/base-plugin";

interface PluginDisplayInfo {
  id: string;
  name: string;
  version: string;
  description: string;
  settings: Record<string, any>;
  error?: string;
}

const getPluginData = query(async () => {
  "use server";
  // Reset the PluginManager singleton to ensure fresh state
  (PluginManager as any).instance = undefined;
  (PluginManager as any).initialized = false;
  
  const pluginManager = PluginManager.getInstance();
  await PluginManager.initializePlugins(true);
  
  // Small delay to ensure all async operations complete
  await new Promise(resolve => setTimeout(resolve, 10));
  
  const plugins = pluginManager.getAll();

  const pluginInfo: PluginDisplayInfo[] = [];

  for (const plugin of plugins) {
    if (plugin instanceof AbstractBasePlugin) {
      try {
        // Force reload settings to ensure fresh data
        plugin.loadSettings(); 
        pluginInfo.push({
          id: plugin.id,
          name: plugin.name,
          version: plugin.version,
          description: plugin.description,
          settings: plugin.settings || { enabled: plugin.isEnabled() },
        });
      } catch (error: any) {
        console.error(`Error processing plugin ${plugin.name}:`, error);        pluginInfo.push({
          id: plugin.id,
          name: plugin.name,
          version: plugin.version,
          description: plugin.description,
          settings: { enabled: false },
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
  const [pendingChanges, setPendingChanges] = createStore<Record<string, Record<string, any>>>({});

  const updateSetting = async (pluginId: string, settingKey: string, value: any) => {
    try {
      const response = await fetch(`/api/plugins/${pluginId}/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ settingKey, value }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update setting');
      }
      
      // Revalidate both the plugin data and the main plugin content
      revalidate(getPluginData.key);
      revalidate("plugin-content");
    } catch (error) {
      console.error('Error updating setting:', error);
    }
  };
  const updatePendingChange = (pluginId: string, settingKey: string, value: any) => {
    setPendingChanges(pluginId, (prev) => ({
      ...prev,
      [settingKey]: value
    }));
  };

  const savePendingChanges = async (pluginId: string) => {
    const changes = pendingChanges[pluginId];
    if (!changes) return;

    try {
      for (const [settingKey, value] of Object.entries(changes)) {
        await updateSetting(pluginId, settingKey, value);
      }
      setPendingChanges(pluginId, {});
    } catch (error) {
      console.error('Error saving changes:', error);
    }
  };

  const hasPendingChanges = (pluginId: string) => {
    return pendingChanges[pluginId] && Object.keys(pendingChanges[pluginId]).length > 0;
  };

  const getDisplayValue = (pluginId: string, settingKey: string, originalValue: any) => {
    return pendingChanges[pluginId]?.[settingKey] ?? originalValue;
  };return (
    <div class="min-h-screen bg-background text-on-background">
      <div class="container mx-auto p-6">
        <h1 class="text-3xl font-medium mb-8 text-on-background">Plugin Management</h1>
        <Show when={plugins()} fallback={
          <div class="flex items-center justify-center py-12">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p class="ml-3 text-on-surface-variant">Loading plugins...</p>
          </div>
        }>
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <For each={plugins()}>{(plugin) => (
              <div class="bg-surface border border-outline-variant rounded-xl p-6 shadow-sm hover:shadow-md hover:border-outline transition-all duration-200 hover:scale-[1.02]">                <div class="flex items-start justify-between mb-4">
                  <div class="flex-1">
                    <h2 class="text-xl font-medium text-on-surface mb-1">{plugin.name}</h2>
                    <span class="inline-block px-2 py-1 bg-surface-variant text-on-surface-variant text-xs rounded-md">v{plugin.version}</span>
                  </div>
                </div>
                
                <p class="text-on-surface-variant text-sm mb-6 leading-relaxed">{plugin.description}</p>
                
                <Show when={plugin.error}>
                  <div class="bg-error-container border border-error rounded-lg p-3 mb-4">
                    <p class="text-on-error-container text-sm flex items-center">
                      <svg class="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                      </svg>
                      {plugin.error}
                    </p>
                  </div>
                </Show>
                  <div class="border-t border-outline-variant pt-4">
                  <div class="flex items-center justify-between mb-3">
                    <h3 class="text-sm font-medium text-on-surface-variant uppercase tracking-wide">Settings</h3>
                    <Show when={hasPendingChanges(plugin.id)}>
                      <button
                        onClick={() => savePendingChanges(plugin.id)}
                        class="px-3 py-1 bg-primary text-on-primary text-xs rounded-md hover:bg-primary/90 transition-colors"
                      >
                        Save Changes
                      </button>
                    </Show>
                  </div>
                  <Show when={Object.keys(plugin.settings).length > 0} fallback={
                    <p class="text-on-surface-variant text-sm italic">No settings available</p>
                  }>
                    <div class="space-y-3">
                      <For each={Object.entries(plugin.settings)}>{([key, value]) => (
                        <div class="flex items-center justify-between py-2">
                          <label class="text-on-surface text-sm font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</label>
                          <Show when={typeof value === 'boolean'} fallback={
                            <Show when={typeof value === 'string'} fallback={
                              <span class="text-on-surface-variant text-sm bg-surface-variant px-2 py-1 rounded">{String(value)}</span>
                            }>
                              <input
                                type="text"
                                value={getDisplayValue(plugin.id, key, value)}
                                onInput={(e) => updatePendingChange(plugin.id, key, e.target.value)}
                                class="bg-surface-variant text-on-surface text-sm px-2 py-1 rounded border border-outline-variant focus:border-primary focus:outline-none min-w-0 flex-shrink"
                                style="min-width: 100px; max-width: 200px;"
                              />
                            </Show>
                          }>                            <label class="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={getDisplayValue(plugin.id, key, value) as boolean}
                                onChange={(e) => updatePendingChange(plugin.id, key, e.target.checked)}
                                class="sr-only peer"
                              />
                              <div class="w-11 h-6 bg-surface-variant peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                            </label>
                          </Show>
                        </div>
                      )}</For>
                    </div>
                  </Show>
                </div>
              </div>
            )}</For>
          </div>
        </Show>
      </div>
    </div>
  );
}
