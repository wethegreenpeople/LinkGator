import { action, redirect, useAction, createAsync, query } from "@solidjs/router";
import { createSignal, Show, For } from "solid-js";
import { PluginManager } from "~/plugins/manager";
import { DatabasePlugin } from "~/models/plugin_models/database-plugin";
import { AuthPlugin } from "~/models/plugin_models/auth-plugin";
import { PluginType } from "~/models/plugin_models/plugin";

const createPost = action(async (formData: FormData) => {
  "use server";
  
  try {
    const title = formData.get("title")?.toString() ?? "";
    const body = formData.get("body")?.toString() ?? "";
    const communityId = formData.get("community")?.toString() ?? "";
    const image = formData.get("image")?.toString() ?? "";
    
    if (!title.trim()) {
      return { error: "Title is required" };
    }
    
    if (!communityId) {
      return { error: "Community is required" };
    }
    
    const pluginManager = PluginManager.getInstance();
    await PluginManager.initializePlugins();
    
    // Get current user session
    const sessionResult = await pluginManager.executeForPlugins<AuthPlugin, {session: any} | null>(
      async (plugin) => await plugin.checkIfLoggedIn(),
      PluginType.AUTH
    );
    
    if (sessionResult.isError() || !sessionResult.value?.session) {
      return { error: "You must be logged in to create a post" };
    }
    
    const authId = sessionResult.value.session.user.id;
    
    // Get user profile to get actor_uri
    const profileResult = await pluginManager.executeForPlugins<DatabasePlugin, any>(
      async (plugin) => await plugin.getProfileFromAuthId(authId),
      PluginType.DATABASE
    );
    
    if (profileResult.isError() || !profileResult.value) {
      return { error: "Could not find user profile" };
    }
    
    const postData = {
      content: {
        title: title.trim(),
        body: body.trim() || null,
        author: profileResult.value.actor_uri,
        image: image.trim() || null,
        upvotes: 0,
        downvotes: 0,
        comments: 0
      },
      community_id: communityId,
      actor_id: profileResult.value.actor_uri,
      uri: `https://${process.env.VITE_DOMAIN}/posts/${Date.now()}`,
      url: `https://${process.env.VITE_DOMAIN}/posts/${Date.now()}`,
      created_at: new Date().toISOString()
    };
    
    const result = await pluginManager.executeForPlugins<DatabasePlugin, any>(
      async (plugin) => await plugin.createPost(postData),
      PluginType.DATABASE
    );
    
    if (result.isError()) {
      console.error('Error creating post:', result.error);
      return { error: "Failed to create post. Please try again." };
    }
    
    return redirect("/");
  } catch (error: any) {
    console.error('Error creating post:', error);
    return { error: error.message || "Failed to create post. Please try again." };
  }
});

// Query to fetch all communities
const getCommunities = query(async () => {
  "use server";
  const pluginManager = PluginManager.getInstance();
  await PluginManager.initializePlugins();
  
  const result = await pluginManager.executeForPlugins<DatabasePlugin, any[]>(
    async (plugin) => await plugin.getAllCommunities(),
    PluginType.DATABASE
  );
  
  if (result.isError()) {
    console.error('Error fetching communities:', result.error);
    return [];
  }
  
  return result.value || [];
}, "communities");

// Query to get current user info
const getCurrentUser = query(async () => {
  "use server";
  const pluginManager = PluginManager.getInstance();
  await PluginManager.initializePlugins();
  
  // Get current user session
  const sessionResult = await pluginManager.executeForPlugins<AuthPlugin, {session: any} | null>(
    async (plugin) => await plugin.checkIfLoggedIn(),
    PluginType.AUTH
  );
  
  if (sessionResult.isError() || !sessionResult.value?.session) {
    return null;
  }
  
  const authId = sessionResult.value.session.user.id;
  
  // Get user profile
  const profileResult = await pluginManager.executeForPlugins<DatabasePlugin, any>(
    async (plugin) => await plugin.getProfileFromAuthId(authId),
    PluginType.DATABASE
  );
  
  if (profileResult.isError() || !profileResult.value) {
    return null;
  }
  
  return profileResult.value;
}, "currentUser");

