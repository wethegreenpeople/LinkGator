import { useLocation } from "@solidjs/router";
import { ThemeSelector } from "./ThemeSelector";

export default function Nav() {
  const location = useLocation();
  const active = (path: string) =>
    path == location.pathname ? "border-primary" : "border-transparent hover:border-primary";
  return (
    <nav class="bg-surface-container border-b border-outline-variant">
      <div class="container flex items-center justify-between p-3">
        <ul class="flex items-center text-on-surface">
          <li class={`border-b-2 ${active("/")} mx-1.5 sm:mx-6`}>
            <a href="/">Home</a>
          </li>
          <li class={`border-b-2 ${active("/about")} mx-1.5 sm:mx-6`}>
            <a href="/about">About</a>
          </li>
          <li class={`border-b-2 ${active("/admin/plugins")} mx-1.5 sm:mx-6`}>
            <a href="/admin/plugins">Plugins</a>
          </li>
        </ul>
        <ThemeSelector />
      </div>
    </nav>
  );
}
