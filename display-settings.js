"use strict";

(() => {
  const root = document.getElementById("console");
  const dialog = document.getElementById("editor");
  const desktop = matchMedia("(min-width: 768px) and (orientation: landscape)");
  const panels = [
    { title: "화면 1 · 메인", Blur: 0, Opacity: .035, Sheen: .08, Color: "#e1d6f8", Edge: .72, OutlineColor: "#fffdfd", OutlineWidth: 2, OutlineGlow: 5 },
    { title: "화면 2 · 작품 목록", Blur: 14, Opacity: .18, Sheen: .35, Color: "#e1d6f8", Edge: .7 },
    { title: "화면 3 · 조작", Blur: 5, Opacity: .1, Sheen: .26, Color: "#e1d6f8", Edge: .7 }
  ];
  const properties = [
    ["Opacity", "색상 농도", 0, .85, .01],
    ["Blur", "배경 흐림", 0, 36, .5, "px"],
    ["Sheen", "표면 반사", 0, 1, .01],
    ["Saturation", "배경 채도", 0, 2, .05],
    ["Brightness", "배경 밝기", .5, 1.5, .05],
    ["Edge", "가장자리 밝기", 0, 1, .01],
    ["Radius", "모서리 조정", -8, 24, 1, "px"]
  ];
  const coordinates = [
    ["X", "X 좌우", -240, 240, 1, "px"],
    ["Y", "Y 상하", -220, 220, 1, "px"],
    ["Z", "Z 앞뒤", -220, 220, 1, "px"]
  ];
  const outline = [
    ["OutlineWidth", "테두리 두께", 0, 8, .25, "px"],
    ["OutlineGlow", "테두리 빛 번짐", 0, 24, .5, "px"]
  ];
  const slidersFor = index => index === 0 ? [...properties, ...outline] : properties;
  const colorsFor = index => index === 0 ? ["Color", "OutlineColor"] : ["Color"];
  const glassPropertiesFor = index => [...slidersFor(index), ...colorsFor(index).map(name => [name])];
  const panelKey = (index, name) => "screen" + (index + 1) + name;
  const defaults = { frame: true, transparency: 97.4 };
  panels.forEach((panel, index) => {
    const values = { Saturation: 1, Brightness: 1, Radius: 0, X: 0, Y: 0, Z: 0, ...panel };
    for (const [name] of [...glassPropertiesFor(index), ...coordinates]) {
      defaults[panelKey(index, name)] = values[name];
    }
  });
  const settings = { ...defaults };
  const key = "gortfolio.display.v2";
  const feedback = document.getElementById("display-feedback");
  const inputs = new Map();
  try {
    const existing = JSON.parse(localStorage.getItem(key));
    const saved = existing ?? JSON.parse(localStorage.getItem("gortfolio.display.v1"));
    if (typeof saved?.frame === "boolean") settings.frame = saved.frame;
    if (Number.isFinite(saved?.transparency)) settings.transparency = Math.max(0, Math.min(100, saved.transparency));
    panels.forEach((_, index) => {
      const savedKey = name => existing || index === 0 ? panelKey(index, name) : "window" + index + name;
      for (const name of colorsFor(index)) {
        const color = saved?.[savedKey(name)];
        if (/^#[\da-f]{6}$/i.test(color)) settings[panelKey(index, name)] = color;
      }
      for (const [name, , min, max] of [...slidersFor(index), ...coordinates]) {
        const value = saved?.[savedKey(name)];
        if (Number.isFinite(value)) settings[panelKey(index, name)] = Math.max(min, Math.min(max, value));
      }
    });
  } catch {}

  const frame = document.getElementById("device-frame");
  const surfaces = [root.querySelector(".glass"), document.getElementById("rail-glass"), root.querySelector(".mini-glass")];
  const frames = [root.querySelector(".main-frame"), root.querySelector(".rail-window"), root.querySelector(".mini-frame")];
  function apply() {
    const available = desktop.matches && root.dataset.layout === "wide";
    root.dataset.frame = available && !settings.frame ? "off" : "on";
    frame.disabled = !available;
    panels.forEach((_, index) => {
      for (const [name, , , , , unit = ""] of glassPropertiesFor(index)) {
        const value = settings[panelKey(index, name)];
        surfaces[index].style.setProperty("--pane-" + name.toLowerCase(), value + unit);
      }
      for (const [axis, , , , , unit] of coordinates) {
        const property = "--pane-" + axis.toLowerCase();
        frames[index].style.setProperty(property, settings[panelKey(index, axis)] + unit);
        inputs.get(panelKey(index, axis)).input.disabled = !available || settings.frame;
      }
      const customized = index === 0 || glassPropertiesFor(index).some(([name]) => {
        const key = panelKey(index, name);
        return settings[key] !== defaults[key];
      });
      root.toggleAttribute("data-screen-" + (index + 1) + "-glass", customized);
    });
    window.dispatchEvent(new CustomEvent("gortfolio:model-surface", { detail: 1 - settings.transparency / 100 }));
  }
  function save() {
    try {
      localStorage.setItem(key, JSON.stringify(settings));
      feedback.textContent = "이 브라우저에 저장했습니다.";
    } catch { feedback.textContent = "현재 화면에 적용했습니다."; }
  }
  function slider(parent, name, caption, min, max, step, unit = "") {
    const label = document.createElement("label");
    label.className = "glass-slider";
    label.htmlFor = "display-" + name;
    const text = document.createElement("span");
    text.textContent = caption;
    const output = document.createElement("output");
    output.htmlFor = label.htmlFor;
    const input = document.createElement("input");
    input.id = label.htmlFor;
    input.type = "range";
    Object.assign(input, { min, max, step, value: settings[name] });
    output.value = settings[name] + unit;
    input.addEventListener("input", () => {
      settings[name] = input.valueAsNumber;
      output.value = input.value + unit;
      feedback.textContent = "";
      apply();
    });
    input.addEventListener("change", save);
    inputs.set(name, { input, output, unit });
    label.append(text, output, input);
    parent.append(label);
  }
  slider(document.getElementById("model-display-sliders"), "transparency", "표면 투명도", 0, 100, .1, "%");
  const windows = document.getElementById("window-display-settings");
  panels.forEach((panel, index) => {
    const section = document.createElement("details");
    section.open = index === 0;
    const summary = document.createElement("summary");
    summary.textContent = panel.title;
    section.append(summary);
    for (const property of colorsFor(index)) {
      const colorLabel = document.createElement("label");
      colorLabel.className = "window-color";
      colorLabel.textContent = property === "Color" ? "유리 색상" : "테두리 색상";
      const color = document.createElement("input");
      const name = panelKey(index, property);
      color.type = "color";
      color.value = settings[name];
      color.addEventListener("input", () => { settings[name] = color.value; apply(); });
      color.addEventListener("change", save);
      inputs.set(name, { input: color });
      colorLabel.append(color);
      section.append(colorLabel);
    }
    const position = document.createElement("fieldset");
    position.className = "pane-position";
    const legend = document.createElement("legend");
    legend.textContent = "위치 · PC 테두리 OFF";
    position.append(legend);
    for (const [axis, caption, min, max, step, unit] of coordinates) {
      slider(position, panelKey(index, axis), caption, min, max, step, unit);
    }
    section.append(position);
    for (const [property, caption, min, max, step, unit] of slidersFor(index)) {
      slider(section, panelKey(index, property), caption, min, max, step, unit);
    }
    windows.append(section);
  });
  frame.checked = settings.frame;
  frame.addEventListener("change", () => { settings.frame = frame.checked; apply(); save(); });
  document.getElementById("display-reset").addEventListener("click", () => {
    Object.assign(settings, defaults);
    frame.checked = settings.frame;
    for (const [name, { input, output, unit }] of inputs) {
      input.value = settings[name];
      if (output) output.value = settings[name] + unit;
    }
    apply();
    save();
  });
  desktop.addEventListener("change", apply);
  new MutationObserver(apply).observe(root, { attributes: true, attributeFilter: ["data-layout"] });
  apply();

  const handle = dialog.querySelector(".editor-head");
  let drag;
  function position(left, top) {
    const box = dialog.getBoundingClientRect();
    dialog.style.inset = "auto";
    dialog.style.width = box.width + "px";
    dialog.style.left = Math.max(8, Math.min(left, innerWidth - box.width - 8)) + "px";
    dialog.style.top = Math.max(8, Math.min(top, innerHeight - box.height - 8)) + "px";
  }
  handle.addEventListener("pointerdown", event => {
    if (event.button !== 0 || event.target.closest("button")) return;
    const box = dialog.getBoundingClientRect();
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, left: box.left, top: box.top };
    handle.setPointerCapture(event.pointerId);
    handle.classList.add("dragging");
    event.preventDefault();
  });
  handle.addEventListener("pointermove", event => {
    if (!drag) return;
    position(drag.left + event.clientX - drag.x, drag.top + event.clientY - drag.y);
  });
  function finishDrag() {
    if (!drag) return;
    if (handle.hasPointerCapture(drag.id)) handle.releasePointerCapture(drag.id);
    drag = undefined;
    handle.classList.remove("dragging");
  }
  handle.addEventListener("pointerup", finishDrag);
  handle.addEventListener("pointercancel", finishDrag);
  window.addEventListener("resize", () => {
    if (!dialog.open || !dialog.style.left) return;
    dialog.style.width = Math.min(390, innerWidth - 28) + "px";
    const box = dialog.getBoundingClientRect();
    position(box.left, box.top);
  });
  new ResizeObserver(() => {
    if (!dialog.open || !dialog.style.left) return;
    const box = dialog.getBoundingClientRect();
    position(box.left, box.top);
  }).observe(dialog);
})();
