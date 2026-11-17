
"use strict";

const $ = selector => document.querySelector(selector);
const money = value => Number(value).toLocaleString("pt-BR", {
  style: "currency", currency: "BRL"
});
const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({
  "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
}[char]));

function safeImage(value) {
  const url = String(value || "").trim();
  return /^https:\/\//i.test(url) ||
    /^data:image\/(png|jpeg|webp|gif);base64,/i.test(url) ? url : "";
}

const INITIAL_DATA = {
store: {
  name: "Bih Bih Pipocas Gourmet",
  logo: "logo.png",
  whatsapp: "",
  description: "Mais que pipoca, é um momento especial!"
},
  categories: ["Clássicas", "Chocolatudas", "Especiais", "Premium"],
  banners: [
    {id:"b1",title:"A felicidade tem sabor de pipoca!",subtitle:"Descubra sabores irresistíveis preparados com muito carinho.",tag:"BEM-VINDO À DOCE ESTOURO",color:"#633253",image:""},
    {id:"b2",title:"Uma explosão de chocolate",subtitle:"Brigadeiro, Nutella e muitas outras delícias.",tag:"PARA QUEM AMA CHOCOLATE",color:"#79435a",image:""},
    {id:"b3",title:"Seu momento merece mais doçura",subtitle:"Escolha suas pipocas favoritas e peça pelo WhatsApp.",tag:"FEITAS COM AMOR",color:"#a95776",image:""}
  ],
  products: [
    {id:"p1",name:"Leite Ninho",category:"Clássicas",price:16,description:"Pipoca crocante envolvida em uma deliciosa camada de leite em pó.",image:"",badge:"Mais pedida",active:true},
    {id:"p2",name:"Brigadeiro",category:"Chocolatudas",price:18,description:"Cobertura cremosa de brigadeiro com sabor intenso de chocolate.",image:"",badge:"Queridinha",active:true},
    {id:"p3",name:"Nutella",category:"Premium",price:24,description:"Pipoca gourmet com um toque irresistível de creme de avelã.",image:"",badge:"Premium",active:true},
    {id:"p4",name:"Doce de Leite",category:"Clássicas",price:18,description:"Crocância especial com o sabor marcante do doce de leite.",image:"",badge:"",active:true},
    {id:"p5",name:"Ninho com Nutella",category:"Premium",price:26,description:"Uma combinação deliciosa de leite em pó e creme de avelã.",image:"",badge:"Especial",active:true},
    {id:"p6",name:"Ovomaltine",category:"Chocolatudas",price:21,description:"Chocolate com o toque crocante e maltado do Ovomaltine.",image:"",badge:"",active:true},
    {id:"p7",name:"Morango Encantado",category:"Especiais",price:19,description:"Cobertura doce com sabor de morango e uma crocância delicada.",image:"",badge:"Novidade",active:true},
    {id:"p8",name:"Cookies & Cream",category:"Premium",price:23,description:"Chocolate branco e pedacinhos crocantes de biscoito.",image:"",badge:"",active:true},
    {id:"p9",name:"Caramelo Crocante",category:"Clássicas",price:15,description:"Pipoca caramelizada, douradinha e crocante a cada mordida.",image:"",badge:"",active:true},
    {id:"p10",name:"Chocolate Branco",category:"Chocolatudas",price:20,description:"Pipoca coberta com chocolate branco doce e delicado.",image:"",badge:"",active:true}
  ]
};

let data = structuredClone(INITIAL_DATA);
let toastTimer;
let selectedProductImage = "";
let selectedBannerImage = "";

function uid() {
  return "id_" + (crypto.randomUUID ? crypto.randomUUID() : Date.now() + "_" + Math.random().toString(36).slice(2));
}

