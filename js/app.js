/* global PRODUCTS */

const state = {
  category: "Todas",
  search: "",
  cart: [],
  cartSeq: 0,
  manualPrices: {}
};

const el = (id) => document.getElementById(id);

function formatPEN(n) {
  const val = Math.max(0, Math.round(Number(n) || 0));
  return `S/ ${val}`;
}

function safeImg(src) {
  return src && src.trim().length ? src : "assets/images/placeholder.jpg";
}

const CATEGORY_ORDER = [
  "Todas",
  "Basicas",
  "Largo Alcance",
  "Imou",
  "Solar Chip",
  "Solar Wi-Fi",
  "Tapo",
  "Extras"
];

function getEffectivePrice(item) {
  if (state.manualPrices[item.cartId] !== undefined) {
    return state.manualPrices[item.cartId];
  }
  return Number(item.price) || 0;
}

function calculateSubtotal() {
  const cams = state.cart.filter(p => p.type === "camera");
  const extras = state.cart.filter(p => p.type === "extra");
  
  let total = 0;
  cams.forEach(p => {
    total += getEffectivePrice(p) + memoryExtra(p.memory);
  });
  extras.forEach(p => {
    total += getEffectivePrice(p);
  });
  return total;
}

function memoryExtra(mem) {
  if (mem === "128") return 40;
  if (mem === "256") return 80;
  if (mem === "512") return 160;
  if (mem === "sin") return 0;
  return 0; // 64 incluida
}

function categoriesFromProducts() {
  const set = new Set(PRODUCTS.map(p => p.category));
  const existing = Array.from(set);
  const ordered = CATEGORY_ORDER.filter(cat => existing.includes(cat));
  return ["Todas", ...ordered];
}

function filteredProducts() {
  const q = state.search.trim().toLowerCase();
  return PRODUCTS.filter(p => {
    const byCat = state.category === "Todas" || p.category === state.category;
    const bySearch = !q || p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q);
    return byCat && bySearch;
  });
}

function cartTotal() {
  return state.cart.reduce((acc, p) => acc + getEffectivePrice(p), 0);
}

function renderTabs() {
  const tabs = el("categoryTabs");
  if (!tabs) return;
  tabs.innerHTML = "";
  const cats = categoriesFromProducts();
  cats.forEach(cat => {
    const btn = document.createElement("button");
    btn.className = "tab" + (state.category === cat ? " active" : "");
    btn.textContent = cat;
    btn.onclick = () => {
      state.category = cat;
      renderAll();
    };
    tabs.appendChild(btn);
  });
}

const SUBCAT_ORDER = ["Interiores", "Exteriores", "Otros"];

function normalizeSubCategory(sc) {
  const s = String(sc || "").trim().toLowerCase();
  if (s === "exteriores") return "Exteriores";
  if (s === "interiores") return "Interiores";
  return "Otros";
}

function hasAnySubCategory(items) {
  return items.some(p => String(p.subCategory || "").trim().length > 0);
}

function renderGrid() {
  const grid = el("productGrid");
  if (!grid) return;
  grid.innerHTML = "";
  const items = filteredProducts();
  const useGrouping = hasAnySubCategory(items);

  if (useGrouping) {
    const groups = { Interiores: [], Exteriores: [], Otros: [] };
    items.forEach(p => {
      const key = normalizeSubCategory(p.subCategory);
      groups[key].push(p);
    });
    let anyRendered = false;
    SUBCAT_ORDER.forEach(title => {
      const arr = groups[title];
      if (!arr || arr.length === 0) return;
      anyRendered = true;
      const h = document.createElement("div");
      h.className = "grid-subtitle";
      h.textContent = title;
      grid.appendChild(h);
      arr.forEach(p => {
        grid.appendChild(createCard(p));
      });
    });
    if (!anyRendered) {
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = "No hay productos con ese filtro.";
      grid.appendChild(empty);
    }
    return;
  }

  items.forEach(p => {
    grid.appendChild(createCard(p));
  });

  if (items.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "No hay productos con ese filtro.";
    grid.appendChild(empty);
  }
}

