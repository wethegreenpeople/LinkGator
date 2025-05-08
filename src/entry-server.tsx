// @refresh reload
import { ansiColorFormatter, configure, getConsoleSink } from "@logtape/logtape";
import { createHandler, StartServer } from "@solidjs/start/server";

await configure({
  reset: true,
  sinks: { console: getConsoleSink({formatter: ansiColorFormatter}) },
  filters: {},
  loggers: [
    { category: "fedify",  sinks: ["console"], lowestLevel: "info" },
    { category: "LinkGator",  sinks: ["console"], lowestLevel: "debug" },
  ],
});

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
