"use strict";

(() => {
  const root = document.getElementById("console");
  const upper = document.querySelector(".glass");
  const space = document.getElementById("console-space");
  const surfaces = [upper, space].map(host => {
    const canvas = document.createElement("canvas");
    canvas.className = host === space ? "desktop-room" : "room-background";
    canvas.setAttribute("aria-hidden", "true");
    host.prepend(canvas);
    return { host, canvas };
  });
  const panorama = document.createElement("canvas");
  let queued = false;

  function drawRoom(width, height, firstHeight, scale) {
    panorama.width = Math.round(width * scale);
    panorama.height = Math.round(height * scale);
    const ctx = panorama.getContext("2d");
    ctx.scale(scale, scale);
    const light = ctx.createRadialGradient(width * .52, firstHeight * .38, 0, width * .5, firstHeight * .5, width * 1.2);
    light.addColorStop(0, "#faf6ed");
    light.addColorStop(.53, "#ece9f5");
    light.addColorStop(1, "#cdd3f4");
    ctx.fillStyle = light;
    ctx.fillRect(0, 0, width, height);

    function project(radius, theta, y) {
      const depth = 3.8 + radius * Math.cos(theta);
      if (depth < .8) return null;
      const focal = width * 1.13;
      return [width * .5 + radius * Math.sin(theta) * focal / depth,
        firstHeight * .4 - y * focal / depth];
    }
    function meridian(x, t) {
      const progress = Math.max(0, Math.min(1, (t + 4) / 4));
      const bow = x * x / 28 * progress * progress * (3 - 2 * progress);
      let y = -2.45;
      let z = -5.3 - t;
      if (t > 0) {
        const angle = Math.min(Math.PI / 2, t / 1.2);
        y += 1.2 * (1 - Math.cos(angle)) + Math.max(0, t - Math.PI * .6);
        z = -5.3 - 1.2 * Math.sin(angle);
      }
      z += bow;
      return project(Math.hypot(x, z), Math.atan2(x, -z), y);
    }
    function line(points) {
      ctx.beginPath();
      let pen = false;
      for (const point of points) {
        if (!point) { pen = false; continue; }
        if (pen) ctx.lineTo(...point);
        else ctx.moveTo(...point);
        pen = true;
      }
      ctx.stroke();
    }
    ctx.lineWidth = .8;
    ctx.strokeStyle = "rgba(111, 118, 170, .16)";
    for (let column = -30; column <= 30; column++) {
      line(Array.from({ length: 351 }, (_, i) => meridian(column * .4, -12 + i * .08)));
    }
    for (let row = -30; row <= 40; row++) {
      line(Array.from({ length: 241 }, (_, i) => meridian(-12 + i * .1, row * .4)));
    }
    const shade = ctx.createLinearGradient(0, 0, width, 0);
    shade.addColorStop(0, "#68558c19");
    shade.addColorStop(.18, "#68558c00");
    shade.addColorStop(.82, "#68558c00");
    shade.addColorStop(1, "#68558c19");
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, width, height);
  }

  function paint() {
    queued = false;
    const scale = Math.min(2, devicePixelRatio || 1);
    for (const { host, canvas } of surfaces) {
      if (host === space && !(root.dataset.frame === "off" && root.dataset.layout === "wide")) continue;
      const width = host.clientWidth;
      const height = host.clientHeight;
      if (!width || !height) continue;
      drawRoom(width, height, height, scale);
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(panorama, 0, 0, panorama.width, panorama.height, 0, 0, canvas.width, canvas.height);
    }
  }
  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(paint);
  }
  const observer = new ResizeObserver(schedule);
  surfaces.forEach(({ host }) => observer.observe(host));
  new MutationObserver(schedule).observe(root, { attributes: true, attributeFilter: ["data-layout", "data-view", "data-frame"] });
  schedule();
})();