function createCard(p) {
  const card = document.createElement("div");
  card.className = "card";
  card.innerHTML = `
    <div class="card-img">
      <img src="${safeImg(p.image)}" alt="${p.name}">
    </div>
    <div class="card-body">
      <div class="card-name">${p.name}</div>
      <div class="card-meta">
        <span class="badge">${p.category}</span>
        <span class="price">${formatPEN(p.price)}</span>
      </div>
    </div>
    <div class="card-actions">
      <button class="btn small ghost" data-action="zoom">Ver</button>
      <button class="btn small" data-action="add">Agregar</button>
    </div>
  `;
  card.querySelector('[data-action="add"]').onclick = (e) => {
    e.stopPropagation();
    addToCart(p);
  };
  card.querySelector('[data-action="zoom"]').onclick = (e) => {
    e.stopPropagation();
    openModal(p);
  };
  card.onclick = (e) => {
    if (e.target.closest("button")) return;
    openModal(p);
  };
  return card;
}

function renderCart() {
  const list = el("cartItems");
  if (list) {
    list.innerHTML = "";
    state.cart.forEach((p, idx) => {
      const li = document.createElement("li");
      li.className = "cart-item";
      li.innerHTML = `
        <div class="ci-left">
          <div class="ci-name">${p.name}</div>
          <div class="ci-sub">${p.category}</div>
        </div>
        <div class="ci-right">
          <div class="ci-price">${formatPEN(p.price)}</div>
          <button class="ci-remove" title="Quitar">✕</button>
        </div>
      `;
      li.querySelector(".ci-remove").onclick = (e) => {
        e.stopPropagation();
        removeAt(idx);
      };
      li.onclick = () => openModal(p);
      list.appendChild(li);
    });
  }
  const ct = el("cartTotal");
  if (ct) ct.textContent = formatPEN(cartTotal());
  actualizarContadorCarrito();
}

function renderAll() {
  renderTabs();
  renderGrid();
  renderCart();
}

function addToCart(product) {
  const item = { ...product, cartId: ++state.cartSeq };
  if (item.type === "camera") item.memory = "64";
  state.cart.push(item);
  renderCart();
}

function removeAt(index) {
  state.cart.splice(index, 1);
  renderCart();
}

function undoLast() {
  state.cart.pop();
  renderCart();
}

function clearCart() {
  state.cart = [];
  state.manualPrices = {};
  renderCart();
  showCopyNote("");
}

/* MODAL PRODUCTO */
let modalProduct = null;

function openModal(product) {
  modalProduct = product;
  el("modalImg").src = safeImg(product.image);
  el("modalName").textContent = product.name;
  el("modalPrice").textContent = formatPEN(product.price);

  const ul = el("modalHighlights");
  ul.innerHTML = "";
  const highlights = Array.isArray(product.highlights) ? product.highlights : [];
  highlights.slice(0, 8).forEach(text => {
    const li = document.createElement("li");
    li.textContent = text;
    ul.appendChild(li);
  });
  const missing = 5 - ul.children.length;
  for (let i = 0; i < missing; i++) {
    const li = document.createElement("li");
    li.textContent = "—";
    li.style.opacity = "0.35";
    ul.appendChild(li);
  }

  const addBtn = el("modalAdd");
  const addedNote = el("modalAddedNote");
  if (isInCart(product)) {
    addBtn.classList.add("hidden");
    addedNote.classList.remove("hidden");
  } else {
    addBtn.classList.remove("hidden");
    addedNote.classList.add("hidden");
  }
  el("modal").classList.remove("hidden");
}

function closeModal() {
  el("modal").classList.add("hidden");
  modalProduct = null;
}

/* MODAL RESUMEN */
function openSummary() {
  renderSummary();
  el("summaryModal").classList.remove("hidden");
}

function closeSummary() {
  el("summaryModal").classList.add("hidden");
}

