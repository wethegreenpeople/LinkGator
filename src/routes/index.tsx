import { A } from "@solidjs/router";
import { For } from "solid-js";
import { PostCard } from "~/components/PostCard";
import { mockPosts } from "~/lib/mockData";

export default function Home() {
  return (
    <div class="min-h-screen bg-gray-950">
      <header class="bg-gray-700 border-b border-gray-600 sticky top-0 z-10">
        <div class="max-w-4xl mx-auto px-4 py-3">
          <h1 class="text-xl font-bold text-gray-100">LinkGator</h1>
        </div>
      </header>
      
      <main class="max-w-4xl mx-auto px-4 py-6">
        <div class="space-y-4">
          <For each={mockPosts}>
            {(post) => <PostCard post={post} />}
          </For>
        </div>
      </main>
    </div>
  );
}
