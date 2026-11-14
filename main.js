"use strict";

const $ = (id) => document.getElementById(id);
const consoleUI = $("console");
const consoleSpace = $("console-space");
const nav = $("channels");
const rail = $("rail-glass");
const mini = $("mini");
const screen = $("screen");
const stage = $("stage");
const stageWrap = $("stage-wrap");
const panel = $("document");
const tiles = $("tiles");
const pips = $("pips");
const title = $("stage-title");
const motion = matchMedia("(prefers-reduced-motion: reduce)");
const compact = matchMedia("(orientation: portrait)");
const groups = portfolio.groups;
const figures = { about: 4, touchdesigner: 15, web: 7, cpp: 5, vr: 16, visual: 8 };
const projectFigures = {
  "surface-waves": 1, "at-field": 14, muryokusho: 0, uro: 1, "fruit-visuals": 12, "hand-landmarks": 2,
  "merry-go-round": 9, "connected-garage": 7, integral: 10, "rgb-photo-space": 8, "between-breaths": 0, icc: 11,
  "tilting-maze": 5, "ascii-galaxy": 0, "smart-fridge": 13, "spotify-prototype": 7,
  "blender-clay": 8, "drawings-posters": 3, radar: 1
};
const embeddedDemos = new Set(["connected-garage", "rgb-photo-space", "between-breaths", "icc", "spotify-prototype"]);
const marks = {
  person: '<circle cx="12" cy="8" r="3.2"/><path d="M5.1 20c.4-4 2.7-6 6.9-6s6.5 2 6.9 6"/>',
  vr: '<rect x="3" y="7" width="18" height="10" rx="3"/><circle cx="8" cy="12" r="1.5"/><circle cx="16" cy="12" r="1.5"/>',
  wave: '<path d="M2.5 12h3l2.4-5 3.2 10L14.3 5l2.8 9.5 1.5-2.5h2.9"/>',
  asterisk: '<path d="M12 3.5v17M4.7 7.8l14.6 8.4m0-8.4L4.7 16.2"/>',
  maze: '<path d="M5 20V4h15v16h-7v-5h3V8H9v4h3m-3 4v4"/>',
  window: '<rect x="3.5" y="5" width="17" height="14" rx="2"/><path d="M4 9.5h16m-12.5-2.2h.1m3 0h.1m3 0h.1M9 10v8.5"/>',
  prism: '<path d="m12 3.5 7.5 4.4v8.2L12 20.5l-7.5-4.4V7.9L12 3.5Zm0 8.5 7.5-4.1m-7.5 4.1L4.5 7.9M12 12v8.5"/>',
  github: '<path fill="currentColor" stroke="none" d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.86c-2.78.6-3.37-1.18-3.37-1.18-.45-1.15-1.11-1.46-1.11-1.46-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.89 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.99 1.03-2.69-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.03a9.58 9.58 0 0 1 5 0c1.91-1.3 2.75-1.03 2.75-1.03.55 1.38.2 2.4.1 2.65.64.7 1.03 1.6 1.03 2.69 0 3.84-2.34 4.69-4.57 4.94.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2Z"/>',
  instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.6h.1"/>',
  notion: '<rect x="3.5" y="3.5" width="17" height="17" rx="2"/><path d="M8 16V8l8 8V8M6.8 16h2.5m5.4-8h2.5"/>',
  film: '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="m10 9 5 3-5 3z"/>'
};

let group = 0;
let project = -1;
let page = "preview";
let booting = true;
let switching = false;
let muted = true;
let audio;
let yaw = 0;
let spinStarted = null;
let press;
let layoutOverride;
let modelDirty = true;
let previous = 0;
let drawModel;
const tagHistory = [];
const projectPreviews = new Map();

try {
  drawModel = Pocket3D.renderer(stage);
} catch {
  $("fallback-mark").hidden = false;
}