function renderSummary() {
  function memoryImg(mem) {
  if (mem === "128") return "memorias/MEMORIA 128 GB.jpg";
  if (mem === "256") return "memorias/MEMORIA 256 GB.jpg";
  if (mem === "512") return "memorias/MEMORIA 512 GB.jpg";
  if (mem === "sin") return ""; // sin imagen
  return "memorias/MEMORIA 64 GB.jpg";
}
  function memoryText(mem) {
  if (mem === "128") return "128GB (+ S/40)";
  if (mem === "256") return "256GB (+ S/80)";
  if (mem === "512") return "512GB (+ S/160)";
  if (mem === "sin") return "Sin memoria";
  return "64GB (incluida)";
}

  const cams = state.cart.filter(p => p.type === "camera");
  const extras = state.cart.filter(p => p.type === "extra");

  // === 1) Render líneas ===
  const linesBox = el("summaryLines");
  if (linesBox) {
    linesBox.innerHTML = "";

    cams.forEach(p => {
      const row = document.createElement("div");
      row.className = "sum-line";
      const effectivePrice = getEffectivePrice(p);
      const isManual = state.manualPrices[p.cartId] !== undefined;
      
      row.innerHTML = `
        <div class="name" style="flex:1;">
          ${p.name}
          <div style="margin-top:8px; opacity:.9; font-weight:800; font-size:12px;">
            Memoria:
            <select class="mem-select" data-cartid="${p.cartId}">
  <option value="64" ${p.memory === "64" ? "selected" : ""}>64GB (incluida)</option>
  <option value="128" ${p.memory === "128" ? "selected" : ""}>128GB (+ S/40)</option>
  <option value="256" ${p.memory === "256" ? "selected" : ""}>256GB (+ S/80)</option>
  <option value="512" ${p.memory === "512" ? "selected" : ""}>512GB (+ S/160)</option>
  <option value="sin" ${p.memory === "sin" ? "selected" : ""}>Sin memoria</option>
</select>
          </div>
        </div>
        <div class="price-cell" style="display:flex; align-items:center; gap:8px;">
          <span class="original-price" style="font-size:12px; color:#6b7280; text-decoration:${isManual ? 'line-through' : 'none'};">
            ${formatPEN(Number(p.price) || 0)}
          </span>
          <div class="price-input-cell" style="position:relative;">
            <span style="position:absolute; left:8px; top:50%; transform:translateY(-50%); font-size:12px; color:#6b7280;">S/</span>
            <input type="text" inputmode="numeric" class="item-price-input" data-cartid="${p.cartId}" 
              value="${isManual ? effectivePrice : ''}" placeholder="${formatPEN(Number(p.price) || 0)}"
              style="width:80px; padding:6px 6px 6px 24px; border-radius:6px; border:1px solid ${isManual ? 'rgba(34,197,94,.4)' : 'rgba(255,255,255,.15)'}; background:rgba(255,255,255,.05); color:#22c55e; font-size:14px; font-weight:900; text-align:right; outline:none;">
          </div>
        </div>
      `;
      linesBox.appendChild(row);
    });

    extras.forEach(p => {
      const row = document.createElement("div");
      row.className = "sum-line";
      const effectivePrice = getEffectivePrice(p);
      const isManual = state.manualPrices[p.cartId] !== undefined;
      
      row.innerHTML = `
        <div class="name" style="flex:1;">
          ${p.name}
          <div style="font-size:11px; color:#6b7280; margin-top:4px;">Extra</div>
        </div>
        <div class="price-cell" style="display:flex; align-items:center; gap:8px;">
          <span class="original-price" style="font-size:12px; color:#6b7280; text-decoration:${isManual ? 'line-through' : 'none'};">
            ${formatPEN(Number(p.price) || 0)}
          </span>
          <div class="price-input-cell" style="position:relative;">
            <span style="position:absolute; left:8px; top:50%; transform:translateY(-50%); font-size:12px; color:#6b7280;">S/</span>
            <input type="text" inputmode="numeric" class="item-price-input" data-cartid="${p.cartId}" 
              value="${isManual ? effectivePrice : ''}" placeholder="${formatPEN(Number(p.price) || 0)}"
              style="width:80px; padding:6px 6px 6px 24px; border-radius:6px; border:1px solid ${isManual ? 'rgba(34,197,94,.4)' : 'rgba(255,255,255,.15)'}; background:rgba(255,255,255,.05); color:#22c55e; font-size:14px; font-weight:900; text-align:right; outline:none;">
          </div>
        </div>
      `;
      linesBox.appendChild(row);
    });
  }

  // === 2) Cálculos automáticos ===
  const subtotal = calculateSubtotal();
  const precioOriginalTotal = [...cams, ...extras].reduce((acc, p) => acc + (Number(p.price) || 0) + (p.type === "camera" ? memoryExtra(p.memory) : 0), 0);
  const descuento = Math.max(0, precioOriginalTotal - subtotal);

  if (el("sumSubtotal")) el("sumSubtotal").textContent = formatPEN(precioOriginalTotal);
  if (el("sumDiscountValue")) el("sumDiscountValue").textContent = formatPEN(descuento);
  if (el("sumFinal")) el("sumFinal").textContent = formatPEN(subtotal);

  // === 3) Combo box ===
  const comboBox = el("comboBox");
  if (comboBox) {
    comboBox.innerHTML = "";
    cams.forEach(p => {
      const item = document.createElement("div");
      item.className = "combo-item";
      const effectivePrice = getEffectivePrice(p);
      item.innerHTML = `
        <img class="combo-img" src="${p.image}" alt="${p.name}">
        <div class="combo-meta">
          <div class="combo-name">${p.name}</div>
          <div class="combo-mem">
            <img class="mem-img" src="${memoryImg(p.memory)}" alt="Memoria ${p.memory}GB">
            <span>${memoryText(p.memory)}</span>
          </div>
        </div>
        <div class="combo-price">${formatPEN(effectivePrice + memoryExtra(p.memory))}</div>
      `;
      comboBox.appendChild(item);
    });
    extras.forEach(p => {
      const item = document.createElement("div");
      item.className = "combo-item";
      const effectivePrice = getEffectivePrice(p);
      item.innerHTML = `
        <img class="combo-img" src="${p.image}" alt="${p.name}">
        <div class="combo-meta">
          <div class="combo-name">${p.name}</div>
          <div class="combo-mem" style="opacity:.7;">Extra</div>
        </div>
        <div class="combo-price">${formatPEN(effectivePrice)}</div>
      `;
      comboBox.appendChild(item);
    });
  }
}

