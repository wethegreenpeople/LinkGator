import { A, createAsync, query } from "@solidjs/router";
import { For, Suspense } from "solid-js";
import { PostCard } from "~/components/PostCard";
import { mockPosts } from "~/lib/mockData";
import { ClientPluginExecutor } from "~/utils/client-plugin-executor";

// Server function to get plugin content
const getPluginContent = query(async () => {
  "use server";
  const executor = ClientPluginExecutor.getInstance();
  return await executor.executeAllPlugins(mockPosts);
}, "plugin-content");

export default function Home() {
  const pluginContent = createAsync(() => getPluginContent());

  return (
    <div class="min-h-screen bg-background">
      <div class="max-w-6xl mx-auto px-4 py-6">
        <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main content area */}
          <main class="lg:col-span-3">            <div class="space-y-4">
              {/* Client plugin main feed content */}
              <Suspense fallback={<div class="text-on-surface-variant">Loading plugins...</div>}>
                <For each={pluginContent()?.mainFeed || []}>
                  {(htmlString) => <div innerHTML={htmlString} />}
                </For>
              </Suspense>
            </div>
          </main>
          
          {/* Sidebar */}
          <aside class="lg:col-span-1">            <div class="space-y-4">
              {/* Client plugin sidebar content */}
              <Suspense fallback={<div class="text-on-surface-variant text-sm">Loading sidebar...</div>}>
                <For each={pluginContent()?.sidebar || []}>
                  {(htmlString) => <div innerHTML={htmlString} />}
                </For>
              </Suspense>
              
              {/* Static sidebar content */}
              <div class="bg-surface border border-outline-variant rounded-lg p-4">
                <h4 class="font-medium text-on-surface mb-3">About LinkGator</h4>
                <p class="text-sm text-on-surface-variant">
                  A modern link aggregator built with SolidJS and a powerful plugin system.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