function el(tag, text, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function icon(mark) {
  const node = el("span", "", "icon" + (marks[mark] ? "" : " icon-" + mark));
  node.setAttribute("aria-hidden", "true");
  if (marks[mark]) {
    node.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + marks[mark] + '</svg>';
  }
  return node;
}

function anchor(label, href) {
  const node = el("a", label);
  node.href = href;
  node.target = "_blank";
  node.rel = "noopener noreferrer";
  return node;
}

function linkTile([label, href]) {
  const host = new URL(href).hostname;
  const mark = host === "github.com" ? "github" : host.endsWith("instagram.com") ? "instagram"
    : host.endsWith("notion.site") ? "notion" : "play";
  const link = anchor(label, href);
  link.className = "link-tile";
  link.title = label;
  link.setAttribute("aria-label", label);
  link.replaceChildren(icon(mark));
  return link;
}

function tone(mode) {
  if (muted) return;
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!Audio) return;
  audio ||= new Audio();
  if (audio.state === "suspended") audio.resume().catch(() => {});
  const notes = { select: [659], launch: [392, 587, 784], boot: [392, 523, 784], back: [523, 392] }[mode];
  notes.forEach((note, i) => {
    const time = audio.currentTime + i * .055;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.frequency.value = note;
    gain.gain.setValueAtTime(.001, time);
    gain.gain.exponentialRampToValueAtTime(.048, time + .014);
    gain.gain.exponentialRampToValueAtTime(.001, time + .17);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start(time);
    oscillator.stop(time + .18);
  });
}

const badgeFont = "850 100px system-ui, sans-serif";
const badgeMetrics = document.createElement("canvas").getContext("2d");
badgeMetrics.font = badgeFont;

function badgeLettering(label) {
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  const text = document.createElementNS(svgNS, "text");
  const metrics = badgeMetrics.measureText(label);
  const height = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
  const width = metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight;
  const scaleX = Math.min(15 * .68 / height, 26 / width);
  const scaleY = 32 / height;
  const centerX = (metrics.actualBoundingBoxRight - metrics.actualBoundingBoxLeft) / 2;
  const centerY = (metrics.actualBoundingBoxDescent - metrics.actualBoundingBoxAscent) / 2;
  svg.setAttribute("viewBox", "0 0 32 32");
  svg.setAttribute("class", "tile-lettering");
  svg.setAttribute("aria-hidden", "true");
  text.style.font = badgeFont;
  text.setAttribute("transform", `translate(16 16) scale(${scaleX} ${scaleY}) translate(${-centerX} ${-centerY})`);
  text.textContent = label;
  svg.append(text);
  return svg;
}

const groupTiles = groups.map((entry, index) => {
  const tile = el("button", "", "tile");
  tile.type = "button";
  tile.dataset.group = index;
  tile.title = entry.label;
  tile.setAttribute("aria-label", entry.label);
  tile.style.setProperty("--badge-color", entry.badgeColor);
  const badge = el("span", "", "tile-badge");
  badge.append(badgeLettering(entry.badge));
  tile.append(badge);
  tile.addEventListener("click", () => chooseGroup(index, true));
  tiles.append(tile);
  pips.append(el("i"));
  return tile;
});

function channel(label, mark, active, action, extraClass = "") {
  const button = el("button", "", "channel " + extraClass);
  button.type = "button";
  if (mark) button.append(icon(mark));
  button.append(el("span", label, "channel-label"), icon("next"));
  if (active) button.setAttribute("aria-current", "true");
  button.addEventListener("click", action);
  return button;
}

function renderRail() {
  const list = el("div", "", "channels");
  if (!group) {
    groups.forEach((entry, index) => {
      const row = channel(entry.label, entry.mark, index === group, () => chooseGroup(index, true, true));
      row.style.setProperty("--accent", entry.color);
      list.append(row);
    });
  } else {
    const entry = groups[group];
    list.append(channel(entry.label, "back", false, () => goHome(true), "rail-return"));
    let track;
    entry.projects.forEach((work, index) => {
      if (work.track && work.track !== track) {
        track = work.track;
        list.append(el("div", track, "channel-track"));
      }
      list.append(channel(work.title, null, index === project, () => chooseProject(index), "project-channel"));
    });
    if (!entry.projects.length) list.append(el("p", "추후 추가 예정", "channel-empty"));
  }
  nav.replaceChildren(list);
}

