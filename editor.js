"use strict";

const portfolioDraftKey = "gortfolio.content.draft";

function setupPortfolioEditor({ isReady, currentProject, refresh }) {
  const dialog = $("editor");
  const form = $("edit-form");
  const target = $("edit-target");
  const fields = $("edit-fields");
  const feedback = $("edit-feedback");
  const entries = new Map([["about", portfolio]]);
  const original = new Map();
  let drafts = {};
  let changed = false;

  target.add(new Option("About", "about"));
  for (const group of portfolio.groups) {
    if (!group.projects?.length) continue;
    const section = el("optgroup");
    section.label = group.label;
    for (const work of group.projects) {
      entries.set(work.id, work);
      section.append(new Option(work.title, work.id));
    }
    target.append(section);
  }
  for (const [id, entry] of entries) {
    original.set(id, structuredClone(id === "about"
      ? { name: entry.name, handle: entry.handle, intro: entry.intro, links: entry.links }
      : entry));
  }

  try {
    const saved = JSON.parse(localStorage.getItem(portfolioDraftKey) || "{}");
    for (const [id, entry] of entries) {
      if (!Object.hasOwn(saved, id)) continue;
      const { draft, base } = saved[id];
      if (base !== JSON.stringify(original.get(id))) continue;
      Object.assign(entry, draft);
      drafts[id] = saved[id];
      if (id !== "about") [...target.options].find(option => option.value === id).textContent = entry.title;
    }
  } catch {}

  function field(label, name, value = "", multiline = false) {
    const wrapper = el("label", label, "editor-field");
    const input = el(multiline ? "textarea" : "input");
    input.name = name;
    input.value = value;
    wrapper.append(input);
    return wrapper;
  }

  function rows(label, addLabel, items, build) {
    const section = el("fieldset", "", "editor-list");
    section.append(el("legend", label));
    const list = el("div", "", "editor-rows");
    const add = el("button", addLabel, "media-open");
    add.type = "button";
    const append = (item) => {
      const row = build(item);
      const remove = el("button", "삭제", "media-open");
      remove.type = "button";
      remove.addEventListener("click", () => {
        row.remove();
        changed = true;
        add.focus();
      });
      row.append(remove);
      list.append(row);
      return row;
    };
    items.forEach(append);
    add.addEventListener("click", () => {
      append().querySelector("input").focus();
      changed = true;
    });
    section.append(list, add);
    return section;
  }

  function renderFields() {
    const entry = entries.get(target.value);
    fields.replaceChildren();
    if (target.value === "about") {
      fields.append(field("이름", "name", entry.name), field("계정명", "handle", entry.handle),
        field("소개", "intro", entry.intro, true));
    } else {
      fields.append(field("작품명", "title", entry.title), field("소개", "text", entry.text, true),
        field("추가 설명", "more", entry.more, true), field("해시태그 · 쉼표로 구분", "tags", (entry.tags || []).join(", ")),
        field("대표 이미지 또는 GIF 주소", "cover", entry.cover));
      fields.append(rows("사진·영상", "미디어 추가", entry.media || [], (item = {}) => {
        const row = el("div", "", "editor-media");
        const type = el("select");
        type.setAttribute("aria-label", "미디어 형식");
        type.append(new Option("사진 / GIF", "image"), new Option("영상", "video"), new Option("Instagram 릴스", "reel"));
        type.value = item.type || "image";
        const source = field("파일 주소 또는 릴스 링크", "media-src", item.src || item.href);
        const still = field("영상 표지 이미지 주소", "media-poster", item.poster);
        const loop = field("영상 미리보기 GIF 주소", "media-preview", item.preview);
        const updateType = () => { still.hidden = loop.hidden = type.value === "image"; };
        type.addEventListener("change", updateType);
        updateType();
        row.append(field("미디어 제목", "media-name", item.name), type, source, still, loop);
        return row;
      }));
    }
    fields.append(rows("외부 링크", "링크 추가", entry.links, ([label, url] = []) => {
      const row = el("div", "", "editor-link");
      row.append(field("이름", "link-label", label), field("주소", "link-url", url));
      return row;
    }));
    const reset = el("button", "이 항목의 초안 지우기", "editor-reset");
    reset.type = "button";
    reset.hidden = !Object.hasOwn(drafts, target.value);
    reset.addEventListener("click", () => {
      const next = { ...drafts };
      delete next[target.value];
      try {
        localStorage.setItem(portfolioDraftKey, JSON.stringify(next));
        drafts = next;
        Object.assign(entry, original.get(target.value), "id" in entry ? { cover: original.get(target.value).cover } : {});
        if (target.value !== "about") target.selectedOptions[0].textContent = entry.title;
        renderFields();
        refresh();
        feedback.textContent = "공개 버전의 내용으로 돌아갔습니다.";
      } catch {
        feedback.textContent = "브라우저 저장 공간을 사용할 수 없습니다.";
      }
    });
    fields.append(reset);
    changed = false;
  }

  function address(value, media = false) {
    if (!value) return "";
    if (media && /^media\/[\p{L}\p{N}._/ -]+$/u.test(value) && !value.split("/").some(part => part === "." || part === "..")) return value;
    let url;
    try { url = new URL(value); } catch {}
    if (!url || url.protocol !== "https:" || url.username || url.password) {
      throw new Error("주소는 https://로 시작해야 합니다. 미디어에는 media/파일명도 사용할 수 있습니다.");
    }
    return url.href;
  }

  function saveDraft() {
    const id = target.value;
    const value = (root, name) => root.querySelector(`[name="${name}"]`).value.trim();
    const get = (name) => value(fields, name);
    const entry = entries.get(id);
    const draft = id === "about"
      ? { name: get("name"), handle: get("handle"), intro: get("intro") }
      : { title: get("title"), text: get("text"), more: get("more"),
        tags: get("tags").split(",").map(tag => tag.trim()).filter(Boolean), cover: address(get("cover"), true) };
    if (!(draft.name || draft.title)) throw new Error("이름이나 작품명을 입력해 주세요.");
    draft.links = [...fields.querySelectorAll(".editor-link")].flatMap(row => {
      const label = value(row, "link-label");
      const url = address(value(row, "link-url"));
      if (!label && !url) return [];
      if (!label || !url) throw new Error("외부 링크의 이름과 주소를 입력해 주세요.");
      return [[label, url]];
    });
    if (id !== "about") {
      draft.media = [...fields.querySelectorAll(".editor-media")].flatMap(row => {
        const name = value(row, "media-name");
        const src = value(row, "media-src");
        if (!name && !src) return [];
        if (!name || !src) throw new Error("미디어 제목과 주소를 입력해 주세요.");
        const type = row.querySelector("select").value;
        if (type === "image") return [{ type, name, src: address(src, true) }];
        const poster = address(value(row, "media-poster"), true);
        const preview = address(value(row, "media-preview"), true);
        if (type === "video") {
          const href = entry.media?.find(item => item.type === type && item.src === src)?.href;
          return [{ type, name, src: address(src, true), poster, preview, ...(href ? { href } : {}) }];
        }
        const href = address(src);
        const url = new URL(href);
        const match = /(?:^|\/)reel\/([\w-]+)\/?$/.exec(url.pathname);
        if (!["instagram.com", "www.instagram.com"].includes(url.hostname) || !match) {
          throw new Error("Instagram 릴스의 링크를 입력해 주세요.");
        }
        return [{ type, name, id: match[1], href, poster, preview }];
      });
    }
    const next = { ...drafts, [id]: { base: JSON.stringify(original.get(id)), draft } };
    try { localStorage.setItem(portfolioDraftKey, JSON.stringify(next)); }
    catch { throw new Error("브라우저 저장 공간을 사용할 수 없습니다."); }
    drafts = next;
    Object.assign(entry, draft);
    if (id !== "about") target.selectedOptions[0].textContent = draft.title;
    fields.querySelector(".editor-reset").hidden = false;
    changed = false;
    refresh();
  }

  $("edit").addEventListener("click", () => {
    if (!isReady()) return;
    target.value = currentProject()?.id || "about";
    renderFields();
    feedback.textContent = "";
    dialog.showModal();
  });
  function close(event) {
    if (changed && !window.confirm("저장하지 않은 변경을 닫을까요?")) {
      event.preventDefault();
      return;
    }
    dialog.close();
    $("edit").focus({ preventScroll: true });
  }
  $("edit-close").addEventListener("click", close);
  dialog.addEventListener("cancel", event => {
    event.preventDefault();
    close(event);
  });
  let previousTarget = "about";
  target.addEventListener("focus", () => { previousTarget = target.value; });
  target.addEventListener("change", () => {
    if (changed && !window.confirm("저장하지 않은 변경을 두고 이동할까요?")) {
      target.value = previousTarget;
      return;
    }
    previousTarget = target.value;
    renderFields();
    feedback.textContent = "";
  });
  fields.addEventListener("input", () => { changed = true; });
  form.addEventListener("submit", event => {
    event.preventDefault();
    try {
      saveDraft();
      feedback.textContent = "이 브라우저에 초안을 저장했습니다.";
    } catch (error) {
      feedback.textContent = error.message;
    }
  });
  $("edit-export").addEventListener("click", () => {
    try {
      if (changed) saveDraft();
      const source = '"use strict";\n\nconst portfolio = ' + JSON.stringify(portfolio, null, 2) + ";\n";
      const file = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
      const download = el("a");
      download.href = file;
      download.download = "portfolio.js";
      download.click();
      setTimeout(() => URL.revokeObjectURL(file), 1000);
      feedback.textContent = "받은 portfolio.js를 GitHub에 올리면 공개 사이트에 반영됩니다.";
    } catch (error) {
      feedback.textContent = error.message;
    }
  });
}