function validateData(value) {
  if (!value || typeof value !== "object" ||
      !value.store || typeof value.store.name !== "string" ||
      !Array.isArray(value.categories) ||
      !Array.isArray(value.products) ||
      !Array.isArray(value.banners)) {
    throw new Error("Estrutura do cardápio inválida.");
  }

  if (value.products.length > 500 || value.banners.length > 50 ||
      value.categories.length > 100) {
    throw new Error("O arquivo contém itens demais.");
  }

  const clean = {
store: {
  name: String(value.store.name).slice(0, 70),
  logo: safeImage(value.store.logo) ||
    (/^[\w./-]+\.(png|jpg|jpeg|webp)$/i.test(value.store.logo || "")
      ? value.store.logo
      : "logo.png"),
  whatsapp: String(value.store.whatsapp || "")
    .replace(/\D/g, "").slice(0, 13),
  description: String(value.store.description || "").slice(0, 500)
},
    categories: [...new Set(value.categories.map(x => String(x).slice(0,60)).filter(Boolean))],
    banners: [],
    products: []
  };

  clean.products = value.products.map(p => {
    const price = Number(p.price);
    if (!p.id || !p.name || !Number.isFinite(price) || price < 0 || price > 99999) {
      throw new Error("Há um produto com dados inválidos.");
    }
    return {
      id:String(p.id).slice(0,100),
      name:String(p.name).slice(0,90),
      category:String(p.category || "").slice(0,60),
      price,
      description:String(p.description || "").slice(0,350),
      badge:String(p.badge || "").slice(0,35),
      image:safeImage(p.image),
      active:p.active !== false,
      saleType:p.saleType === "single" ? "single" : "sizes"
    };
  });

  clean.banners = value.banners.map(b => ({
    id:String(b.id || uid()).slice(0,100),
    title:String(b.title || "").slice(0,120),
    subtitle:String(b.subtitle || "").slice(0,250),
    tag:String(b.tag || "").slice(0,60),
    color:/^#[0-9a-f]{6}$/i.test(b.color) ? b.color : "#633253",
    image:safeImage(b.image)
  }));

  return clean;
}

const API_URL = "https://api-cardapio-gourmet.contato-lemeservices.workers.dev/cardapio";
let adminPassword = sessionStorage.getItem("pipoca_admin_password") || "";
let saving = Promise.resolve();

async function initializeData() {
  try {
    const response = await fetch(API_URL, {cache:"no-store"});
    if (!response.ok) throw new Error("API retornou " + response.status);
    data = validateData(await response.json());
  } catch (error) {
    console.warn("Falha ao consultar API:", error);
    try {
      const response = await fetch("cardapio.json", {cache:"no-store"});
      if (response.ok) data = validateData(await response.json());
    } catch {}
    alert("Não foi possível acessar o cardápio online. Confira a API antes de editar; alterações não serão publicadas enquanto ela estiver indisponível.");
  }
  localStorage.removeItem("pipoca_catalog_preview");
  renderAll();
  bindEvents();
}

function save() {
  // A fila evita que duas edições simultâneas sobrescrevam uma à outra.
  const snapshot = structuredClone(data);
  renderAll();
  saving = saving.catch(() => {}).then(async () => {
    if (!adminPassword) {
      const entered = prompt("Digite a senha administrativa configurada no Cloudflare:");
      if (!entered) throw new Error("Publicação cancelada: senha não informada.");
      adminPassword = entered;
    }
    const response = await fetch(API_URL, {
      method: "PUT",
      headers: {"Content-Type":"application/json", "X-Admin-Password":adminPassword},
      body: JSON.stringify(snapshot),
      cache: "no-store"
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        adminPassword = "";
        sessionStorage.removeItem("pipoca_admin_password");
      }
      throw new Error(result.error || ("Erro HTTP " + response.status));
    }
    sessionStorage.setItem("pipoca_admin_password", adminPassword);
    toast("✓ Cardápio publicado para todos os celulares!");
  }).catch(error => {
    alert("Não foi possível publicar: " + error.message + "\nConfira a conexão e tente salvar novamente. Você também pode exportar um backup JSON.");
    return false;
  });
  return true;
}