function placeRail() {
  const stacked = layoutOverride === "stacked" || (!layoutOverride && compact.matches);
  consoleUI.dataset.layout = stacked ? "stacked" : "wide";
  const nextLayout = stacked ? "가로로 보기" : "세로로 보기";
  $("orientation").setAttribute("aria-label", nextLayout);
  $("orientation").title = nextLayout;
  const destination = $(stacked || group ? "mini-channels" : "rail-window");
  if (rail.parentElement === destination) return;
  const focused = rail.contains(document.activeElement) ? document.activeElement : null;
  const position = rail.scrollTop;
  destination.prepend(rail);
  rail.scrollTop = position;
  focused?.focus({ preventScroll: true });
}

const reelFrames = new ResizeObserver(entries => {
  for (const { target, contentRect } of entries) {
    target.style.setProperty("--reel-scale", contentRect.width / 360);
  }
});

function mediaFigure(item) {
  const figure = el("figure");
  if (item.type === "image") {
    const image = el("img");
    image.src = item.src;
    image.alt = item.name;
    image.loading = "lazy";
    image.decoding = "async";
    figure.append(image, el("figcaption", item.name));
  } else if (item.type === "video") {
    const video = el("video");
    video.src = item.src;
    video.controls = true;
    video.preload = "none";
    video.playsInline = true;
    video.setAttribute("aria-label", item.name);
    figure.append(video, el("figcaption", item.name));
  } else {
    const card = el("div", "", "reel-card");
    const play = el("button", "", "media-open");
    const actions = el("div", "", "reel-actions");
    const link = anchor("Instagram", item.href);
    play.type = "button";
    play.setAttribute("aria-label", item.name + " 영상 열기");
    play.append(icon("play"));
    play.addEventListener("click", () => {
      const viewport = el("div", "", "reel-viewport");
      const embed = el("iframe");
      embed.src = "https://www.instagram.com/reel/" + item.id + "/embed/";
      embed.title = item.name;
      embed.allow = "fullscreen; picture-in-picture";
      embed.referrerPolicy = "strict-origin-when-cross-origin";
      embed.loading = "lazy";
      viewport.append(embed);
      figure.append(viewport);
      reelFrames.observe(viewport);
      play.disabled = true;
      panel.scrollTop += viewport.getBoundingClientRect().top - panel.getBoundingClientRect().top - 43;
    }, { once: true });
    actions.append(play, link);
    card.append(icon("film"), el("strong", item.name), actions);
    figure.append(card);
  }
  return figure;
}

function demoPlayer(work) {
  const figure = el("figure", "", "demo-player");
  const play = el("button", "화면에서 실행", "media-open");
  play.type = "button";
  play.prepend(icon("play"));
  play.addEventListener("click", () => {
    const frame = el("iframe");
    frame.src = work.links.find(([label]) => label === "실행")[1];
    frame.title = work.title;
    frame.allow = "fullscreen";
    frame.tabIndex = 0;
    figure.replaceChildren(frame);
    frame.focus({ preventScroll: true });
  }, { once: true });
  figure.append(play);
  return figure;
}

function appendLinks(heading, destinations) {
  if (!destinations.length) return;
  const links = el("nav", "", "link-grid");
  links.setAttribute("aria-label", "외부 링크");
  links.append(...destinations.map(linkTile));
  heading.append(links);
}

function showTaggedProjects(tag) {
  tagHistory.push({ tag, group, project });
  page = "tag";
  sync();
  panel.focus({ preventScroll: true });
}

function projectPreview(work) {
  if (!projectPreviews.has(work.id)) {
    const canvas = el("canvas");
    canvas.width = 960;
    canvas.height = 540;
    const draw = Pocket3D.renderer(canvas);
    draw(projectFigures[work.id], .55, .08, 8.4, 3.9);
    projectPreviews.set(work.id, canvas.toDataURL("image/webp"));
    canvas.getContext("webgl")?.getExtension("WEBGL_lose_context")?.loseContext();
  }
  const preview = el("figure", "", "project-preview");
  const image = el("img");
  image.src = projectPreviews.get(work.id);
  image.alt = work.title + " 3D 미리보기";
  preview.append(image);
  return preview;
}

