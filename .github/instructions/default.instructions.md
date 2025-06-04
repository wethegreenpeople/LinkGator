---
applyTo: '**'
---
This project is a federated link aggregator, in the style of reddit.
Don't be so aggresive with comments. Code should be self documenting with small, well named functions, and variables. Comments should only be left as doc style comments or for things that are outside the normal.
Code solutions should be as small as possible to achieve the result needed. Extra code is never welcome.
Unit tests should be created for all new features using vitest. Don't create unit tests for components/pages, only utilities.
All designs should follow a dark material 3 theme, and use the variables in the app.css file. Create new variables in the tailwind theme if needed.
When using plugins, you should always executeForPlugins instead of trying to get the first plugin, as it is valid for multiple plugins to be installed.