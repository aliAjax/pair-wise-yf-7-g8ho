const storageKey = "zfl16-movable-type-workshop";

const starterInventory = [
  { id: crypto.randomUUID(), char: "山", style: "宋体旧字", size: 30, quantity: 4, wear: "微磨" },
  { id: crypto.randomUUID(), char: "月", style: "宋体旧字", size: 30, quantity: 3, wear: "旧痕" },
  { id: crypto.randomUUID(), char: "风", style: "楷体木刻", size: 28, quantity: 2, wear: "微磨" },
  { id: crypto.randomUUID(), char: "花", style: "楷体木刻", size: 28, quantity: 2, wear: "新" },
  { id: crypto.randomUUID(), char: "茶", style: "黑体铅字", size: 24, quantity: 3, wear: "旧痕" },
  { id: crypto.randomUUID(), char: "雨", style: "仿宋细字", size: 22, quantity: 4, wear: "新" }
];

const defaultState = {
  inventory: starterInventory,
  selectedTypeId: starterInventory[0].id,
  placements: [],
  drafts: [],
  settings: {
    paperSize: "postcard",
    flowMode: "horizontal",
    gridGap: 8,
    workTitle: "晚风小笺"
  }
};

let state = loadState();

const els = {
  paperSize: document.querySelector("#paperSize"),
  flowMode: document.querySelector("#flowMode"),
  gridGap: document.querySelector("#gridGap"),
  workTitle: document.querySelector("#workTitle"),
  stage: document.querySelector("#stage"),
  typeList: document.querySelector("#typeList"),
  typeForm: document.querySelector("#typeForm"),
  charInput: document.querySelector("#charInput"),
  styleInput: document.querySelector("#styleInput"),
  sizeInput: document.querySelector("#sizeInput"),
  quantityInput: document.querySelector("#quantityInput"),
  wearInput: document.querySelector("#wearInput"),
  inventorySearch: document.querySelector("#inventorySearch"),
  styleFilter: document.querySelector("#styleFilter"),
  selectedTypeLabel: document.querySelector("#selectedTypeLabel"),
  cellNotice: document.querySelector("#cellNotice"),
  shortageBadge: document.querySelector("#shortageBadge"),
  usageList: document.querySelector("#usageList"),
  draftList: document.querySelector("#draftList"),
  placedCount: document.querySelector("#placedCount"),
  inventoryCount: document.querySelector("#inventoryCount"),
  saveDraftBtn: document.querySelector("#saveDraftBtn"),
  exportBtn: document.querySelector("#exportBtn"),
  clearBoardBtn: document.querySelector("#clearBoardBtn")
};

function normalizePlacements(placements) {
  if (!Array.isArray(placements)) return [];
  return placements
    .map((item) => {
      if (!item) return null;
      if (Array.isArray(item.layers)) {
        return { row: item.row, col: item.col, layers: item.layers.slice(0, 2) };
      }
      if (item.typeId) {
        return { row: item.row, col: item.col, layers: [item.typeId] };
      }
      return null;
    })
    .filter(Boolean);
}