export default function CreatePost() {
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const createPostAction = useAction(createPost);
  
  // Load communities and user data
  const communities = createAsync(() => getCommunities());
  const currentUser = createAsync(() => getCurrentUser());
  
  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    try {
      const result = await createPostAction(formData);
      if (result?.error) {
        setError(result.error);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div class="min-h-screen bg-background">
      <div class="max-w-4xl mx-auto px-4 py-6">
        <div class="bg-surface rounded-lg shadow-sm border border-outline-variant p-6">
          <h1 class="text-2xl font-semibold text-on-surface mb-6">Create New Post</h1>
          
          {/* Authentication Check */}
          <Show when={currentUser() === null}>
            <div class="mb-6 bg-error-container border border-error/50 p-4 rounded-lg">
              <div class="flex">
                <div class="flex-shrink-0">
                  <svg class="h-5 w-5 text-error" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                  </svg>
                </div>
                <div class="ml-3">
                  <h3 class="text-sm font-medium text-on-error-container">You must be logged in to create a post</h3>
                </div>
              </div>
            </div>
          </Show>
          
          {/* Error Message */}
          <Show when={error()}>
            <div class="mb-6 bg-error-container border border-error/50 p-4 rounded-lg">
              <div class="flex">
                <div class="flex-shrink-0">
                  <svg class="h-5 w-5 text-error" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                  </svg>
                </div>
                <div class="ml-3">
                  <h3 class="text-sm font-medium text-on-error-container">{error()}</h3>
                </div>
              </div>
            </div>
          </Show>
          
          <Show when={currentUser() !== null} fallback={
            <div class="text-center py-8">
              <p class="text-on-surface-variant">Please <a href="/login" class="text-primary hover:text-primary/80">log in</a> to create a post.</p>
            </div>
          }>
            <form onSubmit={handleSubmit} class="space-y-6">
              {/* Title */}
              <div>
                <label for="title" class="block text-sm font-medium text-on-surface mb-2">
                  Title *
                </label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  required
                  maxlength="300"
                  class="block w-full px-4 py-3 bg-surface-variant border border-outline-variant rounded-md text-on-surface placeholder-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                  placeholder="What's your post about?"
                />
              </div>

              {/* Community Dropdown */}
              <div>
                <label for="community" class="block text-sm font-medium text-on-surface mb-2">
                  Community *
                </label>
                <Show when={communities()} fallback={
                  <div class="block w-full px-4 py-3 bg-surface-variant border border-outline-variant rounded-md text-on-surface-variant">
                    Loading communities...
                  </div>
                }>
                  <select
                    id="community"
                    name="community"
                    required
                    class="block w-full px-4 py-3 bg-surface-variant border border-outline-variant rounded-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                  >
                    <option value="">Select a community</option>
                    <For each={communities()}>
                      {(community) => (
                        <option value={community.id}>{community.name}</option>
                      )}
                    </For>
                  </select>
                </Show>
              </div>

              {/* Body */}
              <div>
                <label for="body" class="block text-sm font-medium text-on-surface mb-2">
                  Text (optional)
                </label>
                <textarea
                  id="body"
                  name="body"
                  rows="8"
                  class="block w-full px-4 py-3 bg-surface-variant border border-outline-variant rounded-md text-on-surface placeholder-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 resize-vertical"
                  placeholder="Tell us more about your post..."
                />
              </div>

              {/* Image URL */}
              <div>
                <label for="image" class="block text-sm font-medium text-on-surface mb-2">
                  Image URL (optional)
                </label>
                <input
                  id="image"
                  name="image"
                  type="url"
                  class="block w-full px-4 py-3 bg-surface-variant border border-outline-variant rounded-md text-on-surface placeholder-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              {/* Submit Button */}
              <div class="flex items-center justify-between pt-4">
                <a
                  href="/"
                  class="inline-flex items-center px-4 py-2 border border-outline-variant rounded-md text-sm font-medium text-on-surface bg-surface hover:bg-surface-container transition-colors"
                >
                  Cancel
                </a>
                
                <button
                  type="submit"
                  disabled={isSubmitting()}
                  class="inline-flex items-center px-6 py-2 border border-transparent rounded-md text-sm font-medium text-on-primary bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  <Show when={isSubmitting()} fallback="Create Post">
                    <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-on-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating...
                  </Show>
                </button>
              </div>
            </form>
          </Show>
        </div>
      </div>
    </div>
  );
}
