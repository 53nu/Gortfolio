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
    for (let j = 0; j <= rows; j++) {
      for (let i = 0; i <= columns; i++) {
        data.push(...sample(i / columns, j / rows));
        if (j === rows || i === columns) continue;
        const a = j * (columns + 1) + i;
        const b = a + columns + 1;
        indices.push(a, a + 1, b, a + 1, b + 1, b);
      }
    }
    return { data: new Float32Array(data), indices: new Uint16Array(indices) };
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
    }
    return { data: new Float32Array(data), indices: new Uint16Array(indices) };
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
    part(sphere, "a887e9", [0, 0, 0], [1.15, 1.07, 1.15], identity, 1),
    part(ring(1.43, 1.66, .029), "cf95d7", undefined, undefined, identity, 2),
    part(ring(1.68, 1.93, .033), "f9ccae", undefined, undefined, identity, 2),
    part(ring(1.96, 2.10, .024), "e2afe6", undefined, undefined, identity, 2),
    part(ring(2.15, 2.18, .010), "f3c6ad", undefined, undefined, identity, 2, .16),
    part(sphere, "f997ad", [2.52, .19, -.6], [.215, .215, .215], identity, 1),
    part(sphere, "a7c6ff", [-2.51, .43, -.25], [.105, .105, .105], identity, 1),
    part(sphere, "d2b8fa", [.74, .91, -1.57], [.087, .087, .087], identity, 0, .2)
  ];

  const ripple = [
    part(drop, "64d1ec", [0, .45, 0], [.96, 1, .96], identity, 3),
    part(ring(.64, .73, .045), "c1f1f4", [0, -.77, 0], undefined, identity, 3),
    part(ring(.98, 1.08, .043), "7fd5f3", [0, -.86, 0], undefined, identity, 3),
    part(ring(1.35, 1.45, .036), "739fe7", [0, -.90, 0], undefined, identity, 3),
    part(ring(1.75, 1.81, .025), "aee9f3", [0, -.92, 0], undefined, identity, 3),
    part(sphere, "b4f7fb", [-1.16, .78, .45], [.13, .18, .13], rotation(0, 0, .42), 3),
    part(sphere, "62d8f3", [1.08, .19, -.25], [.18, .24, .18], rotation(0, 0, -.31), 3),
    part(sphere, "88c7ff", [1.42, .77, .33], [.08, .105, .08], identity, 3)
  ];

  const signal = [
    part(roundedBox(2.91, 1.92, 1.13, .21), "e68761"),
    part(roundedBox(2.72, 1.76, .36, .15), "fab488", [0, 0, .53]),
    part(roundedBox(1.95, 1.43, .22, .1), "4c3448", [-.28, .025, .71]),
    part(roundedBox(1.73, 1.21, .12, .055), "233047", [-.28, .025, .81]),
    part(roundedBox(.51, 1.31, .10, .04), "ca6e59", [.96, .025, .73]),
    part(sphere, "fbd8a5", [.96, .31, .84], [.151, .151, .105]),
    part(sphere, "5e3f50", [.96, -.01, .82], [.097, .097, .061]),
    part(sphere, "fce2a0", [1.02, -.52, .805], [.045, .045, .029], identity, 0, .9),
    part(roundedBox(.34, .16, .65, .06), "6c4854", [-.9, -1, 0]),
    part(roundedBox(.34, .16, .65, .06), "6c4854", [.9, -1, 0])
  ];
  const vent = roundedBox(.27, .026, .028, .01);
  for (let i = 0; i < 4; i++) signal.push(part(vent, "784a52", [.96, -.19 - i * .065, .79]));
  const trace = [[-.98, -.02], [-.68, -.02], [-.5, .32], [-.35, -.37], [-.13, .22], [.01, -.02], [.39, -.02]];
  for (let i = 1; i < trace.length; i++) {
    signal.push(segment([...trace[i - 1], .893], [...trace[i], .893], .025, "d2ed9e", .89));
  }

  const bloom = [part(sphere, "f8c9aa", [0, 0, .2], [.44, .44, .31], identity, 3)];
  const petalColors = ["82c9a8", "a5dbbd", "55b89b", "b0dfb1", "79c8af", "aedab0", "77d7bc"];
  for (let i = 0; i < petalColors.length; i++) {
    const angle = i * tau / petalColors.length;
    const position = [-Math.sin(angle) * .95, Math.cos(angle) * .95, -.16];
    bloom.push(part(petal, petalColors[i], position, [.83, .94, .39], rotation(.36, 0, angle), 3));
    const inside = angle + .25;
    bloom.push(part(sphere, "ffd5a7", [Math.cos(inside) * .39, Math.sin(inside) * .39, .4], [.083, .083, .081], identity, 0, .13));
  }
  bloom.push(part(sphere, "def4ad", [1.54, .88, -.23], [.08, .08, .08], identity, 0, .3));

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
    part(letterStroke(-1.05, .04, 1.05, 1.13, .61, 5.08, .115, .21), "8593e7", undefined, undefined, identity, 3),
    part(letterStroke(1.25, -.19, .91, .85, 0, tau, .114, .22), "a6a0ef", undefined, undefined, identity, 3),
    part(roundedBox(.83, .22, .38, .10), "8792e3", [-.34, -.13, 0], undefined, identity, 3),
    part(roundedBox(.24, .66, .38, .10), "8792e3", [-.04, -.35, 0], undefined, identity, 3),
    part(sphere, "8593e7", [-.19, .69, 0], [.116, .117, .20], identity, 3)
  ];

  const maze = [
    part(roundedBox(3.18, 3.18, .35, .15), "8176ba", [0, 0, -.2]),
    part(roundedBox(2.96, 2.96, .14, .058), "353051", [0, 0, -.015]),
    part(sphere, "f5ca7d", [-.90, .79, .22], [.17, .17, .17], identity, 3)
  ];
  const mazeWalls = [
    [-1.30, 0, .11, 2.7], [1.30, 0, .11, 2.7], [0, 1.31, 2.7, .11], [0, -1.31, 2.7, .11],
    [-.79, .42, 1.06, .11], [-.30, .86, .11, .93], [.52, .66, .11, 1.30],
    [.52, .02, 1.55, .11], [-.48, -.42, .11, .81], [.14, -.78, 1.36, .11], [.80, -.57, .11, .53]
  ];
  for (const [x, y, w, h] of mazeWalls) {
    maze.push(part(roundedBox(w, h, .25, .045), "c6b7f2", [x, y, .145], undefined, identity, 3));
  }

  const asterisk = [part(sphere, "f9d0de", [0, 0, 0], [.45, .45, .34], identity, 3)];
  for (let i = 0; i < 6; i++) {
    const angle = tau * i / 6;
    const r = .77;
    asterisk.push(part(roundedBox(1.54, .32, .33, .142), i % 2 ? "dc8fbd" : "edbbdf",
      [Math.cos(angle) * r, Math.sin(angle) * r, 0], undefined, rotation(0, 0, angle), 3));
  }

  const windowModel = [
    part(roundedBox(3.1, 2.34, .5, .19), "d79e6c", undefined, undefined, identity, 3),
    part(roundedBox(2.79, 1.75, .10, .046), "e3e9f6", [0, -.13, .275]),
    part(roundedBox(.81, 1.2, .07, .028), "8396ba", [-.79, -.16, .35]),
    part(roundedBox(1.28, .45, .075, .031), "ad8dba", [.47, .22, .35]),
    part(roundedBox(1.28, .44, .075, .030), "e2b78e", [.47, -.43, .35])
  ];
  for (let i = 0; i < 3; i++) {
    windowModel.push(part(sphere, ["f6d4a5", "f7e4b9", "bfe2c7"][i], [-1.14 + .21 * i, .91, .265], [.066, .066, .044], identity, 3));
  }

  const forms = [
    part(roundedBox(1.19, 1.19, 1.19, .16), "65ab95", [-.87, -.48, 0], undefined, rotation(.16, .3, .34), 3),
    part(sphere, "d998ac", [.83, -.29, -.12], [.63, .63, .63], identity, 3),
    part(drop, "e6bc7b", [.23, .89, .30], [.66, .63, .66], rotation(.11, 0, -.39), 3)
  ];

  const carousel = [
    part(ring(.20, 1.28, .11), "777ba7", [0, -.89, 0], undefined, identity, 3),
    part(ring(.36, 1.33, .11), "c69bd1", [0, .74, 0], undefined, identity, 3),
    part(drop, "e4b2cb", [0, .86, 0], [1.40, .46, 1.40], identity, 3),
    part(sphere, "efd1a1", [0, 1.39, 0], [.12, .13, .12], identity, 3)
  ];
  for (let i = 0; i < 6; i++) {
    const angle = i * tau / 6;
    const x = Math.cos(angle) * .87;
    const z = Math.sin(angle) * .87;
    carousel.push(part(roundedBox(.09, 1.55, .09, .039), "e1b87a", [x, -.09, z], undefined, identity, 3));
    carousel.push(part(sphere, i % 2 ? "e9b2c3" : "b6c6f1", [x, -.25, z], [.19, .24, .19], identity, 3));
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
    part(vaseBody, "d79b84", undefined, undefined, identity, 3),
    part(ring(.55, .68, .052), "ebbc99", [0, 1.12, 0], undefined, identity, 3),
    part(ring(.07, .63, .045), "69536b", [0, -.93, 0])
  ];
  const colorTiles = [
    part(roundedBox(2.8, 2.8, .28, .10), "383b57", [0, 0, -.08]),
    part(roundedBox(1.55, 1.34, .34, .10), "e77489", [-.50, .60, .17]),
    part(roundedBox(.82, 1.34, .34, .10), "e6bd73", [.75, .60, .17]),
    part(roundedBox(.87, .97, .34, .10), "b8b4da", [-.84, -.61, .17]),
    part(roundedBox(1.49, .97, .34, .10), "7697dc", [.42, -.61, .17])
  ];
  const fruit = [
    part(drop, "d47098", [-.92, -.26, .31], [.78, .71, .78], rotation(.04, .10, 2.89), 3),
    part(sphere, "db9ba5", [.63, .23, -.31], [.77, .72, .66], identity, 3),
    part(petal, "91c9a8", [.71, .99, -.32], [.25, .44, .19], rotation(.27, .07, -.55), 3),
    part(petal, "77b49b", [-1.09, .44, .34], [.22, .30, .16], rotation(.24, .12, .65), 3),
    part(sphere, "8cbbaa", [.64, -.56, .37], [.64, .53, .47], identity, 1)
  ];
  const fridge = [
    part(roundedBox(1.60, 2.58, 1.21, .18), "9a8573", undefined, undefined, identity, 3),
    part(roundedBox(1.55, 1.56, .22, .09), "d1b68d", [0, .46, .62], undefined, identity, 3),
    part(roundedBox(1.55, .87, .22, .09), "c3a67d", [0, -.83, .62], undefined, identity, 3),
    part(roundedBox(.13, .62, .12, .05), "eadbb3", [-.54, .43, .78]),
    part(roundedBox(.42, .12, .12, .05), "eadbb3", [0, -.58, .78])
  ];
  const aperture = [];
  for (let i = 0; i < 6; i++) {
    const a = tau * i / 6;
    aperture.push(part(roundedBox(1.61, .17, .24, .075), i % 2 ? "e7a566" : "f0be82",
      [Math.cos(a) * 1.22, Math.sin(a) * 1.22, 0], undefined, rotation(0, 0, a + Math.PI * .5), 3));
  }
  aperture.push(part(sphere, "e6a185", undefined, [.56, .56, .40], identity, 3));

  const tdCube = [part(roundedBox(2.42, 2.42, 2.42, .15), "263329")];
  const square = surface(1, 1, (u, v) => [u - .5, v - .5, 0, 0, 0, 1]);
  const disc = surface(1, 48, (u, v) => [v * Math.cos(u * tau), v * Math.sin(u * tau), 0, 0, 0, 1]);
  const cubeFaces = [identity, rotation(0, tau / 4), rotation(0, tau / 2),
    rotation(0, 3 * tau / 4), rotation(tau / 4), rotation(-tau / 4)];
  for (const face of cubeFaces) {
    const stamp = (mesh, hex, x, y, z, w, h, angle = 0) => tdCube.push(part(
      mesh, hex, transform(face, x, y, z), [w, h, 1], multiply(face, rotation(0, 0, angle)), 0, .46
    ));
    stamp(square, "89976a", 0, 0, 1.211, 2.16, 2.16);
    stamp(square, "111811", 0, .62, 1.214, .095, .93);
    stamp(square, "111811", 0, -.62, 1.214, .095, .93);
    for (const x of [-1, 1]) {
      for (const y of [-1, 1]) {
        stamp(square, "111811", x * .43, y * .43, 1.214, .79, .095, x * y * tau / 8);
        stamp(square, "111811", x * .69, y * .69, 1.214, .32, .32);
      }
    }
    stamp(disc, "111811", 0, 0, 1.217, .53, .53);
    stamp(disc, "f6f6ea", 0, 0, 1.220, .416, .416);
    stamp(square, "111811", 0, 0, 1.223, .23, .23);
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
    { parts: tdCube, pose: [.25, -.49, -.06], icon: [0, 0] }
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
      varying vec3 vLocal;
      varying vec3 vPoint;
      void main() {
        vLocal = aPoint;
        vPoint = uBasis * (aPoint * uSize) + uPosition;
        vNormal = normalize(uBasis * (aNormal / uSize));
        float depth = uCamera.z - vPoint.z;
        gl_Position = vec4(vPoint.x * uCamera.x, vPoint.y * uCamera.y, depth * 1.02 - 1.0, depth);
      }
    `);
    const fragment = shader(gl, gl.FRAGMENT_SHADER, `
      precision mediump float;
      uniform vec3 uColor;
      uniform float uFinish;
      uniform float uEmission;
      varying vec3 vNormal;
      varying vec3 vLocal;
      varying vec3 vPoint;
      void main() {
        vec3 normal = normalize(vNormal);
        vec3 view = normalize(vec3(0.0, 0.0, 9.0) - vPoint);
        vec3 key = normalize(vec3(-.52, .86, .85));
        vec3 fill = normalize(vec3(.85, -.2, .32));
        vec3 rim = normalize(vec3(.33, .56, -.9));
        float diffuse = max(dot(normal, key), 0.0);
        float bounce = max(dot(normal, fill), 0.0);
        float edge = pow(1.0 - max(dot(normal, view), 0.0), 2.5);
        float highlight = pow(max(dot(normal, normalize(view + key)), 0.0), uFinish > 2.5 ? 16.0 : 12.0);
        float edgeLight = max(dot(normal, rim), 0.0) * edge;
        vec3 base = uColor;
        if (uFinish > .5 && uFinish < 1.5) {
          float wave = vLocal.y * 21.0 + sin(vLocal.x * 4.0 + vLocal.z * 3.0) * .8
            + sin(vLocal.x * 12.0 + vLocal.z * 6.0 + vLocal.y * 8.0) * .22;
          float layers = sin(wave) * .095 + sin(wave * .43 + 1.0) * .135;
          float grain = sin(wave * 5.2) * .018;
          base = mix(base, vec3(1.0, .76, .88), clamp(.33 + layers * 1.65, .02, .85));
          base += vec3(layers + grain) * .33;
        }
        if (uFinish > 1.5 && uFinish < 2.5) {
          float radial = length(vLocal.xz);
          base *= .95 + sin(radial * 128.0) * .085 + sin(radial * 44.0) * .06;
        }
        vec3 tinted = base * (.57 + diffuse * .36) + vec3(.23, .15, .32) * (1.0 - diffuse) * .16;
        tinted += bounce * vec3(.20, .15, .30) * .21;
        tinted += edgeLight * vec3(.57, .47, .88) * .18;
        tinted += highlight * vec3(1.0, .92, .94) * (uFinish > 2.5 ? .12 : .08);
        tinted += edge * vec3(.24, .35, .48) * (uFinish > 2.5 ? .15 : .08);
        gl_FragColor = vec4(mix(tinted, base, uEmission), 1.0);
      }
    `);
    const program = gl.createProgram();
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);
    const loc = name => gl.getUniformLocation(program, name);
    const uniforms = Object.fromEntries(["Basis", "Position", "Size", "Camera", "Color", "Finish", "Emission"].map(name => [name, loc("u" + name)]));
    const aPoint = gl.getAttribLocation(program, "aPoint");
    const aNormal = gl.getAttribLocation(program, "aNormal");
    const buffers = new WeakMap();
    gl.enableVertexAttribArray(aPoint);
    gl.enableVertexAttribArray(aNormal);
    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0, 0, 0, 0);

    return (index, yaw, pitch, distance, focal) => {
      if (gl.isContextLost()) return;
      const figure = figures[index];
      const matrix = viewOf(figure, yaw, pitch);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.uniform3f(uniforms.Camera, focal * canvas.height / canvas.width, focal, distance);
      for (const item of figure.parts) {
        const mesh = item.mesh;
        if (!buffers.has(mesh)) {
          const points = gl.createBuffer();
          const indices = gl.createBuffer();
          gl.bindBuffer(gl.ARRAY_BUFFER, points);
          gl.bufferData(gl.ARRAY_BUFFER, mesh.data, gl.STATIC_DRAW);
          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indices);
          gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);
          buffers.set(mesh, { points, indices });
        }
        const buffer = buffers.get(mesh);
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer.points);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer.indices);
        gl.vertexAttribPointer(aPoint, 3, gl.FLOAT, false, 24, 0);
        gl.vertexAttribPointer(aNormal, 3, gl.FLOAT, false, 24, 12);
        gl.uniformMatrix3fv(uniforms.Basis, false, multiply(matrix, item.basis));
        gl.uniform3fv(uniforms.Position, transform(matrix, ...item.position));
        gl.uniform3fv(uniforms.Size, item.size);
        gl.uniform3fv(uniforms.Color, item.color);
        gl.uniform1f(uniforms.Finish, item.finish);
        gl.uniform1f(uniforms.Emission, item.emission);
        gl.drawElements(gl.TRIANGLES, mesh.indices.length, gl.UNSIGNED_SHORT, 0);
      }
    };
  }

  function makeRaster(canvas) {
    const ctx = canvas.getContext("2d");
    return (index, yaw, pitch, distance, focal) => {
      const figure = figures[index];
      const matrix = viewOf(figure, yaw, pitch);
      const width = canvas.width;
      const height = canvas.height;
      const faces = [];
      for (const item of figure.parts) {
        const { data, indices } = item.mesh;
        const basis = multiply(matrix, item.basis);
        const [tx, ty, tz] = transform(matrix, ...item.position);
        const [sx, sy, sz] = item.size;
        const vertices = [];
        for (let i = 0; i < data.length; i += 6) {
          const [x, y, z] = transform(basis, data[i] * sx, data[i + 1] * sy, data[i + 2] * sz);
          const [nx, ny, nz] = transform(basis, data[i + 3] / sx, data[i + 4] / sy, data[i + 5] / sz);
          const ratio = height * focal * .5 / (distance - z - tz);
          const length = Math.hypot(nx, ny, nz) || 1;
          vertices.push([width * .5 + (x + tx) * ratio, height * .5 - (y + ty) * ratio, z + tz, nx / length, ny / length, nz / length, data[i + 1]]);
        }
        for (let i = 0; i < indices.length; i += 3) {
          const a = vertices[indices[i]];
          const b = vertices[indices[i + 1]];
          const c = vertices[indices[i + 2]];
          const nz = (a[5] + b[5] + c[5]) / 3;
          if (nz < -.21) continue;
          const light = Math.max(0, (-.49 * (a[3] + b[3] + c[3]) + .7 * (a[4] + b[4] + c[4])) / 3 + nz * .53);
          const stripe = item.finish === 1 ? Math.sin(a[6] * 22) * .075 : 0;
          const bright = .58 + light * .34 + stripe + item.emission * .21;
          const rim = Math.max(0, .33 - nz) * .09;
          const tint = item.color.map((value, channel) => Math.min(255, Math.round(255 * (value * bright + rim * (channel === 2 ? 1 : .57)))));
          faces.push({ a, b, c, depth: (a[2] + b[2] + c[2]) / 3, fill: "rgb(" + tint.join(",") + ")" });
        }
      }
      ctx.clearRect(0, 0, width, height);
      ctx.lineWidth = .75;
      ctx.lineJoin = "round";
      faces.sort((a, b) => a.depth - b.depth);
      for (const face of faces) {
        ctx.beginPath();
        ctx.moveTo(face.a[0], face.a[1]);
        ctx.lineTo(face.b[0], face.b[1]);
        ctx.lineTo(face.c[0], face.c[1]);
        ctx.closePath();
        ctx.fillStyle = ctx.strokeStyle = face.fill;
        ctx.fill();
        ctx.stroke();
      }
    };
  }

  function renderer(canvas) {
    const gl = canvas.getContext("webgl", { alpha: true, antialias: true, preserveDrawingBuffer: true });
    if (!gl) return makeRaster(canvas);
    let draw = makeGL(canvas, gl);
    canvas.addEventListener("webglcontextrestored", () => { draw = makeGL(canvas, gl); });
    canvas.addEventListener("webglcontextlost", event => event.preventDefault());
    return (...args) => draw(...args);
  }

  function icon(index, canvas, draw) {
    const [pitch, yaw] = figures[index].icon;
    draw(index, yaw, pitch, 9.9, index === 0 ? 3.55 : 4.08);
    return canvas.toDataURL();
  }

  return { renderer, icon };
})();