function toast(message) {
  const el = $("#adminToast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2700);
}

function renderAll() {
  renderProducts();
  renderCategories();
  renderBanners();
  renderSettings();
}

function showPage(page) {
  document.querySelectorAll(".admin-page").forEach(el =>
    el.classList.toggle("active", el.id === "page-" + page)
  );
  document.querySelectorAll(".nav-btn").forEach(el =>
    el.classList.toggle("active", el.dataset.page === page)
  );
  window.scrollTo({top:0,behavior:"smooth"});
}

function thumbHTML(image, className = "product-thumb") {
  const url = safeImage(image);
  return url
    ? `<img class="${className}" src="${esc(url)}" alt="">`
    : `<div class="${className} thumb-placeholder">🍿</div>`;
}

function renderProducts() {
  $("#totalProducts").textContent = data.products.length;
  $("#activeProducts").textContent = data.products.filter(p => p.active).length;

  const filter = $("#adminCategoryFilter");
  const previous = filter.value;
  filter.innerHTML = `<option value="">Todas as categorias</option>` +
    data.categories.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join("");
  filter.value = data.categories.includes(previous) ? previous : "";

  const query = $("#adminSearch").value.toLocaleLowerCase("pt-BR");
  const category = filter.value;

  const products = data.products.filter(p =>
    (!category || p.category === category) &&
    (p.name + " " + p.category).toLocaleLowerCase("pt-BR").includes(query)
  );

  $("#adminProductList").innerHTML = products.length
    ? products.map(p => `<div class="product-row">
        ${thumbHTML(p.image)}
        <div class="product-details">
          <h3>${esc(p.name)}</h3>
          <p>${esc(p.category)}</p>
          <strong>${money(p.price)}${p.saleType === "single" ? " • Sachê 50g" : ""}</strong>
        </div>
        <span class="status ${p.active ? "" : "off"}">${p.active ? "Disponível" : "Oculto"}</span>
        <div class="row-actions">
          <button class="small-btn" data-edit-product="${esc(p.id)}">Editar</button>
          <button class="small-btn" data-toggle-product="${esc(p.id)}">${p.active ? "Ocultar" : "Ativar"}</button>
          <button class="small-btn delete" data-delete-product="${esc(p.id)}">Excluir</button>
        </div>
      </div>`).join("")
    : `<p style="color:#8b7c85">Nenhum produto encontrado.</p>`;
}

function fillProductCategories(selected = "") {
  $("#productCategory").innerHTML = data.categories.map(c =>
    `<option value="${esc(c)}">${esc(c)}</option>`
  ).join("");
  if (selected) $("#productCategory").value = selected;
}

function openModal(id) {
  $("#" + id).classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeModal(id) {
  $("#" + id).classList.remove("open");
  if (!document.querySelector(".modal-backdrop.open")) {
    document.body.style.overflow = "";
  }
}

function previewImage(target, url, fallback) {
  const el = $(target);
  const safe = safeImage(url);
  el.style.backgroundImage = safe ? `url("${safe}")` : "";
  el.textContent = safe ? "" : fallback;
}

function openProduct(id = "") {
  $("#productForm").reset();
  const product = data.products.find(p => p.id === id);
  $("#productModalTitle").textContent = product ? "Editar produto" : "Novo produto";
  $("#productId").value = product?.id || "";
  $("#productName").value = product?.name || "";
  $("#productPrice").value = product?.price ?? "";
  $("#productSaleType").value = product?.saleType === "single" ? "single" : "sizes";
  $("#productDescription").value = product?.description || "";
  $("#productBadge").value = product?.badge || "";
  $("#productImage").value = product?.image?.startsWith("https://") ? product.image : "";
  $("#productActive").checked = product ? product.active : true;
  $("#productImageFile").value = "";
  selectedProductImage = product?.image || "";

  fillProductCategories(product?.category);
  previewImage("#productImagePreview", selectedProductImage, "🍿");
  openModal("productModal");
}

async function readImage(file) {
  if (!file) return "";
  if (!["image/png","image/jpeg","image/webp"].includes(file.type)) {
    throw new Error("Use imagens PNG, JPG ou WebP.");
  }
if (file.size > 1024 * 1024) {
  throw new Error("A imagem deve ter no máximo 1 MB.");
}
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Falha ao ler a imagem."));
    reader.readAsDataURL(file);
  });
}