function renderPage() {
  reelFrames.disconnect();
  stageWrap.hidden = page !== "preview";
  panel.hidden = page === "preview";
  if (page === "preview") {
    panel.replaceChildren();
    return;
  }

  const content = el("article", "", "article");
  if (page === "tag") {
    const tagView = tagHistory.at(-1);
    content.append(el("h1", "#" + tagView.tag.replace(/\s+/g, "")));
    const results = el("div", "", "tag-results");
    groups.forEach((field, groupIndex) => {
      field.projects?.forEach((work, projectIndex) => {
        if (!work.tags?.includes(tagView.tag)) return;
        results.append(channel(work.title, field.mark, false, () => openProject(projectIndex, groupIndex)));
      });
    });
    content.append(results);
  } else if (page === "about") {
    const heading = el("header", "", "project-heading");
    heading.append(el("h1", portfolio.name));
    appendLinks(heading, portfolio.links);
    content.append(el("p", portfolio.handle, "field-label"), heading, el("p", portfolio.intro));
    const edit = anchor("프로젝트 편집", "https://github.com/53nu/Gortfolio/edit/main/portfolio.js");
    edit.className = "edit-link";
    content.append(edit);
  } else {
    const field = groups[group];
    const work = field.projects[project];
    const overview = el("header");
    const heading = el("div", "", "project-heading");
    heading.append(el("h1", work.title));
    appendLinks(heading, work.links);
    overview.append(el("p", [field.label, work.track].filter(Boolean).join(" / "), "field-label"), heading);
    content.append(overview);

    const gallery = el("div", "", "gallery");
    if (!work.media?.some(item => item.type === "image" || item.type === "video") && work.id !== "radar") {
      try {
        gallery.append(projectPreview(work));
      } catch {}
    }
    work.media?.forEach(item => gallery.append(mediaFigure(item)));
    if (embeddedDemos.has(work.id)) gallery.append(demoPlayer(work));
    if (gallery.childElementCount) content.append(gallery);
    content.append(el("p", work.text));
    if (work.more) content.append(el("p", work.more));
    if (work.tags?.length) {
      const tags = el("ul", "", "tags");
      work.tags.forEach(tag => {
        const button = el("button", "#" + tag.replace(/\s+/g, ""));
        button.type = "button";
        button.addEventListener("click", () => showTaggedProjects(tag));
        const item = el("li");
        item.append(button);
        tags.append(item);
      });
      content.append(tags);
    }
  }
  panel.replaceChildren(content);
  panel.scrollTop = 0;
}

function sync() {
  const entry = groups[group];
  const work = entry.projects?.[project];
  const name = work?.title || (group ? entry.label : "Go");
  const detail = page !== "preview";
  consoleUI.style.setProperty("--accent", entry.color);
  consoleUI.style.setProperty("--pale", entry.pale);
  consoleUI.dataset.view = detail ? "detail" : group ? "browse" : "home";
  title.textContent = name;
  title.title = name;
  stage.setAttribute("aria-label", "회전하는 " + name + " 3D 모델");
  $("fallback-mark").textContent = group ? groups[group].label : "Go";
  groupTiles.forEach((tile, index) => {
    tile.setAttribute("aria-current", String(index === group));
    pips.children[index].classList.toggle("active", index === group);
  });
  $("back").hidden = page === "preview" && !group;
  $("mini-back").disabled = !group;
  $("launch").disabled = Boolean(group && !entry.projects.length);
  mini.dataset.view = group ? "browse" : "home";
  const toolbar = $("display-toolbar");
  const destination = detail ? $("focus-controls") : mini.querySelector(".mini-glass");
  if (toolbar.parentElement !== destination) destination.prepend(toolbar);
  const scroll = rail.scrollTop;
  placeRail();
  renderRail();
  rail.scrollTop = scroll;
  renderPage();
  spinStarted = null;
  modelDirty = true;
}

function isReady() {
  return !booting && !switching;
}

function animateLaunch(change) {
  if (!isReady()) return;
  tone("launch");
  if (motion.matches) {
    change();
    return;
  }
  switching = true;
  screen.classList.add("switching");
  setTimeout(change, 170);
  setTimeout(() => {
    screen.classList.remove("switching");
    switching = false;
  }, 435);
}