function loadState() {
  const saved = localStorage.getItem(storageKey);
  if (!saved) return structuredClone(defaultState);
  try {
    const parsed = JSON.parse(saved);
    return {
      ...structuredClone(defaultState),
      ...parsed,
      placements: normalizePlacements(parsed.placements),
      settings: { ...defaultState.settings, ...parsed.settings }
    };
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function getGrid() {
  const size = state.settings.paperSize;
  if (size === "bookmark") return { cols: 7, rows: 18 };
  if (size === "square") return { cols: 12, rows: 12 };
  return { cols: 16, rows: 10 };
}

function placementKey(row, col) {
  return `${row}:${col}`;
}

function getSelectedType() {
  return state.inventory.find((item) => item.id === state.selectedTypeId) || null;
}

function getTypeById(typeId) {
  return state.inventory.find((item) => item.id === typeId) || null;
}

function getUsage() {
  return state.placements.reduce((acc, placement) => {
    placement.layers.forEach((typeId) => {
      acc[typeId] = (acc[typeId] || 0) + 1;
    });
    return acc;
  }, {});
}

function remainingStock(typeId) {
  const type = getTypeById(typeId);
  if (!type) return 0;
  return type.quantity - (getUsage()[typeId] || 0);
}

function showNotice(message) {
  els.cellNotice.textContent = message;
}

function clearNotice() {
  els.cellNotice.textContent = "";
}

function renderSettings() {
  els.paperSize.value = state.settings.paperSize;
  els.flowMode.value = state.settings.flowMode;
  els.gridGap.value = state.settings.gridGap;
  els.workTitle.value = state.settings.workTitle;
}

function renderStyleFilter() {
  const current = els.styleFilter.value || "all";
  const styles = [...new Set(state.inventory.map((item) => item.style))].sort((a, b) => a.localeCompare(b, "zh-CN"));
  els.styleFilter.innerHTML = `<option value="all">全部风格</option>${styles
    .map((style) => `<option value="${escapeHtml(style)}">${escapeHtml(style)}</option>`)
    .join("")}`;
  els.styleFilter.value = styles.includes(current) ? current : "all";
}

function renderInventory() {
  const keyword = els.inventorySearch.value.trim();
  const style = els.styleFilter.value;
  const usage = getUsage();
  const items = state.inventory.filter((item) => {
    const matchesKeyword = !keyword || `${item.char}${item.style}${item.wear}`.includes(keyword);
    const matchesStyle = style === "all" || item.style === style;
    return matchesKeyword && matchesStyle;
  });

  els.inventoryCount.textContent = `${state.inventory.length}枚字模`;
  els.typeList.innerHTML = items
    .map((item) => {
      const used = usage[item.id] || 0;
      const selected = item.id === state.selectedTypeId ? "selected" : "";
      return `
        <article class="type-card ${selected}" draggable="true" data-type-id="${item.id}">
          <div class="glyph" style="font-size:${Math.min(item.size, 36)}px">${escapeHtml(item.char)}</div>
          <div class="type-meta">
            <strong>${escapeHtml(item.char)} · ${escapeHtml(item.style)}</strong>
            <span>${item.size}px · ${escapeHtml(item.wear)} · 已用${used}/${item.quantity}</span>
          </div>
          <button class="mini-btn" title="删除字模" data-delete-type="${item.id}" type="button">×</button>
        </article>
      `;
    })
    .join("");
}

function renderStage() {
  const { cols, rows } = getGrid();
  const map = new Map(state.placements.map((item) => [placementKey(item.row, item.col), item]));
  els.stage.className = `stage ${state.settings.paperSize}`;
  els.stage.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
  els.stage.style.gridTemplateRows = `repeat(${rows}, minmax(0, 1fr))`;
  els.stage.style.gap = `${state.settings.gridGap}px`;
  const vertical = state.settings.flowMode === "vertical" ? "vertical" : "";
  const cells = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const placement = map.get(placementKey(row, col));
      const layers = placement ? placement.layers : [];
      const bottomType = layers.length ? getTypeById(layers[0]) : null;
      const topType = layers.length > 1 ? getTypeById(layers[1]) : null;
      const classes = ["cell", layers.length ? "used" : "", layers.length > 1 ? "stacked" : "", vertical]
        .filter(Boolean)
        .join(" ");
      const label = [`第${row + 1}行第${col + 1}列`];
      if (bottomType) label.push(`底字${bottomType.char}`);
      if (topType) label.push(`上层${topType.char}`);
      cells.push(`
        <div class="${classes}" role="button" tabindex="0" data-row="${row}" data-col="${col}" aria-label="${label.join("，")}">
          ${bottomType ? `<span class="layer bottom" style="font-size:${Math.min(bottomType.size, 30)}px">${escapeHtml(bottomType.char)}</span>` : ""}
          ${topType ? `<span class="layer top" style="font-size:${Math.min(topType.size, 14)}px">${escapeHtml(topType.char)}</span>` : ""}
          ${
            layers.length
              ? `<span class="cell-tools">
                  ${layers.length > 1 ? `<button type="button" class="tool-btn" data-swap title="切换上下层">⇄</button>` : ""}
                  <button type="button" class="tool-btn" data-remove-top title="撤掉上层">×</button>
                </span>`
              : ""
          }
        </div>
      `);
    }
  }
  els.stage.innerHTML = cells.join("");
}