async function saveProduct(event) {
  event.preventDefault();
  const id = $("#productId").value || uid();
  const price = Number($("#productPrice").value);
  if (!Number.isFinite(price) || price <= 0) {
    alert("Informe um preço válido.");
    return;
  }

  try {
    const file = $("#productImageFile").files[0];
    const image = file
      ? await readImage(file)
      : ($("#productImage").value.trim() || selectedProductImage);

    const product = {
      id,
      name:$("#productName").value.trim(),
      price,
      category:$("#productCategory").value,
      description:$("#productDescription").value.trim(),
      badge:$("#productBadge").value.trim(),
      image:safeImage(image),
      active:$("#productActive").checked,
      saleType:$("#productSaleType").value === "single" ? "single" : "sizes"
    };

    if (!product.name || !product.category) {
      alert("Preencha o nome e a categoria.");
      return;
    }

    const index = data.products.findIndex(p => p.id === id);
    if (index >= 0) data.products[index] = product;
    else data.products.push(product);

    if (save()) closeModal("productModal");
  } catch (error) {
    alert(error.message);
  }
}

function toggleProduct(id) {
  const product = data.products.find(p => p.id === id);
  if (!product) return;
  product.active = !product.active;
  save();
}

function deleteProduct(id) {
  const product = data.products.find(p => p.id === id);
  if (!product || !confirm(`Excluir "${product.name}"?`)) return;
  data.products = data.products.filter(p => p.id !== id);
  save();
}

function renderCategories() {
  $("#categoryList").innerHTML = data.categories.map((c, i) =>
    `<div class="simple-item">
      <span>🏷️ ${esc(c)}</span>
      <div>
        <button class="small-btn" data-edit-category="${i}">Renomear</button>
        <button class="small-btn delete" data-delete-category="${i}">Excluir</button>
      </div>
    </div>`
  ).join("");
}

function addCategory(event) {
  event.preventDefault();
  const name = $("#categoryName").value.trim();
  if (!name) return;
  if (data.categories.some(c => c.toLowerCase() === name.toLowerCase())) {
    alert("Essa categoria já existe.");
    return;
  }
  data.categories.push(name);
  $("#categoryName").value = "";
  save();
}

function editCategory(index) {
  const oldName = data.categories[index];
  if (!oldName) return;
  const name = prompt("Novo nome da categoria:", oldName)?.trim();
  if (!name || name === oldName) return;
  if (name.length > 60 || data.categories.some(c =>
    c.toLowerCase() === name.toLowerCase() && c !== oldName)) {
    alert("Nome inválido ou já utilizado.");
    return;
  }
  data.categories[index] = name;
  data.products.forEach(p => {
    if (p.category === oldName) p.category = name;
  });
  save();
}

function deleteCategory(index) {
  const category = data.categories[index];
  if (!category) return;
  if (data.products.some(p => p.category === category)) {
    alert("Essa categoria possui produtos. Mova ou exclua os produtos antes.");
    return;
  }
  if (!confirm(`Excluir a categoria "${category}"?`)) return;
  data.categories.splice(index, 1);
  save();
}

function renderBanners() {
  $("#bannerList").innerHTML = data.banners.length
    ? data.banners.map((b, i) => {
        const color = /^#[0-9a-f]{6}$/i.test(b.color) ? b.color : "#633253";
        const image = safeImage(b.image);
        const bg = image ? `url("${image}")` : color;
        return `<div class="banner-card">
          <div class="banner-preview" style="${image ? `background-image:${esc(bg)}` : `background-color:${color}`}">🍿</div>
          <div class="banner-info">
            <small>BANNER ${i + 1}</small>
            <h3>${esc(b.title)}</h3>
            <p>${esc(b.subtitle)}</p>
            <div class="row-actions">
              <button class="small-btn" data-edit-banner="${esc(b.id)}">Editar</button>
              <button class="small-btn" data-up-banner="${esc(b.id)}" ${i===0?"disabled":""}>↑ Subir</button>
              <button class="small-btn" data-down-banner="${esc(b.id)}" ${i===data.banners.length-1?"disabled":""}>↓ Descer</button>
              <button class="small-btn delete" data-delete-banner="${esc(b.id)}">Excluir</button>
            </div>
          </div>
        </div>`;
      }).join("")
    : `<div class="panel"><p>Nenhum banner cadastrado.</p></div>`;
}

