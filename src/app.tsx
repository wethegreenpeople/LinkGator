import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense, onMount } from "solid-js";
import Nav from "~/components/Nav";
import { ClientThemeManager } from "~/utils/client-theme-manager";
import "./app.css";

export default function App() {
  onMount(() => {
    ClientThemeManager.initFromStorage();
  });

  return (
    <Router
      root={props => (
        <>
          <Nav />
          <Suspense>{props.children}</Suspense>
        </>
      )}
    >
      <FileRoutes />
    </Router>
  );
}