function cartText() {
  const names = state.cart.map(p => p.name);
  const subtotal = calculateSubtotal();
  const precioOriginal = state.cart.reduce((acc, p) => acc + (Number(p.price) || 0) + (p.type === "camera" ? memoryExtra(p.memory) : 0), 0);
  const descuento = Math.max(0, precioOriginal - subtotal);
  
  return [
    `COMBO BuyPal (Live)`,
    `Productos: ${names.length ? names.join(" + ") : "(vacío)"}`,
    `Subtotal: ${formatPEN(precioOriginal)}`,
    `Descuento: ${formatPEN(descuento)}`,
    `Final: ${formatPEN(subtotal)}`
  ].join("\n");
}

function showCopyNote(msg) {
  const note = el("copyNote");
  if (note) note.textContent = msg || "";
}

async function copyToClipboard() {
  try {
    await navigator.clipboard.writeText(cartText());
    showCopyNote("✅ Copiado.");
    setTimeout(() => showCopyNote(""), 2500);
  } catch {
    showCopyNote("No se pudo copiar.");
  }
}

async function goFullscreen() {
  try { await document.documentElement.requestFullscreen(); } catch { }
}

function actualizarContadorCarrito() {
  const contador = document.getElementById('contadorCarrito');
  if (!contador) return;
  const totalItems = state.cart.length;
  contador.textContent = totalItems;
  contador.style.display = totalItems === 0 ? 'none' : 'inline-flex';
}

function abrirResumenDesdeBoton() {
  if (state.cart.length === 0) {
    alert('🛒 No hay productos en el pedido');
    return;
  }
  openSummary();
}

/* ==========================================
   ACTUALIZAR TOTALES (dinámico, sin tocar inputs)
   ========================================== */