function openBanner(id = "") {
  $("#bannerForm").reset();
  const banner = data.banners.find(b => b.id === id);
  $("#bannerModalTitle").textContent = banner ? "Editar banner" : "Novo banner";
  $("#bannerId").value = banner?.id || "";
  $("#bannerTitle").value = banner?.title || "";
  $("#bannerSubtitle").value = banner?.subtitle || "";
  $("#bannerTag").value = banner?.tag || "";
  $("#bannerColor").value = banner?.color || "#633253";
  $("#bannerImage").value = banner?.image?.startsWith("https://") ? banner.image : "";
  $("#bannerImageFile").value = "";
  selectedBannerImage = banner?.image || "";
  previewImage("#bannerImagePreview", selectedBannerImage, "🖼️");
  openModal("bannerModal");
}

async function saveBanner(event) {
  event.preventDefault();
  try {
    const file = $("#bannerImageFile").files[0];
    const image = file
      ? await readImage(file)
      : ($("#bannerImage").value.trim() || selectedBannerImage);

    const banner = {
      id:$("#bannerId").value || uid(),

title: $("#bannerTitle").value.trim(),

      subtitle:$("#bannerSubtitle").value.trim(),
      tag:$("#bannerTag").value.trim(),
      color:$("#bannerColor").value,
      image:safeImage(image)
    };


    const index = data.banners.findIndex(b => b.id === banner.id);
    if (index >= 0) data.banners[index] = banner;
    else data.banners.push(banner);

    if (save()) closeModal("bannerModal");
  } catch (error) {
    alert(error.message);
  }
}

function deleteBanner(id) {
  if (!confirm("Excluir este banner?")) return;
  data.banners = data.banners.filter(b => b.id !== id);
  save();
}

function moveBanner(id, direction) {
  const index = data.banners.findIndex(b => b.id === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= data.banners.length) return;
  [data.banners[index], data.banners[target]] =
    [data.banners[target], data.banners[index]];
  save();
}

function renderSettings() {
  $("#storeName").value = data.store.name;
  $("#storeWhatsapp").value = data.store.whatsapp;
  $("#storeDescription").value = data.store.description;

  const logo = data.store.logo || "logo.png";

  $("#adminLogoPreview").src = logo;
  $("#adminHeaderLogo").src = logo;

  $("#storeLogoUrl").value =
    logo.startsWith("https://") ? logo : "";
}

function saveSettings(event) {
  event.preventDefault();

  const phone = $("#storeWhatsapp").value.replace(/\D/g, "");

  if (phone && (phone.length < 10 || phone.length > 13)) {
    alert("Informe o WhatsApp com DDI e DDD.");
    return;
  }

  data.store = {
    name: $("#storeName").value.trim(),
    logo: data.store.logo || "logo.png",
    whatsapp: phone,
    description: $("#storeDescription").value.trim()
  };

  save();
}