function chooseGroup(index, activate = false, fromRail = false) {
  if (!isReady()) return;
  if (index === group && activate && page === "preview") {
    if (group === 0) openAbout();
    else if (groups[group].projects.length) openProject(project < 0 ? 0 : project);
    return;
  }
  if (index === group) {
    if (page === "about") goHome();
    return;
  }
  tagHistory.length = 0;
  group = index;
  project = -1;
  page = "preview";
  yaw = 0;
  tone("select");
  sync();
  rail.scrollTop = 0;
  if (fromRail) nav.querySelector(".channel")?.focus({ preventScroll: true });
}

function openAbout() {
  animateLaunch(() => {
    page = "about";
    sync();
    panel.focus({ preventScroll: true });
  });
}

function chooseProject(index) {
  if (!isReady()) return;
  if (index === project && page === "preview") {
    openProject(index);
    return;
  }
  project = index;
  page = "preview";
  yaw = 0;
  tone("select");
  sync();
  const row = nav.querySelectorAll(".project-channel")[index];
  row?.focus({ preventScroll: true });
}

function openProject(index, groupIndex = group) {
  animateLaunch(() => {
    group = groupIndex;
    project = index;
    page = "project";
    sync();
    panel.focus({ preventScroll: true });
  });
}

function launch() {
  if (!isReady() || page !== "preview") return;
  if (!group) openAbout();
  else if (groups[group].projects.length) openProject(project < 0 ? 0 : project);
}

function back() {
  if (!isReady()) return;
  if (page === "tag") {
    ({ group, project } = tagHistory.pop());
    page = "project";
  } else if (page === "project" && tagHistory.length) {
    ({ group, project } = tagHistory.at(-1));
    page = "tag";
  } else if (page !== "preview") {
    page = "preview";
  } else if (group) {
    goHome(true);
    return;
  } else return;
  yaw = 0;
  tone("back");
  sync();
  if (page === "preview") {
    const row = nav.querySelector('[aria-current="true"]');
    if (row) rail.scrollTop = Math.max(0, row.offsetTop - 4);
    $("launch").focus({ preventScroll: true });
  } else {
    panel.focus({ preventScroll: true });
  }
}

function goHome(refocus = false) {
  if (!isReady()) return;
  tagHistory.length = 0;
  group = 0;
  project = -1;
  page = "preview";
  yaw = 0;
  tone("back");
  sync();
  rail.scrollTop = 0;
  if (refocus) groupTiles[0].focus({ preventScroll: true });
}

function toggleSound() {
  if (!isReady()) return;
  muted = !muted;
  $("sound").setAttribute("aria-pressed", String(!muted));
  tone("boot");
}

function reflectFullscreen() {
  $("full").setAttribute("aria-pressed", String(Boolean(document.fullscreenElement) || consoleSpace.classList.contains("expanded")));
}

async function toggleFullscreen() {
  if (!isReady()) return;
  if (document.fullscreenElement) await document.exitFullscreen();
  else if (consoleSpace.classList.contains("expanded")) consoleSpace.classList.remove("expanded");
  else if (consoleSpace.requestFullscreen) {
    try { await consoleSpace.requestFullscreen(); }
    catch { consoleSpace.classList.add("expanded"); }
  } else consoleSpace.classList.add("expanded");
  reflectFullscreen();
}

function screenInert(value) {
  screen.inert = value;
  rail.inert = value;
  mini.inert = value;
  $("home").disabled = value;
}

function finishBoot() {
  booting = false;
  consoleUI.classList.remove("booting");
  screenInert(false);
  modelDirty = true;
}

function startBoot() {
  screenInert(true);
  if (motion.matches) finishBoot();
  else setTimeout(finishBoot, 1410);
}

