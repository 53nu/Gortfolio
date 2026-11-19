"use strict";

(() => {
  const root = document.getElementById("console");
  const feedback = document.getElementById("glass-feedback");
  const storageKey = "gortfolio.glass.v2";
  const defaults = {
    edgeIntensity: 0.017,
    rimIntensity: 0.112,
    baseIntensity: 0.008,
    edgeDistance: 0.15,
    rimDistance: 0.55,
    baseDistance: 0.1,
    cornerBoost: 0.024,
    rippleEffect: 0.1,
    blurRadius: 4.3,
    tintOpacity: 0.6,
    tintColor: "#8953ee",
    opacity: 0.77,
    sheen: 0.34,
    warp: false
  };
  const sliders = [
    ["tintOpacity", "색상 농도", 0, 1, 0.01],
    ["opacity", "유리 강도", 0, 1, 0.01],
    ["edgeIntensity", "가장자리 굴절", 0, 0.1, 0.001],
    ["rimIntensity", "테두리 굴절", 0, 0.2, 0.001],
    ["blurRadius", "흐림", 1, 15, 0.1],
    ["sheen", "표면 반사", 0, 1, 0.01],
    ["edgeDistance", "가장자리 범위", 0.05, 0.5, 0.01],
    ["rimDistance", "테두리 범위", 0.1, 2, 0.05],
    ["cornerBoost", "모서리 굴절", 0, 0.1, 0.001],
    ["rippleEffect", "표면 굴곡", 0, 0.5, 0.005],
    ["baseIntensity", "중앙 굴절 강도", 0, 0.05, 0.001],
    ["baseDistance", "중앙 굴절 범위", 0.05, 0.3, 0.01]
  ];
  const settings = { ...defaults };
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    for (const [key, , min, max] of sliders) {
      if (Number.isFinite(saved?.[key])) settings[key] = Math.max(min, Math.min(max, saved[key]));
    }
    if (typeof saved?.warp === "boolean") settings.warp = saved.warp;
    if (/^#[\da-f]{6}$/i.test(saved?.tintColor)) settings.tintColor = saved.tintColor;
  } catch {}
  window.glassControls = settings;

  let pending = false;
  let shell;
  const boardImages = {};
  const boardSources = {
    wide: "media/ds-lite-pcb.webp",
    stacked: "media/ds-lite-pcb-portrait.webp"
  };
  function loadBoardImages(sources) {
    for (const [layout, src] of Object.entries(sources)) {
      const image = new Image();
      image.onload = scheduleResize;
      image.onerror = () => { feedback.textContent = "회로 이미지를 불러올 수 없습니다."; };
      image.src = src;
      boardImages[layout] = image;
    }
  }
  if (location.protocol === "file:") {
    const textures = document.createElement("script");
    textures.src = "glass-textures.js?v=1";
    textures.onload = () => loadBoardImages(window.gortfolioGlassTextures);
    textures.onerror = () => { feedback.textContent = "회로 이미지를 불러올 수 없습니다."; };
    document.head.append(textures);
  } else {
    loadBoardImages(boardSources);
  }

  class ConsoleGlass extends Container {
    init() {
      this.createElement();
      this.setupCanvas();
      this.background = document.createElement("canvas");
      this.canvas.addEventListener("webglcontextlost", event => {
        event.preventDefault();
        root.classList.remove("glass-ready");
        feedback.textContent = "유리 효과를 다시 불러오는 중입니다.";
      });
      this.canvas.addEventListener("webglcontextrestored", () => {
        this.gl_refs = {};
        this.webglInitialized = false;
        feedback.textContent = "";
        scheduleResize();
      });
    }

    createElement() {
      super.createElement();
      this.element.className = "shell liquid-shell";
      this.element.setAttribute("aria-hidden", "true");
      this.element.style.borderRadius = "inherit";
      this.canvas.style.borderRadius = "inherit";
      this.canvas.style.zIndex = "0";
      this.canvas.style.boxShadow = "none";
      root.querySelector(".shell").replaceWith(this.element);
    }

    updateSizeFromDOM() {
      const { width, height } = this.element.getBoundingClientRect();
      const image = boardImages[root.dataset.layout];
      if (!width || !height || !image?.naturalWidth || !this.gl || this.gl.isContextLost()) return;
      this.width = Math.ceil(width);
      this.height = Math.ceil(height);
      this.borderRadius = parseFloat(getComputedStyle(root).borderTopLeftRadius);
      const scale = Math.min(window.devicePixelRatio || 1, 1.5);
      this.canvas.width = Math.ceil(width * scale);
      this.canvas.height = Math.ceil(height * scale);
      this.background.width = this.width;
      this.background.height = this.height;
      const context = this.background.getContext("2d");
      context.drawImage(image, 0, 0, this.width, this.height);
      const tint = context.createLinearGradient(0, 0, this.width, 0);
      tint.addColorStop(0, "#d0d6c514");
      tint.addColorStop(1, "#1419103b");
      context.fillStyle = tint;
      context.fillRect(0, 0, this.width, this.height);
      if (!this.webglInitialized) {
        this.setupShader(this.background);
        this.webglInitialized = Boolean(this.gl_refs.texture);
      } else {
        const gl = this.gl;
        gl.bindTexture(gl.TEXTURE_2D, this.gl_refs.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.background);
      }
      if (!this.webglInitialized) return;
      this.render();
      root.classList.add("glass-ready");
    }

    getPosition() {
      return { x: this.width / 2, y: this.height / 2 };
    }

    compileShader(gl, type, source) {
      if (type === gl.FRAGMENT_SHADER) {
        source = source
          .replace("uniform float u_tintOpacity;", "uniform float u_tintOpacity;\nuniform vec3 u_tintColor;")
          .replace("vec3 topTint = vec3(1.0, 1.0, 1.0);", "vec3 topTint = u_tintColor;")
          .replace("vec3 bottomTint = vec3(0.7, 0.7, 0.7);", "vec3 bottomTint = u_tintColor * 0.7;");
      }
      return super.compileShader(gl, type, source);
    }

    startRenderLoop() {
      const gl = this.gl_refs.gl;
      const tintColorLocation = gl.getUniformLocation(gl.getParameter(gl.CURRENT_PROGRAM), "u_tintColor");
      this.render = () => {
        const refs = this.gl_refs;
        const gl = refs.gl;
        if (!gl || gl.isContextLost()) return;
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.uniform2f(refs.resolutionLoc, this.width, this.height);
        gl.uniform2f(refs.textureSizeLoc, this.width, this.height);
        gl.uniform2f(refs.containerPositionLoc, this.width / 2, this.height / 2);
        gl.uniform1f(refs.scrollYLoc, 0);
        gl.uniform1f(refs.borderRadiusLoc, this.borderRadius);
        for (const [key] of sliders) {
          if (refs[key + "Loc"]) gl.uniform1f(refs[key + "Loc"], settings[key]);
        }
        gl.uniform1f(refs.warpLoc, Number(settings.warp));
        const color = [1, 3, 5].map(offset => parseInt(settings.tintColor.slice(offset, offset + 2), 16) / 255);
        gl.uniform3f(tintColorLocation, ...color);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      };
      this.render();
    }
  }

  function scheduleResize() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      if (!shell) return;
      try {
        shell.updateSizeFromDOM();
      } catch {
        root.classList.remove("glass-ready");
        feedback.textContent = "유리 효과를 불러올 수 없어 기본 테두리로 표시합니다.";
      }
    });
  }

  function applySettings() {
    root.style.setProperty("--liquid-opacity", settings.opacity);
    root.style.setProperty("--liquid-sheen", settings.sheen);
    root.style.setProperty("--liquid-tint", settings.tintOpacity);
    root.style.setProperty("--liquid-color", settings.tintColor);
    root.style.setProperty("--liquid-blur", settings.blurRadius + "px");
    shell?.render?.();
  }

  function saveSettings() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(settings));
      feedback.textContent = "이 브라우저에 저장했습니다.";
    } catch {
      feedback.textContent = "현재 화면에 적용했습니다. 브라우저 저장 공간을 사용할 수 없습니다.";
    }
  }

  const colorPicker = document.getElementById("glass-tintColor");
  const colorHex = document.getElementById("glass-colorHex");
  colorPicker.value = colorHex.value = settings.tintColor;
  function updateColor(value) {
    const hex = value.trim().replace(/^#?/, "#");
    if (!/^#[\da-f]{6}$/i.test(hex)) return false;
    settings.tintColor = hex.toLowerCase();
    colorPicker.value = colorHex.value = settings.tintColor;
    feedback.textContent = "";
    applySettings();
    return true;
  }
  colorPicker.addEventListener("input", () => updateColor(colorPicker.value));
  colorPicker.addEventListener("change", saveSettings);
  colorHex.addEventListener("input", () => updateColor(colorHex.value));
  colorHex.addEventListener("change", () => {
    if (updateColor(colorHex.value)) saveSettings();
    else {
      colorHex.value = settings.tintColor;
      feedback.textContent = "#ffffff처럼 여섯 자리 색상 코드를 입력해 주세요.";
    }
  });

  for (const [index, [key, text, min, max, step]] of sliders.entries()) {
    const label = document.createElement("label");
    label.className = "glass-slider";
    const name = document.createElement("span");
    name.textContent = text;
    const value = document.createElement("output");
    const input = document.createElement("input");
    input.id = "glass-" + key;
    label.htmlFor = input.id;
    input.type = "range";
    input.min = min;
    input.max = max;
    input.step = step;
    input.value = settings[key];
    value.setAttribute("for", input.id);
    value.value = settings[key];
    input.addEventListener("input", () => {
      settings[key] = input.valueAsNumber;
      value.value = input.value;
      feedback.textContent = "";
      applySettings();
    });
    input.addEventListener("change", saveSettings);
    label.append(name, value, input);
    document.getElementById(index < 6 ? "glass-sliders" : "glass-advanced").append(label);
  }
  const warp = document.getElementById("glass-warp");
  warp.checked = settings.warp;
  warp.addEventListener("change", () => {
    settings.warp = warp.checked;
    applySettings();
    saveSettings();
  });
  document.getElementById("glass-reset").addEventListener("click", () => {
    Object.assign(settings, defaults);
    for (const [key] of sliders) {
      const input = document.getElementById("glass-" + key);
      input.value = settings[key];
      input.previousElementSibling.value = settings[key];
    }
    warp.checked = settings.warp;
    colorPicker.value = colorHex.value = settings.tintColor;
    applySettings();
    saveSettings();
  });

  applySettings();
  if (typeof Container !== "undefined") {
    shell = new ConsoleGlass({ type: "rounded", borderRadius: 32, tintOpacity: settings.tintOpacity });
    if (!shell.gl) feedback.textContent = "이 브라우저에서는 기본 유리 테두리로 표시합니다.";
    new ResizeObserver(scheduleResize).observe(root);
    new MutationObserver(scheduleResize).observe(root, { attributes: true, attributeFilter: ["data-layout"] });
    window.addEventListener("resize", scheduleResize, { passive: true });
    scheduleResize();
  }
})();
