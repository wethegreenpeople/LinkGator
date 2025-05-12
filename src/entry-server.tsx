// @refresh reload
import { ansiColorFormatter, configure, getConsoleSink } from "@logtape/logtape";
import { createHandler, StartServer } from "@solidjs/start/server";
import { configureLogger } from "./utils/logger";
import { PluginManager } from "./plugins/manager";

// Initialize logger
(async () => {
  await configureLogger();
})().catch(err => {
  console.error("Logger initialization failed:", err);
});

PluginManager.initializePlugins();

export default createHandler(() => (
  <StartServer
    document={({ assets, children, scripts }) => (
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="icon" href="/favicon.ico" />
          {assets}
        </head>
        <body>
          <div id="app">{children}</div>
          {scripts}
        </body>
      </html>
    )}
  />
));