$("home").addEventListener("click", () => goHome());
$("back").addEventListener("click", back);
$("mini-back").addEventListener("click", back);
$("launch").addEventListener("click", launch);
$("sound").addEventListener("click", toggleSound);
$("full").addEventListener("click", toggleFullscreen);
$("orientation").addEventListener("click", () => {
  if (!isReady()) return;
  layoutOverride = consoleUI.dataset.layout === "stacked" ? "wide" : "stacked";
  placeRail();
});
document.addEventListener("fullscreenchange", reflectFullscreen);
document.addEventListener("keydown", (event) => {
  if (!isReady() || event.metaKey || event.ctrlKey || event.altKey) return;
  const key = event.key;
  if (key === "Escape") {
    if (consoleSpace.classList.contains("expanded")) toggleFullscreen();
    else back();
  } else if (key.toLowerCase() === "f") {
    if (!event.repeat) toggleFullscreen();
  } else if (key === "Enter" && !event.target.closest?.("button, a, iframe, video")) {
    if (!event.repeat) launch();
  } else if (page === "preview" && groups[group].projects?.length && ["ArrowUp", "ArrowDown"].includes(key)) {
    const count = groups[group].projects.length;
    const next = project < 0 ? (key === "ArrowUp" ? count - 1 : 0)
      : (project + count + (key === "ArrowUp" ? -1 : 1)) % count;
    if (next !== project) chooseProject(next);
  } else if (page === "preview" && ["ArrowLeft", "ArrowRight"].includes(key)) {
    const index = (group + groups.length + (key === "ArrowRight" ? 1 : -1)) % groups.length;
    chooseGroup(index);
    if (tiles.contains(document.activeElement)) groupTiles[index].focus({ preventScroll: true });
  } else return;
  event.preventDefault();
});

const spinButton = $("spin");
spinButton.addEventListener("pointerdown", event => {
  press = { x: event.clientX, y: event.clientY, moved: false };
});
spinButton.addEventListener("pointermove", event => {
  if (press && Math.hypot(event.clientX - press.x, event.clientY - press.y) > 8) press.moved = true;
});
spinButton.addEventListener("click", event => {
  const moved = event.detail && press && (press.moved || Math.hypot(event.clientX - press.x, event.clientY - press.y) > 8);
  press = undefined;
  if (isReady() && !moved && !motion.matches && spinStarted === null) spinStarted = performance.now();
});

function sizeCanvas(canvas, width, height) {
  const scale = Math.min(1.65, window.devicePixelRatio || 1);
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  return scale;
}

function resizeStage() {
  if (!stage.clientWidth || !stage.clientHeight) return;
  sizeCanvas(stage, stage.clientWidth, stage.clientHeight);
  modelDirty = true;
}

const idleSpeed = .64;
const spinDuration = 1850;
const spinAngle = Math.PI * 3;

function animate(now) {
  const delta = previous ? Math.min(.05, (now - previous) / 1000) : 0;
  previous = now;
  if (drawModel && page === "preview" && (modelDirty || !motion.matches)) {
    resizeStage();
    let angle = yaw;
    if (spinStarted !== null) {
      const progress = Math.min(1, Math.max(0, (now - spinStarted) / spinDuration));
      const eased = progress ** 3 * (10 + progress * (-15 + 6 * progress));
      const idleSweep = idleSpeed * spinDuration / 1000;
      angle += idleSweep * progress + (spinAngle - idleSweep) * eased;
      if (progress === 1) {
        yaw = angle % (Math.PI * 2);
        spinStarted = null;
      }
    } else if (!motion.matches && !booting) {
      yaw = (yaw + delta * idleSpeed) % (Math.PI * 2);
      angle = yaw;
    }
    const fit = Math.min(1, stage.width / (stage.height * 1.21));
    const figure = project >= 0 ? projectFigures[groups[group].projects[project].id] : figures[groups[group].id];
    const focal = (group ? 3.65 : 4.10) * fit;
    drawModel(figure, angle, 0, 8.4, focal);
    modelDirty = false;
  }
  requestAnimationFrame(animate);
}

new ResizeObserver(resizeStage).observe(consoleUI);
motion.addEventListener("change", () => {
  if (motion.matches && booting) finishBoot();
  if (motion.matches) spinStarted = null;
  modelDirty = true;
});
compact.addEventListener("change", placeRail);
placeRail();
sync();
startBoot();
resizeStage();
requestAnimationFrame(animate);
