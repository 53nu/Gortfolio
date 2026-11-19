"use strict";

(() => {
  const root = document.getElementById("console");
  const pressSelector = ".tile, .link-tile, .icon-button, .physical-home, .project-channel, .rail-return, .media-open, .tags button";
  const pressTimers = new WeakMap();
  let pressed;
  let pressPoint;
  function releasePress(delay = 180) {
    if (!pressed) return;
    const item = pressed;
    pressed = undefined;
    clearTimeout(pressTimers.get(item));
    pressTimers.set(item, setTimeout(() => item.classList.remove("is-pressed"), delay));
  }
  root.addEventListener("pointerdown", event => {
    const item = event.target.closest(pressSelector);
    if (!item || item.disabled || event.button !== 0) return;
    releasePress(0);
    clearTimeout(pressTimers.get(item));
    item.classList.add("is-pressed");
    pressed = item;
    pressPoint = { x: event.clientX, y: event.clientY };
  });
  root.addEventListener("pointermove", event => {
    if (pressed && Math.hypot(event.clientX - pressPoint.x, event.clientY - pressPoint.y) > 6) releasePress(0);
  });
  window.addEventListener("pointerup", () => releasePress());
  window.addEventListener("pointercancel", () => releasePress(0));
  root.addEventListener("keydown", event => {
    if (!["Enter", " "].includes(event.key) || event.repeat) return;
    const item = event.target.closest(pressSelector);
    if (!item || item.disabled) return;
    pressed = item;
    item.classList.add("is-pressed");
  });
  root.addEventListener("keyup", event => {
    if (["Enter", " "].includes(event.key)) releasePress();
  });

  const carousel = document.getElementById("tiles");
  const pager = document.getElementById("pips");
  const items = [...carousel.children];
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  let gesture;
  let scrubbing = false;
  let settle;
  let animation;
  let paintFrame;
  let userScroll = false;
  let suppressClick = false;
  let wheelStart;

  function target(index) {
    const item = items[index];
    return item.offsetLeft - (carousel.clientWidth - item.offsetWidth) / 2;
  }
  function closest(position = carousel.scrollLeft) {
    return items.reduce((best, _, index) => Math.abs(target(index) - position) < Math.abs(target(best) - position) ? index : best, 0);
  }
  function linkModel() {
    if (root.dataset.layout !== "stacked" || target(1) <= target(0)) {
      setModelCarouselPosition(null);
      return;
    }
    const nearest = closest();
    const offset = carousel.scrollLeft - target(nearest);
    const next = Math.max(0, Math.min(items.length - 1, nearest + Math.sign(offset)));
    const distance = Math.abs(target(next) - target(nearest));
    setModelCarouselPosition(distance && Math.abs(offset) > 1 ? nearest + offset / distance : nearest);
  }
  function moveCarousel(position) {
    carousel.scrollLeft = position;
    linkModel();
    queuePaint();
  }
  function paintCarousel() {
    paintFrame = undefined;
    linkModel();
    if (root.dataset.layout !== "stacked") return;
    const step = Math.max(1, target(1) - target(0));
    const nearest = closest();
    for (const [index, item] of items.entries()) {
      const distance = Math.max(-2.5, Math.min(2.5, (target(index) - carousel.scrollLeft) / step));
      const edge = Math.abs(distance);
      item.style.setProperty("--arc-angle", -distance * 34 + "deg");
      item.style.setProperty("--arc-depth", -(edge ** 1.3) * 38 + "px");
      item.style.setProperty("--arc-scale", 1 - Math.min(.23, edge * .1));
      item.style.setProperty("--arc-opacity", 1 - Math.min(.64, edge * .46));
      item.style.setProperty("--arc-blur", Math.min(.7, edge * .3) + "px");
      pager.children[index].classList.toggle("active", index === nearest);
    }
    const announced = scrubbing || gesture || userScroll ? nearest : items.findIndex(item => item.getAttribute("aria-current") === "true");
    pager.setAttribute("aria-valuenow", announced);
    pager.setAttribute("aria-valuetext", items[announced].getAttribute("aria-label"));
  }
  function queuePaint() {
    if (!paintFrame) paintFrame = requestAnimationFrame(paintCarousel);
  }
  function cancelAnimation() {
    cancelAnimationFrame(animation);
    clearTimeout(settle);
  }
  function center(index, behavior = "smooth") {
    cancelAnimation();
    userScroll = false;
    wheelStart = undefined;
    if (root.dataset.layout !== "stacked") return;
    const from = carousel.scrollLeft;
    const to = target(index);
    if (behavior === "instant" || reducedMotion.matches || Math.abs(to - from) < .5) {
      moveCarousel(to);
      return;
    }
    const started = performance.now();
    const duration = Math.min(560, 340 + Math.abs(to - from) * .35);
    function step(now) {
      const t = Math.min(1, (now - started) / duration);
      const eased = 1 - (1 - t) ** 4;
      moveCarousel(from + (to - from) * eased);
      if (t < 1) animation = requestAnimationFrame(step);
    }
    animation = requestAnimationFrame(step);
  }
  function follow(fraction) {
    cancelAnimation();
    userScroll = false;
    const progress = Math.max(0, Math.min(items.length - 1, fraction));
    const left = Math.floor(progress);
    const right = Math.ceil(progress);
    moveCarousel(target(left) + (target(right) - target(left)) * (progress - left));
  }
  window.GortfolioCarousel = { center, follow };

  function commit(position = carousel.scrollLeft, fromDrag = false) {
    userScroll = false;
    wheelStart = undefined;
    const index = closest(position);
    if (items[index].getAttribute("aria-current") === "true") center(index);
    else chooseGroup(index, undefined, fromDrag);
  }
  function settleCarousel() {
    clearTimeout(settle);
    if (!userScroll || gesture || scrubbing) return;
    settle = setTimeout(() => commit(), 180);
  }
  carousel.addEventListener("pointerdown", event => {
    if (root.dataset.layout !== "stacked" || event.button !== 0) return;
    cancelAnimation();
    userScroll = true;
    wheelStart = undefined;
    gesture = { x: event.clientX, left: carousel.scrollLeft, id: event.pointerId, moved: false,
      startIndex: closest(), lastX: event.clientX, lastTime: performance.now(), velocity: 0 };
  });
  carousel.addEventListener("pointermove", event => {
    if (!gesture) return;
    const delta = event.clientX - gesture.x;
    if (Math.abs(delta) > 5 || gesture.moved) {
      gesture.moved = true;
      beginProjectPaneDrag();
      carousel.dataset.dragging = "true";
      carousel.setPointerCapture(event.pointerId);
      if (event.cancelable) event.preventDefault();
      const now = performance.now();
      const velocity = (gesture.lastX - event.clientX) / Math.max(1, now - gesture.lastTime);
      gesture.velocity = gesture.velocity * .65 + velocity * .35;
      gesture.lastX = event.clientX;
      gesture.lastTime = now;
      const min = target(Math.max(0, gesture.startIndex - 1));
      const max = target(Math.min(items.length - 1, gesture.startIndex + 1));
      const position = gesture.left - delta;
      moveCarousel(position < min ? min + (position - min) * .12
        : position > max ? max + (position - max) * .12 : position);
    }
  });
  function endGesture(event) {
    if (!gesture) return;
    const last = gesture;
    gesture = undefined;
    suppressClick = last.moved;
    delete carousel.dataset.dragging;
    if (carousel.hasPointerCapture(last.id)) carousel.releasePointerCapture(last.id);
    if (last.moved) {
      releasePress(0);
      const step = target(1) - target(0);
      const velocity = performance.now() - last.lastTime < 100 ? last.velocity : 0;
      const momentum = Math.max(-step * 1.4, Math.min(step * 1.4, velocity * 145));
      const min = target(Math.max(0, last.startIndex - 1));
      const max = target(Math.min(items.length - 1, last.startIndex + 1));
      if (event.type === "pointercancel") center(last.startIndex);
      else commit(Math.max(min, Math.min(max, carousel.scrollLeft + momentum)), true);
      releaseProjectPaneDrag();
    } else userScroll = false;
  }
  carousel.addEventListener("pointerup", endGesture);
  carousel.addEventListener("pointercancel", endGesture);
  carousel.addEventListener("click", event => {
    if (!suppressClick) return;
    event.stopImmediatePropagation();
    event.preventDefault();
    suppressClick = false;
  }, true);
  carousel.addEventListener("scroll", () => { queuePaint(); settleCarousel(); }, { passive: true });
  carousel.addEventListener("wheel", event => {
    if (root.dataset.layout !== "stacked") return;
    event.preventDefault();
    cancelAnimation();
    wheelStart ??= closest();
    userScroll = true;
    const min = target(Math.max(0, wheelStart - 1));
    const max = target(Math.min(items.length - 1, wheelStart + 1));
    moveCarousel(Math.max(min, Math.min(max, carousel.scrollLeft + (event.deltaX || event.deltaY * .65))));
    settleCarousel();
  }, { passive: false });

  function scrub(event) {
    const box = pager.getBoundingClientRect();
    const start = box.left + box.width / 12;
    const width = box.width * 5 / 6;
    const progress = Math.max(0, Math.min(1, (event.clientX - start) / width));
    moveCarousel(target(0) + (target(items.length - 1) - target(0)) * progress);
  }
  pager.addEventListener("pointerdown", event => {
    if (event.button !== 0) return;
    if (root.dataset.layout !== "stacked") {
      const box = pager.getBoundingClientRect();
      chooseGroup(Math.max(0, Math.min(items.length - 1, Math.floor((event.clientX - box.left) / box.width * items.length))));
      return;
    }
    cancelAnimation();
    scrubbing = true;
    pager.setPointerCapture(event.pointerId);
    scrub(event);
    event.preventDefault();
  });
  pager.addEventListener("pointermove", event => {
    if (!scrubbing) return;
    scrub(event);
    event.preventDefault();
  });
  function endScrub(event) {
    if (!scrubbing) return;
    scrubbing = false;
    if (pager.hasPointerCapture(event.pointerId)) pager.releasePointerCapture(event.pointerId);
    commit();
  }
  pager.addEventListener("pointerup", endScrub);
  pager.addEventListener("pointercancel", endScrub);
  pager.addEventListener("keydown", event => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const current = items.findIndex(item => item.getAttribute("aria-current") === "true");
    const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1
      : Math.max(0, Math.min(items.length - 1, current + (event.key === "ArrowRight" ? 1 : -1)));
    if (next === current) center(next);
    else chooseGroup(next);
  });
  new ResizeObserver(queuePaint).observe(carousel);
  new MutationObserver(queuePaint).observe(root, { attributes: true, attributeFilter: ["data-layout"] });
  queuePaint();

  const tabs = [...document.querySelectorAll(".editor-tabs [role='tab']")];
  function selectTab(tab) {
    for (const item of tabs) {
      const active = item === tab;
      item.setAttribute("aria-selected", String(active));
      item.tabIndex = active ? 0 : -1;
      document.getElementById(item.getAttribute("aria-controls")).hidden = !active;
    }
  }
  for (const [index, tab] of tabs.entries()) {
    tab.addEventListener("click", () => selectTab(tab));
    tab.addEventListener("keydown", event => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      let next = event.key === "Home" ? 0 : tabs.length - 1;
      if (event.key.startsWith("Arrow")) next = (index + tabs.length + (event.key === "ArrowRight" ? 1 : -1)) % tabs.length;
      selectTab(tabs[next]);
      tabs[next].focus();
    });
  }

  const defaults = { color: "#e1d6f8", opacity: .17, blur: 7, sheen: .36, edge: .7, saturation: 1.25 };
  const sliders = [
    ["opacity", "색상 농도", 0, .7, .01],
    ["blur", "흐림", 0, 24, 1],
    ["sheen", "표면 반사", 0, 1, .01],
    ["edge", "테두리 밝기", 0, 1, .01],
    ["saturation", "채도", 0, 2.5, .05]
  ];
  const key = "gortfolio.interface-glass.v1";
  const settings = { ...defaults };
  const feedback = document.getElementById("ui-glass-feedback");
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    if (/^#[\da-f]{6}$/i.test(saved?.color)) settings.color = saved.color;
    for (const [name, , min, max] of sliders) {
      if (Number.isFinite(saved?.[name])) settings[name] = Math.max(min, Math.min(max, saved[name]));
    }
  } catch {}

  function apply() {
    for (const [name, value] of Object.entries(settings)) {
      root.style.setProperty("--ui-glass-" + name, name === "blur" ? value + "px" : value);
    }
  }
  function save() {
    try {
      localStorage.setItem(key, JSON.stringify(settings));
      feedback.textContent = "이 브라우저에 저장했습니다.";
    } catch {
      feedback.textContent = "현재 화면에 적용했습니다.";
    }
  }
  const picker = document.getElementById("ui-glass-color");
  const hex = document.getElementById("ui-glass-colorHex");
  picker.value = hex.value = settings.color;
  function updateColor(value) {
    const color = value.trim().replace(/^#?/, "#");
    if (!/^#[\da-f]{6}$/i.test(color)) return false;
    settings.color = color.toLowerCase();
    picker.value = hex.value = settings.color;
    apply();
    return true;
  }
  picker.addEventListener("input", () => updateColor(picker.value));
  picker.addEventListener("change", save);
  hex.addEventListener("input", () => updateColor(hex.value));
  hex.addEventListener("change", () => {
    if (updateColor(hex.value)) save();
    else {
      hex.value = settings.color;
      feedback.textContent = "여섯 자리 색상 코드를 입력해 주세요.";
    }
  });

  for (const [name, text, min, max, step] of sliders) {
    const label = document.createElement("label");
    label.className = "glass-slider";
    label.htmlFor = "ui-glass-" + name;
    const caption = document.createElement("span");
    caption.textContent = text;
    const output = document.createElement("output");
    const input = document.createElement("input");
    input.type = "range";
    input.id = label.htmlFor;
    input.min = min;
    input.max = max;
    input.step = step;
    input.value = settings[name];
    output.setAttribute("for", input.id);
    output.value = settings[name];
    input.addEventListener("input", () => {
      settings[name] = input.valueAsNumber;
      output.value = input.value;
      apply();
      feedback.textContent = "";
    });
    input.addEventListener("change", save);
    label.append(caption, output, input);
    document.getElementById("ui-glass-sliders").append(label);
  }
  document.getElementById("ui-glass-reset").addEventListener("click", () => {
    Object.assign(settings, defaults);
    picker.value = hex.value = settings.color;
    for (const [name] of sliders) {
      const input = document.getElementById("ui-glass-" + name);
      input.value = settings[name];
      input.previousElementSibling.value = settings[name];
    }
    apply();
    save();
  });
  apply();
})();