function actualizarTotales() {
  const cams = state.cart.filter(p => p.type === 'camera');
  const extras = state.cart.filter(p => p.type === 'extra');
  const allItems = [...cams, ...extras];

  // Precio original total (sin manuales)
  let precioOriginalTotal = 0;
  allItems.forEach(p => {
    precioOriginalTotal += (Number(p.price) || 0) + (p.type === 'camera' ? memoryExtra(p.memory) : 0);
  });

  // Subtotal con precios manuales
  const subtotal = calculateSubtotal();
  const descuento = Math.max(0, precioOriginalTotal - subtotal);

  if (el("sumSubtotal")) el("sumSubtotal").textContent = formatPEN(precioOriginalTotal);
  if (el("sumDiscountValue")) el("sumDiscountValue").textContent = formatPEN(descuento);
  if (el("sumFinal")) el("sumFinal").textContent = formatPEN(subtotal);

  // ComboBox precios
  const comboPrices = document.querySelectorAll('.combo-price');
  let priceIndex = 0;
  cams.forEach(p => {
    if (comboPrices[priceIndex]) {
      comboPrices[priceIndex].textContent = formatPEN(getEffectivePrice(p) + memoryExtra(p.memory));
    }
    priceIndex++;
  });
  extras.forEach(p => {
    if (comboPrices[priceIndex]) {
      comboPrices[priceIndex].textContent = formatPEN(getEffectivePrice(p));
    }
    priceIndex++;
  });

  // ComboBox memorias
  const memImgs = document.querySelectorAll('.combo-mem .mem-img');
  const memTexts = document.querySelectorAll('.combo-mem span');
  let memIndex = 0;
  cams.forEach(p => {
    if (memImgs[memIndex]) {
      memImgs[memIndex].src = p.memory === "128" ? "memorias/MEMORIA 128 GB.jpg" :
                              p.memory === "256" ? "memorias/MEMORIA 256 GB.jpg" :
                              p.memory === "512" ? "memorias/MEMORIA 512 GB.jpg" :
                              "memorias/MEMORIA 64 GB.jpg";
    }
    if (memTexts[memIndex]) {
      memTexts[memIndex].textContent = p.memory === "128" ? "128GB (+ S/40)" :
                                       p.memory === "256" ? "256GB (+ S/80)" :
                                       p.memory === "512" ? "512GB (+ S/160)" :
                                       "64GB (incluida)";
    }
    memIndex++;
  });

  actualizarContadorCarrito();
}

/* EVENTOS */
function bindEvents() {
  // ✅ Botón "Subir al Excel" en modal resumen
const btnIrPedidoFinal = el("btnIrPedidoFinal");
if (btnIrPedidoFinal) {
  btnIrPedidoFinal.onclick = () => {
    closeSummary();
    abrirPedidoFinal();
  };
}

// ✅ Modal pedido final
const pedidoClose = el("pedidoClose");
if (pedidoClose) pedidoClose.onclick = cerrarPedidoFinal;

const pedidoModal = el("pedidoModal");
if (pedidoModal) {
  pedidoModal.addEventListener("click", (e) => {
    if (e.target.id === "pedidoModal") cerrarPedidoFinal();
  });
}

// ✅ Botón enviar a Drive
const btnEnviarPedido = el("btnEnviarPedido");
if (btnEnviarPedido) {
  btnEnviarPedido.onclick = enviarPedidoADrive;
}
  document.addEventListener("input", (e) => {
    if (e.target && e.target.classList.contains("item-price-input")) {
      const cartId = Number(e.target.dataset.cartid);
      const raw = e.target.value || "";
      const clean = raw.replace(/\D/g, "");
      
      if (raw !== clean) {
        const cursorPos = e.target.selectionStart;
        e.target.value = clean;
        e.target.setSelectionRange(cursorPos - (raw.length - clean.length), cursorPos - (raw.length - clean.length));
      }

      if (clean === "") {
        delete state.manualPrices[cartId];
      } else {
        state.manualPrices[cartId] = Number(clean) || 0;
      }

      actualizarTotales();
      return;
    }
  }, true);

  const btnVerPedido = el("btnVerPedido");
  if (btnVerPedido) btnVerPedido.onclick = abrirResumenDesdeBoton;

  const searchInput = el("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      state.search = e.target.value;
      renderGrid();
    });
  }

  el("btnUndo").onclick = undoLast;
  el("btnClear").onclick = clearCart;
  el("btnSummary").onclick = openSummary;
  el("btnFull").onclick = goFullscreen;
  el("modalClose").onclick = closeModal;

  const modal = el("modal");
  if (modal) modal.addEventListener("click", (e) => { if (e.target.id === "modal") closeModal(); });

  el("modalAdd").onclick = () => {
    if (modalProduct) addToCart(modalProduct);
    closeModal();
  };

  el("summaryClose").onclick = closeSummary;
  const summaryModal = el("summaryModal");
  if (summaryModal) summaryModal.addEventListener("click", (e) => { if (e.target.id === "summaryModal") closeSummary(); });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { closeModal(); closeSummary(); }
  });

  document.addEventListener("change", (e) => {
    const sel = e.target;
    if (sel && sel.classList && sel.classList.contains("mem-select")) {
      const cartId = Number(sel.dataset.cartid);
      const item = state.cart.find(x => x.cartId === cartId);
      if (item) {
        item.memory = sel.value;
        renderSummary();
        renderCart();
      }
    }
  }, true);
}

