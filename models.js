"use strict";

const Pocket3D = (() => {
  const tau = Math.PI * 2;
  const identity = [1, 0, 0, 0, 1, 0, 0, 0, 1];

  function transform(m, x, y, z) {
    return [
      m[0] * x + m[3] * y + m[6] * z,
      m[1] * x + m[4] * y + m[7] * z,
      m[2] * x + m[5] * y + m[8] * z
    ];
  }

  function multiply(a, b) {
    return [
      ...transform(a, b[0], b[1], b[2]),
      ...transform(a, b[3], b[4], b[5]),
      ...transform(a, b[6], b[7], b[8])
    ];
  }

  function rotation(x = 0, y = 0, z = 0) {
    const [sx, sy, sz] = [Math.sin(x), Math.sin(y), Math.sin(z)];
    const [cx, cy, cz] = [Math.cos(x), Math.cos(y), Math.cos(z)];
    return multiply(
      [cz, sz, 0, -sz, cz, 0, 0, 0, 1],
      multiply([cy, 0, -sy, 0, 1, 0, sy, 0, cy], [1, 0, 0, 0, cx, sx, 0, -sx, cx])
    );
  }

  function color(hex) {
    return [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  }

  function surface(rows, columns, sample) {
    const data = [];
    const indices = [];
    const wires = [];
    for (let j = 0; j <= rows; j++) {
      for (let i = 0; i <= columns; i++) {
        data.push(...sample(i / columns, j / rows));
        const point = j * (columns + 1) + i;
        if (i < columns) wires.push(point, point + 1);
        if (j < rows) wires.push(point, point + columns + 1);
        if (j === rows || i === columns) continue;
        const a = j * (columns + 1) + i;
        const b = a + columns + 1;
        indices.push(a, a + 1, b, a + 1, b + 1, b);
      }
    }
    return { data: new Float32Array(data), indices: new Uint16Array(indices), wires: new Uint16Array(wires) };
  }

  const sphere = surface(20, 32, (u, v) => {
    const lon = u * tau;
    const lat = (v - 0.5) * Math.PI;
    const point = [Math.cos(lon) * Math.cos(lat), Math.sin(lat), Math.sin(lon) * Math.cos(lat)];
    return [...point, ...point];
  });

  function ring(inner, outer, height) {
    return surface(8, 68, (u, v) => {
      const phi = u * tau;
      const theta = v * tau;
      const co = Math.cos(theta);
      const si = Math.sin(theta);
      const radius = (outer + inner) / 2 + co * (outer - inner) / 2;
      const x = Math.cos(phi);
      const z = Math.sin(phi);
      return [x * radius, si * height, z * radius, x * co * .26, si, z * co * .26];
    });
  }

  function roundedBox(w, h, d, edge) {
    const data = [];
    const indices = [];
    const wires = [];
    const dimensions = [w / 2, h / 2, d / 2];
    for (let side = 0; side < 6; side++) {
      const axis = Math.floor(side / 2);
      const flip = side % 2 ? -1 : 1;
      const uAxis = (axis + 1) % 3;
      const vAxis = (axis + 2) % 3;
      const mesh = surface(7, 7, (u, v) => {
        const local = [0, 0, 0];
        const core = dimensions.map(value => value - edge);
        const grid = [-1, -.91, -.78, -.60, .60, .78, .91, 1];
        local[axis] = dimensions[axis] * flip;
        local[uAxis] = grid[Math.round(u * 7)] * dimensions[uAxis];
        local[vAxis] = grid[Math.round(v * 7)] * dimensions[vAxis];
        const nearest = local.map((value, index) => Math.min(core[index], Math.max(-core[index], value)));
        const delta = local.map((value, index) => value - nearest[index]);
        const length = Math.hypot(...delta);
        const normal = delta.map(value => value / length);
        const point = nearest.map((value, index) => value + normal[index] * edge);
        return [...point, ...normal];
      });
      const offset = data.length / 6;
      data.push(...mesh.data);
      indices.push(...Array.from(mesh.indices, value => value + offset));
      wires.push(...Array.from(mesh.wires, value => value + offset));
    }
    return { data: new Float32Array(data), indices: new Uint16Array(indices), wires: new Uint16Array(wires) };
  }

  const drop = surface(20, 32, (u, v) => {
    const phi = u * tau;
    const angle = v * Math.PI;
    const y = Math.cos(angle);
    const radius = Math.sin(angle) * (0.75 - y * .33);
    const x = Math.cos(phi);
    const z = Math.sin(phi);
    const slope = Math.cos(angle) * (.75 - y * .33) + .33 * Math.sin(angle) ** 2;
    const normal = [x * Math.sin(angle), slope, z * Math.sin(angle)];
    return [x * radius, y * 1.14, z * radius, ...normal];
  });

  const petal = surface(14, 20, (u, v) => {
    const phi = u * tau;
    const angle = (v - .5) * Math.PI;
    const y = Math.sin(angle);
    const profile = Math.cos(angle) * (.7 + .14 * y);
    const x = Math.cos(phi);
    const z = Math.sin(phi);
    return [x * profile * .77, y, z * profile + .42 * y * y, x * Math.cos(angle), y, z * Math.cos(angle)];
  });

  function part(mesh, hex, position = [0, 0, 0], size = [1, 1, 1], basis = identity, finish = 0, emission = 0) {
    return { mesh, color: color(hex), position, size, basis, finish, emission };
  }

  function segment(a, b, width, hex, emission) {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    return part(
      sphere, hex, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, a[2]],
      [Math.hypot(dx, dy) / 2 + width * .72, width, width],
      rotation(0, 0, Math.atan2(dy, dx)), 0, emission
    );
  }

  const orbit = [
    part(sphere, "948abc", [0, 0, 0], [1.15, 1.07, 1.15], identity, 1),
    part(ring(1.43, 1.66, .029), "a87d86", undefined, undefined, identity, 2),
    part(ring(1.68, 1.93, .033), "fbf5df", undefined, undefined, identity, 2),
    part(ring(1.96, 2.10, .024), "e1d6f8", undefined, undefined, identity, 2),
    part(ring(2.15, 2.18, .010), "ea675d", undefined, undefined, identity, 2, .16),
    part(sphere, "ea675d", [2.52, .19, -.6], [.215, .215, .215], identity, 1),
    part(sphere, "cdd3f4", [-2.51, .43, -.25], [.105, .105, .105], identity, 1),
    part(sphere, "e1d6f8", [.74, .91, -1.57], [.087, .087, .087], identity, 0, .2)
  ];

  const ripple = [
    part(drop, "25629b", [0, .45, 0], [.96, 1, .96], identity, 3),
    part(ring(.64, .73, .045), "cdd3f4", [0, -.77, 0], undefined, identity, 3),
    part(ring(.98, 1.08, .043), "948abc", [0, -.86, 0], undefined, identity, 3),
    part(ring(1.35, 1.45, .036), "25629b", [0, -.90, 0], undefined, identity, 3),
    part(ring(1.75, 1.81, .025), "cdd3f4", [0, -.92, 0], undefined, identity, 3),
    part(sphere, "e1d6f8", [-1.16, .78, .45], [.13, .18, .13], rotation(0, 0, .42), 3),
    part(sphere, "25629b", [1.08, .19, -.25], [.18, .24, .18], rotation(0, 0, -.31), 3),
    part(sphere, "cdd3f4", [1.42, .77, .33], [.08, .105, .08], identity, 3)
  ];

  const signal = [
    part(roundedBox(2.91, 1.92, 1.13, .21), "68558c"),
    part(roundedBox(2.72, 1.76, .36, .15), "ea675d", [0, 0, .53]),
    part(roundedBox(1.95, 1.43, .22, .1), "1f1d2a", [-.28, .025, .71]),
    part(roundedBox(1.73, 1.21, .12, .055), "052a6a", [-.28, .025, .81]),
    part(roundedBox(.51, 1.31, .10, .04), "a87d86", [.96, .025, .73]),
    part(sphere, "fbf5df", [.96, .31, .84], [.151, .151, .105]),
    part(sphere, "384593", [.96, -.01, .82], [.097, .097, .061]),
    part(sphere, "fbf5df", [1.02, -.52, .805], [.045, .045, .029], identity, 0, .9),
    part(roundedBox(.34, .16, .65, .06), "1f1d2a", [-.9, -1, 0]),
    part(roundedBox(.34, .16, .65, .06), "1f1d2a", [.9, -1, 0])
  ];
  const vent = roundedBox(.27, .026, .028, .01);
  for (let i = 0; i < 4; i++) signal.push(part(vent, "68558c", [.96, -.19 - i * .065, .79]));
  const trace = [[-.98, -.02], [-.68, -.02], [-.5, .32], [-.35, -.37], [-.13, .22], [.01, -.02], [.39, -.02]];
  for (let i = 1; i < trace.length; i++) {
    signal.push(segment([...trace[i - 1], .893], [...trace[i], .893], .025, "cdd3f4", .89));
  }

  const bloom = [part(sphere, "ea675d", [0, 0, .2], [.44, .44, .31], identity, 3)];
  const petalColors = ["25629b", "948abc", "384593", "cdd3f4", "68558c", "a87d86", "e1d6f8"];
  for (let i = 0; i < petalColors.length; i++) {
    const angle = i * tau / petalColors.length;
    const position = [-Math.sin(angle) * .95, Math.cos(angle) * .95, -.16];
    bloom.push(part(petal, petalColors[i], position, [.83, .94, .39], rotation(.36, 0, angle), 3));
    const inside = angle + .25;
    bloom.push(part(sphere, "fbf5df", [Math.cos(inside) * .39, Math.sin(inside) * .39, .4], [.083, .083, .081], identity, 0, .13));
  }
  bloom.push(part(sphere, "fbf5df", [1.54, .88, -.23], [.08, .08, .08], identity, 0, .3));

  function letterStroke(cx, cy, rx, ry, start, length, width, depth) {
    return surface(12, 72, (u, v) => {
      const angle = start + u * length;
      const profile = v * tau;
      const dx = Math.cos(angle);
      const dy = Math.sin(angle);
      const normal = Math.hypot(dx / rx, dy / ry);
      const nx = dx / (rx * normal);
      const ny = dy / (ry * normal);
      const offset = width * Math.cos(profile);
      const z = depth * Math.sin(profile);
      return [
        cx + dx * rx + nx * offset, cy + dy * ry + ny * offset, z,
        nx * Math.cos(profile) * depth, ny * Math.cos(profile) * depth, Math.sin(profile) * width
      ];
    });
  }

  const go = [
    part(letterStroke(-1.05, .04, 1.05, 1.13, .61, 5.08, .115, .21), "384593", undefined, undefined, identity, 3),
    part(letterStroke(1.25, -.19, .91, .85, 0, tau, .114, .22), "948abc", undefined, undefined, identity, 3),
    part(roundedBox(.83, .22, .38, .10), "384593", [-.34, -.13, 0], undefined, identity, 3),
    part(roundedBox(.24, .66, .38, .10), "384593", [-.04, -.35, 0], undefined, identity, 3),
    part(sphere, "384593", [-.19, .69, 0], [.116, .117, .20], identity, 3)
  ];

  const maze = [
    part(roundedBox(3.18, 3.18, .35, .15), "68558c", [0, 0, -.2]),
    part(roundedBox(2.96, 2.96, .14, .058), "1f1d2a", [0, 0, -.015]),
    part(sphere, "ea675d", [-.90, .79, .22], [.17, .17, .17], identity, 3)
  ];
  const mazeWalls = [
    [-1.30, 0, .11, 2.7], [1.30, 0, .11, 2.7], [0, 1.31, 2.7, .11], [0, -1.31, 2.7, .11],
    [-.79, .42, 1.06, .11], [-.30, .86, .11, .93], [.52, .66, .11, 1.30],
    [.52, .02, 1.55, .11], [-.48, -.42, .11, .81], [.14, -.78, 1.36, .11], [.80, -.57, .11, .53]
  ];
  for (const [x, y, w, h] of mazeWalls) {
    maze.push(part(roundedBox(w, h, .25, .045), "cdd3f4", [x, y, .145], undefined, identity, 3));
  }

  const asterisk = [part(sphere, "e1d6f8", [0, 0, 0], [.45, .45, .34], identity, 3)];
  for (let i = 0; i < 6; i++) {
    const angle = tau * i / 6;
    const r = .77;
    asterisk.push(part(roundedBox(1.54, .32, .33, .142), i % 2 ? "ea675d" : "a87d86",
      [Math.cos(angle) * r, Math.sin(angle) * r, 0], undefined, rotation(0, 0, angle), 3));
  }

  const windowModel = [
    part(roundedBox(3.1, 2.34, .5, .19), "25629b", undefined, undefined, identity, 3),
    part(roundedBox(2.79, 1.75, .10, .046), "e1d6f8", [0, -.13, .275]),
    part(roundedBox(.81, 1.2, .07, .028), "cdd3f4", [-.79, -.16, .35]),
    part(roundedBox(1.28, .45, .075, .031), "948abc", [.47, .22, .35]),
    part(roundedBox(1.28, .44, .075, .030), "a87d86", [.47, -.43, .35])
  ];
  for (let i = 0; i < 3; i++) {
    windowModel.push(part(sphere, ["ea675d", "fbf5df", "cdd3f4"][i], [-1.14 + .21 * i, .91, .265], [.066, .066, .044], identity, 3));
  }

  const forms = [
    part(roundedBox(1.19, 1.19, 1.19, .16), "25629b", [-.87, -.48, 0], undefined, rotation(.16, .3, .34), 3),
    part(sphere, "ea675d", [.83, -.29, -.12], [.63, .63, .63], identity, 3),
    part(drop, "948abc", [.23, .89, .30], [.66, .63, .66], rotation(.11, 0, -.39), 3)
  ];

  const carousel = [
    part(ring(.20, 1.28, .11), "384593", [0, -.89, 0], undefined, identity, 3),
    part(ring(.36, 1.33, .11), "68558c", [0, .74, 0], undefined, identity, 3),
    part(drop, "ea675d", [0, .86, 0], [1.40, .46, 1.40], identity, 3),
    part(sphere, "fbf5df", [0, 1.39, 0], [.12, .13, .12], identity, 3)
  ];
  for (let i = 0; i < 6; i++) {
    const angle = i * tau / 6;
    const x = Math.cos(angle) * .87;
    const z = Math.sin(angle) * .87;
    carousel.push(part(roundedBox(.09, 1.55, .09, .039), "fbf5df", [x, -.09, z], undefined, identity, 3));
    carousel.push(part(sphere, i % 2 ? "a87d86" : "cdd3f4", [x, -.25, z], [.19, .24, .19], identity, 3));
  }

  const vaseBody = surface(30, 48, (u, v) => {
    const angle = u * tau;
    const height = v * 2.24 - 1.12;
    const profile = .49 + .34 * Math.exp(-((v - .31) ** 2) / .083) + .13 * Math.exp(-((v - .96) ** 2) / .012);
    const radius = profile + Math.cos(v * 211) * .017 + Math.cos(angle * 11 + v * 13) * .025;
    return [Math.cos(angle) * radius, height, Math.sin(angle) * radius,
      Math.cos(angle), (v - .44) * .42, Math.sin(angle)];
  });
  const vase = [
    part(vaseBody, "a87d86", undefined, undefined, identity, 3),
    part(ring(.55, .68, .052), "e1d6f8", [0, 1.12, 0], undefined, identity, 3),
    part(ring(.07, .63, .045), "68558c", [0, -.93, 0])
  ];
  const colorTiles = [
    part(roundedBox(2.8, 2.8, .28, .10), "1f1d2a", [0, 0, -.08]),
    part(roundedBox(1.55, 1.34, .34, .10), "ea675d", [-.50, .60, .17]),
    part(roundedBox(.82, 1.34, .34, .10), "fbf5df", [.75, .60, .17]),
    part(roundedBox(.87, .97, .34, .10), "948abc", [-.84, -.61, .17]),
    part(roundedBox(1.49, .97, .34, .10), "25629b", [.42, -.61, .17])
  ];
  const fruit = [
    part(drop, "ea675d", [-.92, -.26, .31], [.78, .71, .78], rotation(.04, .10, 2.89), 3),
    part(sphere, "a87d86", [.63, .23, -.31], [.77, .72, .66], identity, 3),
    part(petal, "25629b", [.71, .99, -.32], [.25, .44, .19], rotation(.27, .07, -.55), 3),
    part(petal, "03387d", [-1.09, .44, .34], [.22, .30, .16], rotation(.24, .12, .65), 3),
    part(sphere, "68558c", [.64, -.56, .37], [.64, .53, .47], identity, 1)
  ];
  const fridge = [
    part(roundedBox(1.60, 2.58, 1.21, .18), "68558c", undefined, undefined, identity, 3),
    part(roundedBox(1.55, 1.56, .22, .09), "e1d6f8", [0, .46, .62], undefined, identity, 3),
    part(roundedBox(1.55, .87, .22, .09), "948abc", [0, -.83, .62], undefined, identity, 3),
    part(roundedBox(.13, .62, .12, .05), "fbf5df", [-.54, .43, .78]),
    part(roundedBox(.42, .12, .12, .05), "fbf5df", [0, -.58, .78])
  ];
  const aperture = [];
  for (let i = 0; i < 6; i++) {
    const a = tau * i / 6;
    aperture.push(part(roundedBox(1.61, .17, .24, .075), i % 2 ? "ea675d" : "a87d86",
      [Math.cos(a) * 1.22, Math.sin(a) * 1.22, 0], undefined, rotation(0, 0, a + Math.PI * .5), 3));
  }
  aperture.push(part(sphere, "fbf5df", undefined, [.56, .56, .40], identity, 3));

  const tdCube = [part(roundedBox(2.42, 2.42, 2.42, .15), "052a6a")];
  const square = surface(1, 1, (u, v) => [u - .5, v - .5, 0, 0, 0, 1]);
  const disc = surface(1, 48, (u, v) => [v * Math.cos(u * tau), v * Math.sin(u * tau), 0, 0, 0, 1]);
  const cubeFaces = [identity, rotation(0, tau / 4), rotation(0, tau / 2),
    rotation(0, 3 * tau / 4), rotation(tau / 4), rotation(-tau / 4)];
  for (const face of cubeFaces) {
    const stamp = (mesh, hex, x, y, z, w, h, angle = 0) => tdCube.push(part(
      mesh, hex, transform(face, x, y, z), [w, h, 1], multiply(face, rotation(0, 0, angle)), 0, .46
    ));
    stamp(square, "cdd3f4", 0, 0, 1.211, 2.16, 2.16);
    stamp(square, "1f1d2a", 0, .62, 1.214, .095, .93);
    stamp(square, "1f1d2a", 0, -.62, 1.214, .095, .93);
    for (const x of [-1, 1]) {
      for (const y of [-1, 1]) {
        stamp(square, "1f1d2a", x * .43, y * .43, 1.214, .79, .095, x * y * tau / 8);
        stamp(square, "1f1d2a", x * .69, y * .69, 1.214, .32, .32);
      }
    }
    stamp(disc, "1f1d2a", 0, 0, 1.217, .53, .53);
    stamp(disc, "fbf5df", 0, 0, 1.220, .416, .416);
    stamp(square, "1f1d2a", 0, 0, 1.223, .23, .23);
  }

  const cardboard = "fbf5df";
  const foldedEdge = "a87d86";
  const lensFace = rotation(Math.PI / 2);
  const viewer = [
    part(roundedBox(3.2, .10, 1.46, .022), cardboard, [0, .72, 0]),
    part(roundedBox(3.19, 1.40, .10, .035), cardboard, [0, .01, -.81]),
    part(roundedBox(3.12, .055, .17, .018), foldedEdge, [0, .695, -.77]),
    part(roundedBox(.29, .075, .39, .023), foldedEdge, [1.09, .785, -.37]),
    part(roundedBox(.24, .19, .075, .021), "68558c", [0, .49, -.875])
  ];
  const rim = ring(.39, .474, .038);
  const innerRim = ring(.36, .403, .021);
  for (const side of [-1, 1]) {
    const x = side * .79;
    const face = surface(1, 64, (u, v) => {
      const dx = Math.cos(u * tau);
      const dy = Math.sin(u * tau);
      const radius = Math.min(.79 / Math.abs(dx), (dy >= 0 ? .68 : .77) / Math.abs(dy));
      const edgeX = x + dx * radius;
      const noseCut = Math.max(0, .38 - Math.abs(edgeX));
      const edgeY = Math.max(dy * radius, -.77 + noseCut * 1.12);
      return [x + dx * .43 * (1 - v) + (edgeX - x) * v, .07 + dy * .43 * (1 - v) + edgeY * v,
        .72, 0, 0, 1];
    });
    viewer.push(
      part(face, cardboard),
      part(roundedBox(.091, 1.39, 1.43, .026), cardboard, [side * 1.54, .007, -.016]),
      part(roundedBox(1.19, .11, 1.48, .023), cardboard, [side * .99, -.65, -.03]),
      part(roundedBox(.04, 1.25, .055, .009), foldedEdge, [side * 1.56, .012, .724]),
      part(roundedBox(1.15, .035, .061, .012), foldedEdge, [side * .99, -.69, .722]),
      part(roundedBox(.055, .10, .91, .015), foldedEdge, [side * 1.586, .60, -.11]),
      part(roundedBox(.22, .31, .063, .014), "a87d86", [side * 1.34, .24, -.874]),
      part(rim, foldedEdge, [x, .07, .744], undefined, lensFace),
      part(innerRim, "1f1d2a", [x, .07, .735], undefined, lensFace),
      part(sphere, "052a6a", [x, .07, .672], [.372, .372, .082]),
      part(sphere, "25629b", [x, .07, .733], [.342, .342, .066], identity, 3),
      part(sphere, "cdd3f4", [x - .126, .203, .786], [.071, .028, .011], rotation(0, 0, .55), 0, .45)
    );
  }

  const figures = [
    { parts: orbit, pose: [-.50, -.16, .31], icon: [.08, -.35] },
    { parts: ripple, pose: [-.32, 0, -.07], icon: [.09, .12] },
    { parts: signal, pose: [.05, -.38, .07], icon: [-.13, .08] },
    { parts: bloom, pose: [.04, -.23, .12], icon: [.04, -.18] },
    { parts: go, pose: [.03, .23, -.04], icon: [0, 0] },
    { parts: maze, pose: [.21, -.23, -.2], icon: [0, 0] },
    { parts: asterisk, pose: [.07, -.36, .12], icon: [0, 0] },
    { parts: windowModel, pose: [.13, -.33, -.09], icon: [0, 0] },
    { parts: forms, pose: [.11, -.23, .11], icon: [0, 0] },
    { parts: carousel, pose: [-.15, -.21, .06], icon: [0, 0] },
    { parts: vase, pose: [-.12, -.21, -.08], icon: [0, 0] },
    { parts: colorTiles, pose: [.18, -.20, .10], icon: [0, 0] },
    { parts: fruit, pose: [-.12, -.19, .07], icon: [0, 0] },
    { parts: fridge, pose: [.12, -.29, -.07], icon: [0, 0] },
    { parts: aperture, pose: [.12, -.21, -.02], icon: [0, 0] },
    { parts: tdCube, pose: [.25, -.49, -.06], icon: [0, 0] },
    { parts: viewer, pose: [.21, -.40, -.075], icon: [0, 0] }
  ];

  function viewOf(figure, yaw, pitch) {
    const [x, y, z] = figure.pose;
    return multiply(rotation(x + pitch, 0, z), rotation(0, y + yaw));
  }

  function shader(gl, type, source) {
    const code = gl.createShader(type);
    gl.shaderSource(code, source);
    gl.compileShader(code);
    if (!gl.getShaderParameter(code, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(code));
    return code;
  }

  const labelMeshes = new Map();
  const labelColor = color("384593");
  const labelFont = "700 40px system-ui, sans-serif";
  const labelHeight = -2.02;
  const labelSize = .0075;

  function labelMesh(text) {
    if (labelMeshes.has(text)) return labelMeshes.get(text);
    const glyph = document.createElement("canvas");
    const ctx = glyph.getContext("2d", { willReadFrequently: true });
    ctx.font = labelFont;
    glyph.width = Math.ceil(ctx.measureText(text).width) + 8;
    glyph.height = 64;
    ctx.font = labelFont;
    ctx.fillText(text, 4, 44);
    const { width, height } = glyph;
    const { data: pixels } = ctx.getImageData(0, 0, width, height);
    const filled = (x, y) => x >= 0 && x < width && y >= 0 && y < height &&
      pixels[(y * width + x) * 4 + 3] >= 128;
    const data = [];
    const indices = [];
    const front = .035;
    const back = -front;
    function quad(points, normal) {
      const start = data.length / 6;
      for (const [x, y, z] of points) {
        data.push((x - width / 2) * labelSize, (38 - y) * labelSize, z, ...normal);
      }
      indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
    }
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (!filled(x, y)) continue;
        if (!filled(x - 1, y)) {
          let right = x + 1;
          while (filled(right, y)) right++;
          for (const z of [front, back]) {
            quad([[x, y, z], [right, y, z], [right, y + 1, z], [x, y + 1, z]], [0, 0, Math.sign(z)]);
          }
          quad([[x, y, back], [x, y, front], [x, y + 1, front], [x, y + 1, back]], [-1, 0, 0]);
          quad([[right, y, back], [right, y, front], [right, y + 1, front], [right, y + 1, back]], [1, 0, 0]);
        }
        for (const dy of [-1, 1]) {
          if (filled(x, y + dy)) continue;
          const edge = y + Number(dy > 0);
          quad([[x, edge, back], [x + 1, edge, back], [x + 1, edge, front], [x, edge, front]], [0, -dy, 0]);
        }
      }
    }
    const mesh = { data: new Float32Array(data), indices: new Uint16Array(indices), wires: new Uint16Array() };
    labelMeshes.set(text, mesh);
    return mesh;
  }

  function makeGL(canvas, gl) {
    const vertex = shader(gl, gl.VERTEX_SHADER, `
      precision mediump float;
      attribute vec3 aPoint;
      attribute vec3 aNormal;
      uniform mat3 uBasis;
      uniform vec3 uPosition;
      uniform vec3 uSize;
      uniform vec3 uCamera;
      varying vec3 vNormal;
      varying vec3 vPoint;
      void main() {
        vPoint = uBasis * (aPoint * uSize) + uPosition;
        vNormal = normalize(uBasis * (aNormal / uSize));
        float depth = uCamera.z - vPoint.z;
        gl_Position = vec4(vPoint.x * uCamera.x, vPoint.y * uCamera.y, depth * 1.02 - 1.0, depth);
      }
    `);
    const fragment = shader(gl, gl.FRAGMENT_SHADER, `
      precision mediump float;
      uniform vec3 uColor;
      uniform float uPass;
      uniform float uSurfaceOpacity;
      uniform float uModelOpacity;
      uniform vec3 uCamera;
      varying vec3 vNormal;
      varying vec3 vPoint;
      void main() {
        vec3 normal = normalize(vNormal);
        vec3 view = normalize(vec3(0.0, 0.0, uCamera.z) - vPoint);
        if (uPass > 1.5) {
          if (dot(normal, view) <= 0.0) discard;
          gl_FragColor = vec4(uColor * (.7 + .3 * max(0.0, normal.z)), uModelOpacity);
          return;
        }
        float facing = smoothstep(-.35, .65, dot(normal, view));
        vec3 ink = mix(vec3(.23, .28, .53), uColor, .52);
        ink = mix(ink, vec3(.32, .37, .66), .22);
        float alpha = uPass < .5 ? uSurfaceOpacity : mix(.11, .77, facing);
        gl_FragColor = vec4(ink, alpha * uModelOpacity);
      }
    `);
    const program = gl.createProgram();
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);
    const uniforms = Object.fromEntries(["Basis", "Position", "Size", "Camera", "Color", "Pass", "SurfaceOpacity", "ModelOpacity"].map(name => [name, gl.getUniformLocation(program, "u" + name)]));
    const aPoint = gl.getAttribLocation(program, "aPoint");
    const aNormal = gl.getAttribLocation(program, "aNormal");
    const buffers = new WeakMap();
    gl.enableVertexAttribArray(aPoint);
    gl.enableVertexAttribArray(aNormal);
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);

    function bindPoints(points) {
      gl.bindBuffer(gl.ARRAY_BUFFER, points);
      gl.vertexAttribPointer(aPoint, 3, gl.FLOAT, false, 24, 0);
      gl.vertexAttribPointer(aNormal, 3, gl.FLOAT, false, 24, 12);
    }

    function meshBuffers(mesh) {
      if (buffers.has(mesh)) return buffers.get(mesh);
      const points = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, points);
      gl.bufferData(gl.ARRAY_BUFFER, mesh.data, gl.STATIC_DRAW);
      const indices = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indices);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);
      const wires = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, wires);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.wires, gl.STATIC_DRAW);
      const buffer = { points, indices, wires };
      buffers.set(mesh, buffer);
      return buffer;
    }

    return (models, distance, focal, surfaceOpacity) => {
      if (gl.isContextLost()) return;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform3f(uniforms.Camera, focal * canvas.height / canvas.width, focal, distance);
      gl.uniform1f(uniforms.SurfaceOpacity, surfaceOpacity);
      for (const { index, yaw, pitch, position, scale, opacity, label, labelYaw } of models) {
        const figure = figures[index];
        const matrix = viewOf(figure, yaw, pitch);
        gl.uniform1f(uniforms.ModelOpacity, opacity);
        for (const pass of surfaceOpacity ? [0, 1] : [1]) {
          gl.uniform1f(uniforms.Pass, pass);
          for (const item of figure.parts) {
            const mesh = item.mesh;
            const buffer = meshBuffers(mesh);
            bindPoints(buffer.points);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, pass ? buffer.wires : buffer.indices);
            gl.uniformMatrix3fv(uniforms.Basis, false, multiply(matrix, item.basis));
            const offset = transform(matrix, ...item.position);
            gl.uniform3fv(uniforms.Position, offset.map((value, axis) => position[axis] + value * scale));
            gl.uniform3fv(uniforms.Size, item.size.map(value => value * scale));
            gl.uniform3fv(uniforms.Color, item.color);
            gl.drawElements(pass ? gl.LINES : gl.TRIANGLES, pass ? mesh.wires.length : mesh.indices.length, gl.UNSIGNED_SHORT, 0);
          }
        }
        if (label) {
          const mesh = labelMesh(label);
          const buffer = meshBuffers(mesh);
          gl.enable(gl.DEPTH_TEST);
          gl.clear(gl.DEPTH_BUFFER_BIT);
          gl.uniform1f(uniforms.Pass, 2);
          gl.uniformMatrix3fv(uniforms.Basis, false, rotation(0, labelYaw));
          gl.uniform3f(uniforms.Position, position[0], position[1] + labelHeight, position[2]);
          gl.uniform3f(uniforms.Size, 1, 1, 1);
          gl.uniform3fv(uniforms.Color, labelColor);
          bindPoints(buffer.points);
          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer.indices);
          gl.drawElements(gl.TRIANGLES, mesh.indices.length, gl.UNSIGNED_SHORT, 0);
          gl.disable(gl.DEPTH_TEST);
        }
      }
    };
  }

  function makeRaster(canvas) {
    const ctx = canvas.getContext("2d");
    return (models, distance, focal, surfaceOpacity) => {
      const width = canvas.width;
      const height = canvas.height;
      function project(x, y, z) {
        const scale = height * focal * .5 / (distance - z);
        return [width * .5 + x * scale, height * .5 - y * scale];
      }
      ctx.clearRect(0, 0, width, height);
      ctx.lineWidth = .7;
      for (const { index, yaw, pitch, position, scale, opacity, label, labelYaw } of models) {
        const figure = figures[index];
        const matrix = viewOf(figure, yaw, pitch);
        ctx.globalAlpha = opacity;
        for (const item of figure.parts) {
          const { data, wires, indices } = item.mesh;
          const basis = multiply(matrix, item.basis);
          const offset = transform(matrix, ...item.position);
          const vertices = [];
          for (let i = 0; i < data.length; i += 6) {
            const point = transform(basis, data[i] * item.size[0], data[i + 1] * item.size[1], data[i + 2] * item.size[2]);
            vertices.push(project(...point.map((value, axis) => position[axis] + (value + offset[axis]) * scale)));
          }
          const ink = item.color.map(value => Math.round(255 * (value * .5 + .16)));
          if (surfaceOpacity > 0) {
            ctx.fillStyle = "rgba(" + ink.join(",") + "," + surfaceOpacity + ")";
            for (let i = 0; i < indices.length; i += 3) {
              ctx.beginPath();
              ctx.moveTo(...vertices[indices[i]]);
              ctx.lineTo(...vertices[indices[i + 1]]);
              ctx.lineTo(...vertices[indices[i + 2]]);
              ctx.closePath();
              ctx.fill();
            }
          }
          ctx.strokeStyle = "rgba(" + ink.join(",") + ",.5)";
          ctx.beginPath();
          for (let i = 0; i < wires.length; i += 2) {
            ctx.moveTo(...vertices[wires[i]]);
            ctx.lineTo(...vertices[wires[i + 1]]);
          }
          ctx.stroke();
        }
        if (label) {
          const [x, y] = project(position[0], position[1] + labelHeight, position[2]);
          const size = 40 * labelSize * height * focal * .5 / (distance - position[2]);
          ctx.save();
          ctx.translate(x, y);
          ctx.scale(Math.cos(labelYaw), 1);
          ctx.font = "700 " + size + "px system-ui, sans-serif";
          ctx.textAlign = "center";
          ctx.fillStyle = "#384593";
          ctx.fillText(label, 0, size * .15);
          ctx.restore();
        }
      }
      ctx.globalAlpha = 1;
    };
  }

  function renderer(canvas) {
    const gl = canvas.getContext("webgl", { alpha: true, antialias: true, preserveDrawingBuffer: true });
    let draw = gl ? makeGL(canvas, gl) : makeRaster(canvas);
    if (gl) {
      canvas.addEventListener("webglcontextrestored", () => { draw = makeGL(canvas, gl); });
      canvas.addEventListener("webglcontextlost", event => event.preventDefault());
    }
    return (models, distance, focal, surfaceOpacity = .026) => draw(models, distance, focal, surfaceOpacity);
  }

  function icon(index, canvas, draw) {
    const [pitch, yaw] = figures[index].icon;
    draw([{ index, yaw, pitch, position: [0, 0, 0], scale: 1, opacity: 1 }], 9.9, index === 0 ? 3.55 : 4.08);
    return canvas.toDataURL();
  }

  return { renderer, icon };
})();
