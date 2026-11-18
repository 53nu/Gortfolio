# liquid-glass-js

Copyright (c) 2025 Armagan Amcalar

Source https://github.com/dashersw/liquid-glass-js

Commit 78cb6ccb0b9987bb60a88b14ccbd13a9e6e8ab2a

The original Container implementation is included unchanged in container.js.
Its complete MIT license is included in LICENSE.

Gortfolio's glass-shell.js subclasses Container to sample the circuit-board image
directly, size its canvas for the device pixel ratio, restore the WebGL context,
and update the original shader's parameters through the settings panel.
It adds a tint-color uniform to the compiled fragment shader through the
subclass so the original distributed source remains unchanged.
For local file previews, glass-textures.js embeds the two existing circuit-board
images as data URLs to keep the WebGL source canvas origin-clean.
The integration uses the existing circuit-board images and does not require
the upstream demo's html2canvas page-capture dependency.