function init() {
  bindEvents();
  renderAll();
}

function isInCart(product) {
  return state.cart.some(p => p.id === product.id);
}
/* ==========================================
   MODAL PEDIDO FINAL (Tabla SKU + Campos)
   ========================================== */

function abrirPedidoFinal() {
  if (state.cart.length === 0) {
    alert('🛒 No hay productos en el pedido');
    return;
  }
  renderTablaPedido();
  el("pedidoModal").classList.remove("hidden");
  
  // ✅ Valores por defecto
  if (el("campoMedio") && !el("campoMedio").value) el("campoMedio").value = "BP";
  if (el("campoTipo") && !el("campoTipo").value) el("campoTipo").value = "Menor";
  if (el("campoTurno") && !el("campoTurno").value) el("campoTurno").value = "T";
  if (el("campoEstado") && !el("campoEstado").value) el("campoEstado").value = "Entregado";

  // ✅ Vacíos por defecto (se asegura que estén vacíos)
  if (el("campoObservacion")) el("campoObservacion").value = "";
  if (el("campoComision")) el("campoComision").value = "";
  if (el("campoBoleta")) el("campoBoleta").value = "";
  if (el("campoZona")) el("campoZona").value = "";
  if (el("campoCobro")) el("campoCobro").value = "";
  if (el("campoValidacion")) el("campoValidacion").value = "";
    // ✅ Cargar datos desde n8n (IA)
  cargarDatosDesdeN8n();
}


function cerrarPedidoFinal() {
  el("pedidoModal").classList.add("hidden");
}