function exportData() {
  const content = JSON.stringify(data, null, 2);
  const blob = new Blob([content], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "cardapio.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast("✓ Arquivo JSON exportado!");
}

async function importData() {
  const file = $("#importFile").files[0];
  if (!file) {
    alert("Selecione um arquivo JSON.");
    return;
  }
  if (file.size > 8 * 1024 * 1024) {
    alert("O arquivo é muito grande.");
    return;
  }
  try {
    const parsed = JSON.parse(await file.text());
    const imported = validateData(parsed);
    if (!confirm("Substituir o cardápio atual pelo arquivo importado?")) return;
    data = imported;
    $("#importFile").value = "";
    save();
    toast("✓ Cardápio importado!");
  } catch (error) {
    alert("Não foi possível importar: " + error.message);
  }
}

function resetData() {
  if (!confirm("Restaurar os dados iniciais? Todas as alterações locais serão substituídas.")) return;
  data = structuredClone(INITIAL_DATA);
  save();
}

function bindEvents() {
  document.querySelectorAll(".nav-btn").forEach(btn =>
    btn.addEventListener("click", () => showPage(btn.dataset.page))
  );

  $("#newProductBtn").addEventListener("click", () => openProduct());
  $("#productForm").addEventListener("submit", saveProduct);
  $("#adminSearch").addEventListener("input", renderProducts);
  $("#adminCategoryFilter").addEventListener("change", renderProducts);

  $("#adminProductList").addEventListener("click", event => {
    const btn = event.target.closest("button");
    if (!btn) return;
    if (btn.dataset.editProduct) openProduct(btn.dataset.editProduct);
    if (btn.dataset.toggleProduct) toggleProduct(btn.dataset.toggleProduct);
    if (btn.dataset.deleteProduct) deleteProduct(btn.dataset.deleteProduct);
  });

  $("#categoryForm").addEventListener("submit", addCategory);
  $("#categoryList").addEventListener("click", event => {
    const btn = event.target.closest("button");
    if (!btn) return;
    if (btn.dataset.editCategory !== undefined) editCategory(Number(btn.dataset.editCategory));
    if (btn.dataset.deleteCategory !== undefined) deleteCategory(Number(btn.dataset.deleteCategory));
  });

  $("#newBannerBtn").addEventListener("click", () => openBanner());
  $("#bannerForm").addEventListener("submit", saveBanner);
  $("#bannerList").addEventListener("click", event => {
    const btn = event.target.closest("button");
    if (!btn) return;
    if (btn.dataset.editBanner) openBanner(btn.dataset.editBanner);
    if (btn.dataset.deleteBanner) deleteBanner(btn.dataset.deleteBanner);
    if (btn.dataset.upBanner) moveBanner(btn.dataset.upBanner, -1);
    if (btn.dataset.downBanner) moveBanner(btn.dataset.downBanner, 1);
  });

  $("#settingsForm").addEventListener("submit", saveSettings);
  $("#exportBtn").addEventListener("click", exportData);
  $("#backupExportBtn").addEventListener("click", exportData);
  $("#importBtn").addEventListener("click", importData);
  $("#resetBtn").addEventListener("click", resetData);

  $("#previewBtn").addEventListener("click", () => {
    try {
      localStorage.setItem("pipoca_catalog_preview", JSON.stringify(data));
    } catch {}
    window.open("index.html", "_blank");
  });

  $("#productImage").addEventListener("input", event => {
    selectedProductImage = safeImage(event.target.value);
    previewImage("#productImagePreview", selectedProductImage, "🍿");
  });
  $("#bannerImage").addEventListener("input", event => {
    selectedBannerImage = safeImage(event.target.value);
    previewImage("#bannerImagePreview", selectedBannerImage, "🖼️");
  });

  $("#productImageFile").addEventListener("change", async event => {
    try {
      if (event.target.files[0]) {
        selectedProductImage = await readImage(event.target.files[0]);
        previewImage("#productImagePreview", selectedProductImage, "🍿");
      }
    } catch (error) {
      alert(error.message);
      event.target.value = "";
    }
  });

  $("#bannerImageFile").addEventListener("change", async event => {
    try {
      if (event.target.files[0]) {
        selectedBannerImage = await readImage(event.target.files[0]);
        previewImage("#bannerImagePreview", selectedBannerImage, "🖼️");
      }
    } catch (error) {
      alert(error.message);
      event.target.value = "";
    }
  });

  document.querySelectorAll("[data-close]").forEach(btn =>
    btn.addEventListener("click", () => closeModal(btn.dataset.close))
  );

  document.querySelectorAll(".modal-backdrop").forEach(modal =>
    modal.addEventListener("click", event => {
      if (event.target === modal) closeModal(modal.id);
    })
  );

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      document.querySelectorAll(".modal-backdrop.open").forEach(modal =>
        closeModal(modal.id)
      );
    }
  });
}

initializeData();

/* =====================================
   GERENCIAMENTO DA LOGO
===================================== */

function updateStoreLogo(image) {
  const valid = safeImage(image);

  if (!valid && image !== "logo.png") {
    alert("Informe uma URL HTTPS válida ou envie uma imagem.");
    return;
  }

  data.store.logo = valid || "logo.png";
  save();
}

$("#storeLogoUrl").addEventListener("change", function () {
  const url = this.value.trim();
  if (url) updateStoreLogo(url);
});

$("#storeLogoFile").addEventListener("change", async function () {
  const file = this.files[0];
  if (!file) return;

  try {
    const image = await readImage(file);
    updateStoreLogo(image);
    this.value = "";
  } catch (error) {
    alert(error.message);
    this.value = "";
  }
});

$("#resetLogoBtn").addEventListener("click", function () {
  updateStoreLogo("logo.png");
});