function renderUsage() {
  const usage = getUsage();
  const entries = state.inventory.filter((item) => usage[item.id]);
  const totalLayers = state.placements.reduce((sum, item) => sum + item.layers.length, 0);
  els.placedCount.textContent = `${totalLayers}个落字`;

  const shortages = entries.filter((item) => usage[item.id] > item.quantity);
  els.shortageBadge.textContent = shortages.length ? `${shortages.length}处超量` : "数量充足";
  els.shortageBadge.className = `badge ${shortages.length ? "warn" : "ok"}`;

  const selectedType = getSelectedType();
  els.selectedTypeLabel.textContent = selectedType ? `当前：${selectedType.char} · ${selectedType.style}` : "未选择字模";

  els.usageList.innerHTML =
    entries
      .map((item) => {
        const used = usage[item.id];
        const warn = used > item.quantity ? "warn" : "";
        return `
          <div class="usage-item ${warn}">
            <strong>${escapeHtml(item.char)} ${escapeHtml(item.style)}</strong>
            <span>${used}/${item.quantity}</span>
          </div>
        `;
      })
      .join("") || `<p class="empty">还没有落字。</p>`;
}

function renderDrafts() {
  els.draftList.innerHTML =
    state.drafts
      .map((draft) => {
        const count = draft.placements.reduce(
          (sum, item) => sum + (Array.isArray(item.layers) ? item.layers.length : 1),
          0
        );
        return `
          <article class="draft-item">
            <strong>${escapeHtml(draft.title)}</strong>
            <span>${count}个落字 · ${new Date(draft.savedAt).toLocaleString("zh-CN")}</span>
            <div class="draft-actions">
              <button type="button" data-load-draft="${draft.id}">载入</button>
              <button type="button" data-delete-draft="${draft.id}">删除</button>
            </div>
          </article>
        `;
      })
      .join("") || `<p class="empty">还没有保存草稿。</p>`;
}

function renderAll() {
  saveState();
  renderSettings();
  renderStyleFilter();
  renderInventory();
  renderStage();
  renderUsage();
  renderDrafts();
}

function placeType(row, col, typeId = state.selectedTypeId) {
  if (!typeId) return;
  const type = getTypeById(typeId);
  if (!type) return;
  const existing = state.placements.find((item) => item.row === row && item.col === col);
  if (!existing) {
    if (remainingStock(typeId) < 1) {
      showNotice(`「${type.char}」数量不足，无法落字。`);
      return;
    }
    state.placements.push({ row, col, layers: [typeId] });
    clearNotice();
    renderAll();
    return;
  }
  if (existing.layers.includes(typeId)) {
    showNotice("同一件字模不能叠在自己上面。");
    return;
  }
  if (existing.layers.length >= 2) {
    showNotice("每格最多两层，可先撤掉上层再落字。");
    return;
  }
  const bottomType = getTypeById(existing.layers[0]);
  if (bottomType && type.size > bottomType.size) {
    showNotice(`上层字号不能大于底字（上层${type.size}px ＞ 底字${bottomType.size}px）。`);
    return;
  }
  if (remainingStock(typeId) < 1) {
    showNotice(`「${type.char}」数量不足，无法叠加上层。`);
    return;
  }
  existing.layers.push(typeId);
  clearNotice();
  renderAll();
}

