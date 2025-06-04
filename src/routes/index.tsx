import { createAsync, query } from "@solidjs/router";
import { For, Suspense } from "solid-js";
import { ClientPluginExecutor } from "~/utils/client-plugin-executor";
import { Post } from "~/models/post";

// Server function to fetch posts from API with fallback to mock data
const getPosts = query(async () => {
  "use server";
  try {
    const response = await fetch(new URL("/api/posts", import.meta.env.VITE_DOMAIN || "http://localhost:3000"));
    if (!response.ok) {
      console.error("Failed to fetch posts:", response.status, response.statusText);
      return null;
    }
    const data = await response.json();
    return data.posts || [];
  } catch (error) {
    console.error("Error fetching posts:", error);
    return null;
  }
}, "posts");

// Server function to get plugin content
const getPluginContent = query(async () => {
  "use server";
  const postsFromAPI = await getPosts();
  
  let transformedPosts: Post[];
  
  // Transform database posts to match Post interface
    transformedPosts = postsFromAPI?.map((dbPost: any) => ({
      id: dbPost.id,
      title: dbPost.content?.title || "Untitled Post",
      body: dbPost.content?.body,
      image: dbPost.content?.image,
      author: dbPost.content?.author || "Anonymous",
      community: dbPost.communities?.name || "general",
      createdAt: new Date(dbPost.created_at),
      upvotes: dbPost.content?.upvotes || 0,
      downvotes: dbPost.content?.downvotes || 0,
      comments: dbPost.content?.comments || 0
    }));
  
  const executor = ClientPluginExecutor.getInstance();
  return await executor.executeAllPlugins(transformedPosts);
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
                <For each={pluginContent()?.mainFeed || []} fallback={<div class="text-on-surface-variant">No content available</div>}>
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
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
