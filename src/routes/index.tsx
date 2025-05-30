import { A } from "@solidjs/router";
import { For } from "solid-js";
import { PostCard } from "~/components/PostCard";
import { mockPosts } from "~/lib/mockData";

export default function Home() {
  return (
    <div class="min-h-screen bg-background">
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