function swapLayers(row, col) {
  const placement = state.placements.find((item) => item.row === row && item.col === col);
  if (!placement || placement.layers.length < 2) return;
  const bottomType = getTypeById(placement.layers[0]);
  const topType = getTypeById(placement.layers[1]);
  if (bottomType && topType && bottomType.size > topType.size) {
    showNotice(`切换后上层字号（${bottomType.size}px）会大于底字（${topType.size}px），无法切换。`);
    return;
  }
  placement.layers = [placement.layers[1], placement.layers[0]];
  clearNotice();
  renderAll();
}

function removeTopLayer(row, col) {
  const index = state.placements.findIndex((item) => item.row === row && item.col === col);
  if (index < 0) return;
  const placement = state.placements[index];
  placement.layers.pop();
  if (placement.layers.length === 0) state.placements.splice(index, 1);
  clearNotice();
  renderAll();
}

function addType(event) {
  event.preventDefault();
  const item = {
    id: crypto.randomUUID(),
    char: els.charInput.value.trim(),
    style: els.styleInput.value.trim(),
    size: Number(els.sizeInput.value),
    quantity: Number(els.quantityInput.value),
    wear: els.wearInput.value
  };
  if (!item.char || !item.style) return;
  state.inventory.unshift(item);
  state.selectedTypeId = item.id;
  els.typeForm.reset();
  els.sizeInput.value = 24;
  els.quantityInput.value = 3;
  renderAll();
}

function saveDraft() {
  const title = state.settings.workTitle.trim() || "未命名作品";
  state.drafts.unshift({
    id: crypto.randomUUID(),
    title,
    settings: structuredClone(state.settings),
    placements: structuredClone(state.placements),
    savedAt: new Date().toISOString()
  });
  state.drafts = state.drafts.slice(0, 8);
  renderAll();
}

