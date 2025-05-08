import { A, createAsync, query } from "@solidjs/router";
import { For } from "solid-js";
import Counter from "~/components/Counter";
import { kv } from "~/middleware";

const getFollowers = query(async () => {
  "use server"

  const followers: string[] = [];
  for await (const item of kv.list<string>({prefix: ["followers"]})) {
    if (followers.includes(item.value)) continue;
    followers.push(item.value);
  }
  return followers;
}, "getFollowers");

export const route = {
  preload: () => getFollowers()
}

export default function Home() {
  const followers = createAsync(() => getFollowers());

  return (
    <main class="text-center mx-auto text-gray-700 p-4">
      <h1 class="max-6-xs text-6xl text-sky-700 font-thin uppercase my-16">Hello world!</h1>
      <ul class="text-white">
        <For each={followers()}>{(follower) => <li>{follower}</li>}</For>
      </ul>
      <Counter />
      <p class="mt-8">
        Visit{" "}
        <a href="https://solidjs.com" target="_blank" class="text-sky-600 hover:underline">
          solidjs.com
        </a>{" "}
        to learn how to build Solid apps.
      </p>
      <p class="my-4">
        <span>Home</span>
        {" - "}
        <A href="/about" class="text-sky-600 hover:underline">
          About Page
        </A>{" "}
      </p>
    </main>
  );
}