function renderTablaPedido() {
  const tbody = el("tablaPedidoBody");
  if (!tbody) return;

  const cams = state.cart.filter(p => p.type === "camera");
  const extras = state.cart.filter(p => p.type === "extra");
  tbody.innerHTML = "";
  let total = 0;

  cams.forEach(p => {
    const effectivePrice = getEffectivePrice(p);
    const memExtra = memoryExtra(p.memory);
    const precioFinal = effectivePrice + memExtra;
    total += precioFinal;

    const skuCamara = p.id || p.name.replace(/\s+/g, '-').toUpperCase();
    
    // Fila cámara
    const row = document.createElement("tr");
    row.innerHTML = `
      <td style="font-size:10px; color:#9ca3af;">${skuCamara}</td>
      <td>${p.name}</td>
      <td style="font-size:11px; color:#6b7280;">—</td>
      <td style="text-align:right; font-weight:700;">${formatPEN(precioFinal)}</td>
    `;
    tbody.appendChild(row);

    // Fila memoria
    if (p.memory && p.memory !== "sin") {
      const memRow = document.createElement("tr");
      memRow.innerHTML = `
        <td style="font-size:10px; color:#22c55e;">MEMORIA-${p.memory}GB</td>
        <td style="color:#9ca3af;">└ Memoria ${p.memory}GB</td>
        <td style="font-size:11px; color:#6b7280;">Incluida</td>
        <td style="text-align:right; color:#6b7280;">${formatPEN(memExtra)}</td>
      `;
      tbody.appendChild(memRow);
    }
  });

  extras.forEach(p => {
    const effectivePrice = getEffectivePrice(p);
    total += effectivePrice;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td style="font-size:10px; color:#9ca3af;">${p.id || p.name.replace(/\s+/g, '-').toUpperCase()}</td>
      <td>${p.name}</td>
      <td style="font-size:11px; color:#6b7280;">Extra</td>
      <td style="text-align:right; font-weight:700;">${formatPEN(effectivePrice)}</td>
    `;
    tbody.appendChild(row);
  });

  if (el("tablaPedidoTotal")) {
    el("tablaPedidoTotal").textContent = formatPEN(total);
  }
}

function enviarPedidoADrive() {
  const productos = state.cart.map(p => ({
    sku: p.id || p.name.replace(/\s+/g, '-').toUpperCase(),
    observacion: el("campoObservacion")?.value || "",
    q: 1,
    precioUnitario: getEffectivePrice(p) + (p.type === "camera" ? memoryExtra(p.memory) : 0),
    envioCliente: el("campoEnvioCliente")?.value || "",
    comision: el("campoComision")?.value || "",
    adelanto: el("campoAdelanto")?.value || ""
  }));

  const datos = {
    productos: productos,
    agente: el("campoAgente")?.value || "",
    rep: el("campoReparto")?.value || "",
    turno: el("campoTurno")?.value || "T",
    monto: el("campoMonto")?.value || calculateSubtotal(),
    formaPago: el("campoFormaPago")?.value || "",
    pago: el("campoPago")?.value || "",
    boleta: el("campoBoleta")?.value || "",
    ruc: el("campoRUC")?.value || "",
    medio: el("campoMedio")?.value || "BP",
    plataforma: el("campoPlataforma")?.value || "",
    tipo: el("campoTipo")?.value || "Menor",
    dni: el("campoDNI")?.value || "",
    cliente: el("campoCliente")?.value || "",
    celular: el("campoCelular")?.value || "",
    ubicacion: el("campoUbicacion")?.value || "",
    direccion: el("campoDireccion")?.value || "",
    distrito: el("campoDistrito")?.value || "",
    zona: el("campoZona")?.value || "",
    cobro: el("campoCobro")?.value || "",
    referencia: el("campoReferencia")?.value || "",
    obs3: el("campoCorreo")?.value || "",
    estado: el("campoEstado")?.value || "Entregado",
    validacion: el("campoValidacion")?.value || "",
    conversation_id: new URLSearchParams(window.location.search).get('conversation_id') || ""
  };

  console.log("📤 Enviando a n8n:", datos);

  fetch('https://n8n.buypal.com.pe/webhook/Subir_pedido_drive', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos)
  })
  .then(r => r.json())
  .then(() => {
    alert('✅ Pedido subido a Drive correctamente');
    cerrarPedidoFinal();
  })
  .catch(err => {
    alert('❌ Error: ' + err.message);
  });
}
/* ==========================================
   CARGAR DATOS DESDE n8n (IA)
   ========================================== */

async function cargarDatosDesdeN8n() {
  const conversationId = new URLSearchParams(window.location.search).get('conversation_id');
  if (!conversationId) return;

  try {
    // ⚠️ Llama a TU webhook que ahora responde con los datos extraídos
    const response = await fetch('https://n8n.buypal.com.pe/webhook/Tomar_pedido_IA', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: Number(conversationId) })
    });
    const datos = await response.json();

    if (datos && Object.keys(datos).length > 0) {
      autocompletarCampos(datos);
    }
  } catch (err) {
    console.log('⏳ Esperando datos de la IA...');
    setTimeout(cargarDatosDesdeN8n, 3000); // reintenta en 3 segundos
  }
}

function autocompletarCampos(datos) {
  // Mapeo de los campos que devuelve tu IA (Code in JavaScript3) a los IDs del HTML
  const mapeo = {
    nombre: 'campoCliente',
  dni: 'campoDNI',
  numero: 'campoCelular',
  direccion: 'campoDireccion',
  distrito: 'campoDistrito',
  zona: 'campoZona',
  correo: 'campoCorreo',
  agente: 'campoAgente',
  metodo_pago: 'campoFormaPago',
  tipo_envio: 'campoReparto',
  live: 'campoPlataforma',
  link_maps: 'campoUbicacion',
  adelanto: 'campoAdelanto',
  };

  Object.entries(datos).forEach(([clave, valor]) => {
    const campoId = mapeo[clave];
    if (campoId) {
      const campo = el(campoId);
      if (campo && !campo.value && valor) {
        campo.value = valor;
        campo.style.borderColor = 'rgba(34,197,94,.4)'; // Verde = autocompletado por IA
      }
    }
  });
}
init();