function exportPreview() {
  const { cols, rows } = getGrid();
  const cell = state.settings.paperSize === "bookmark" ? 44 : 56;
  const gap = state.settings.gridGap;
  const margin = 48;
  const width = cols * cell + (cols - 1) * gap + margin * 2;
  const height = rows * cell + (rows - 1) * gap + margin * 2 + 70;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fffaf1";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "#2f2921";
  ctx.lineWidth = 4;
  ctx.strokeRect(18, 18, width - 36, height - 36);
  ctx.fillStyle = "#22201c";
  ctx.font = "bold 28px sans-serif";
  ctx.fillText(state.settings.workTitle || "未命名作品", margin, 50);
  ctx.font = "bold 30px serif";
  state.placements.forEach((placement) => {
    const bottomType = getTypeById(placement.layers[0]);
    if (!bottomType) return;
    const topType = placement.layers.length > 1 ? getTypeById(placement.layers[1]) : null;
    const x = margin + placement.col * (cell + gap);
    const y = margin + 45 + placement.row * (cell + gap);
    ctx.fillStyle = "#2f2921";
    ctx.fillRect(x, y, cell, cell);
    ctx.fillStyle = "#fff5df";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `900 ${Math.min(bottomType.size + 8, 42)}px serif`;
    ctx.fillText(bottomType.char, x + cell / 2, y + cell / 2);
    if (topType) {
      const badge = Math.round(cell * 0.4);
      const bx = x + cell - badge - 3;
      const by = y + 3;
      ctx.fillStyle = "#a64037";
      ctx.fillRect(bx, by, badge, badge);
      ctx.fillStyle = "#fff5df";
      ctx.font = `900 ${Math.min(topType.size, Math.round(badge * 0.62))}px serif`;
      ctx.fillText(topType.char, bx + badge / 2, by + badge / 2 + 1);
    }
  });
  const link = document.createElement("a");
  link.download = `${state.settings.workTitle || "movable-type"}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

els.paperSize.addEventListener("change", () => {
  state.settings.paperSize = els.paperSize.value;
  const { cols, rows } = getGrid();
  state.placements = state.placements.filter((item) => item.row < rows && item.col < cols);
  renderAll();
});

els.flowMode.addEventListener("change", () => {
  state.settings.flowMode = els.flowMode.value;
  renderAll();
});

els.gridGap.addEventListener("input", () => {
  state.settings.gridGap = Number(els.gridGap.value);
  renderAll();
});

els.workTitle.addEventListener("input", () => {
  state.settings.workTitle = els.workTitle.value;
  saveState();
});

els.typeForm.addEventListener("submit", addType);
els.inventorySearch.addEventListener("input", renderInventory);
els.styleFilter.addEventListener("change", renderInventory);
els.saveDraftBtn.addEventListener("click", saveDraft);
els.exportBtn.addEventListener("click", exportPreview);
els.clearBoardBtn.addEventListener("click", () => {
  state.placements = [];
  renderAll();
});

els.typeList.addEventListener("click", (event) => {
  const deleteButton = event.target.closest("[data-delete-type]");
  if (deleteButton) {
    const typeId = deleteButton.dataset.deleteType;
    state.inventory = state.inventory.filter((item) => item.id !== typeId);
    state.placements = state.placements
      .map((item) => ({ ...item, layers: item.layers.filter((id) => id !== typeId) }))
      .filter((item) => item.layers.length > 0);
    if (state.selectedTypeId === typeId) state.selectedTypeId = state.inventory[0]?.id || null;
    renderAll();
    return;
  }
  const card = event.target.closest("[data-type-id]");
  if (!card) return;
  state.selectedTypeId = card.dataset.typeId;
  renderAll();
});

els.typeList.addEventListener("dragstart", (event) => {
  const card = event.target.closest("[data-type-id]");
  if (!card) return;
  event.dataTransfer.setData("text/plain", card.dataset.typeId);
});

els.stage.addEventListener("dragover", (event) => {
  if (event.target.closest(".cell")) event.preventDefault();
});

els.stage.addEventListener("drop", (event) => {
  const cell = event.target.closest(".cell");
  if (!cell) return;
  event.preventDefault();
  placeType(Number(cell.dataset.row), Number(cell.dataset.col), event.dataTransfer.getData("text/plain"));
});

els.stage.addEventListener("click", (event) => {
  const swapButton = event.target.closest("[data-swap]");
  if (swapButton) {
    const cell = swapButton.closest(".cell");
    swapLayers(Number(cell.dataset.row), Number(cell.dataset.col));
    return;
  }
  const removeButton = event.target.closest("[data-remove-top]");
  if (removeButton) {
    const cell = removeButton.closest(".cell");
    removeTopLayer(Number(cell.dataset.row), Number(cell.dataset.col));
    return;
  }
  const cell = event.target.closest(".cell");
  if (!cell) return;
  placeType(Number(cell.dataset.row), Number(cell.dataset.col));
});

els.stage.addEventListener("keydown", (event) => {
  const cell = event.target.closest(".cell");
  if (!cell || event.target !== cell) return;
  const row = Number(cell.dataset.row);
  const col = Number(cell.dataset.col);
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    placeType(row, col);
  } else if (event.key === "Backspace" || event.key === "Delete") {
    event.preventDefault();
    removeTopLayer(row, col);
  }
});

els.draftList.addEventListener("click", (event) => {
  const loadButton = event.target.closest("[data-load-draft]");
  const deleteButton = event.target.closest("[data-delete-draft]");
  if (loadButton) {
    const draft = state.drafts.find((item) => item.id === loadButton.dataset.loadDraft);
    if (!draft) return;
    state.settings = structuredClone(draft.settings);
    state.placements = normalizePlacements(structuredClone(draft.placements));
    renderAll();
  }
  if (deleteButton) {
    state.drafts = state.drafts.filter((item) => item.id !== deleteButton.dataset.deleteDraft);
    renderAll();
  }
});

renderAll();
