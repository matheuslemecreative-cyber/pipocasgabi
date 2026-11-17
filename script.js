
"use strict";


/* TAMANHOS E PREÇOS DAS PIPOCAS */

const POPCORN_SIZES = {
  M: { grams: 250, price: 20 },
  G: { grams: 500, price: 30 }
};

/* Tamanho selecionado em cada produto */
const selectedSizes = {};

function getSelectedSize(productId) {
  return selectedSizes[productId] || "M";
}

function isSingle(product) { return product?.saleType === "single"; }
function getProductInfo(product, size) {
  return isSingle(product) ? {grams: 50, price: Number(product.price)} : POPCORN_SIZES[size];
}
function getSizeLabel(product, size) {
  return isSingle(product) ? "Sachê 50g" : `Tamanho ${size} (${POPCORN_SIZES[size].grams}g)`;
}

function getCartKey(productId, size, flavors = [], topping = "") {
  return `${productId}::${size}::${encodeURIComponent(JSON.stringify([flavors, topping]))}`;
}
const DEFAULT_FLAVORS = ["Ninho com Nutella", "Ninho", "Nutella", "Ovomaltine", "Nesquik", "Laka Cookies", "Kinder Bueno"];
const DEFAULT_TOPPINGS = ["Amendoim", "Chocoball", "Granulado", "M&M"];
function choices() {
  return {
    flavors: Array.isArray(data.options?.flavors) ? data.options.flavors : DEFAULT_FLAVORS,
    toppings: Array.isArray(data.options?.toppings) ? data.options.toppings : DEFAULT_TOPPINGS
  };
}
function cartDetails(key) {
  const [id, size, encoded] = key.split("::");
  let flavors = [], topping = "";
  try {
    const parsed = JSON.parse(decodeURIComponent(encoded || ""));
    if (Array.isArray(parsed) && Array.isArray(parsed[0])) {
      flavors = parsed[0].filter(x => typeof x === "string").slice(0, 3);
      topping = typeof parsed[1] === "string" ? parsed[1] : "";
    }
  } catch {}
  return {id, size, flavors, topping};
}
function detailsLabel(detail) {
  return [detail.flavors.length ? `Sabores: ${detail.flavors.join(", ")}` : "", `Complemento: ${detail.topping || "Sem complemento"}`].filter(Boolean).join(" • ");
}


const API_URL = "https://api-cardapio-gourmet.contato-lemeservices.workers.dev/cardapio";

const DEFAULT_DATA = {
store: {
  name: "Bih Bih Pipocas Gourmet",
  logo: "logo.png",
  whatsapp: "",
  description: "Mais que pipoca, é um momento especial!"
},
  categories: ["Clássicas", "Chocolatudas", "Especiais", "Premium"],
  banners: [
    {
      id: "b1",
      title: "A felicidade tem sabor de pipoca!",
      subtitle: "Descubra sabores irresistíveis preparados com muito carinho.",
      tag: "BEM-VINDO À DOCE ESTOURO",
      color: "#633253",
      image: ""
    },
    {
      id: "b2",
      title: "Uma explosão de chocolate",
      subtitle: "Brigadeiro, Nutella e muitas outras delícias.",
      tag: "PARA QUEM AMA CHOCOLATE",
      color: "#79435a",
      image: ""
    },
    {
      id: "b3",
      title: "Seu momento merece mais doçura",
      subtitle: "Escolha suas pipocas favoritas e peça pelo WhatsApp.",
      tag: "FEITAS COM AMOR",
      color: "#a95776",
      image: ""
    }
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

const $ = selector => document.querySelector(selector);
const money = value => Number(value).toLocaleString("pt-BR", {
  style: "currency", currency: "BRL"
});

const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, char => ({
  "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
}[char]));

function safeImage(value) {
  const url = String(value || "").trim();
  if (/^https:\/\//i.test(url) || /^data:image\/(png|jpeg|webp|gif);base64,/i.test(url)) return url;
  return "";
}

let data = structuredClone(DEFAULT_DATA);
let cart = {};
if (localStorage.getItem("pipoca_cart_version") !== "2") {
  localStorage.removeItem("pipoca_cart");
  localStorage.setItem("pipoca_cart_version", "2");
}
let selectedCategory = "Todos";
let slideIndex = 0;
let slideTimer;
let toastTimer;

try {
  const savedCart = JSON.parse(localStorage.getItem("pipoca_cart") || "{}");
  if (savedCart && typeof savedCart === "object" && !Array.isArray(savedCart)) cart = savedCart;
} catch {}

async function loadData() {
  try {
    const response = await fetch(API_URL, {cache:"no-store"});
    if (!response.ok) throw new Error("API retornou " + response.status);
    const imported = await response.json();
    if (!imported.store || !Array.isArray(imported.products) ||
        !Array.isArray(imported.categories) || !Array.isArray(imported.banners)) {
      throw new Error("Cardápio inválido");
    }
    data = imported;
  } catch (error) {
    console.warn("Falha ao consultar API, tentando JSON publicado:", error);
    try {
      const response = await fetch("cardapio.json", {cache:"no-store"});
      if (response.ok) {
        const imported = await response.json();
        if (imported.store && Array.isArray(imported.products) &&
            Array.isArray(imported.categories) && Array.isArray(imported.banners)) data = imported;
      }
    } catch {}
  }
  localStorage.removeItem("pipoca_catalog_preview");
  initialize();
}

function initialize() {
  const logo = safeImage(data.store.logo) ||
    (/^[\w./-]+\.(png|jpg|jpeg|webp)$/i.test(data.store.logo || "")
      ? data.store.logo
      : "logo.png");

  $("#storeLogo").src = logo;
  $("#footerLogo").src = logo;

  $("#storeLogo").alt = data.store.name;
  $("#footerLogo").alt = data.store.name;


document.title = data.store.name + " | Pipocas Gourmet";
$("#year").textContent = new Date().getFullYear();

  renderBanners();
  renderFilters();
  renderProducts();
  renderCart();
  renderLocation();
  bindEvents();
}

function renderBanners() {
  const banners = (data.banners || []).filter(
    banner => safeImage(banner.image) ||
      /^[\w./-]+\.(png|jpg|jpeg|webp)$/i.test(banner.image || "")
  );

  const slidesContainer = $("#slides");
  const dotsContainer = $("#slideDots");

  if (!banners.length) {
    slidesContainer.innerHTML = `
      <div class="slide active"
        style="background:linear-gradient(135deg,#29160f,#79562a)">
      </div>
    `;
    dotsContainer.innerHTML = "";
    clearInterval(slideTimer);
    return;
  }

  slidesContainer.innerHTML = banners.map((banner, index) => {
    const image = safeImage(banner.image) || banner.image;

    return `
      <div class="slide ${index === 0 ? "active" : ""}">
        <img
          src="${escapeHTML(image)}"
          alt="Banner promocional ${index + 1}"
          style="width:100%;height:100%;object-fit:cover;display:block"
        >
      </div>
    `;
  }).join("");

  dotsContainer.innerHTML = banners.map((_, index) => `
    <button
      data-slide="${index}"
      class="${index === 0 ? "active" : ""}"
      aria-label="Ir para banner ${index + 1}">
    </button>
  `).join("");

  slideIndex = 0;
  clearInterval(slideTimer);

  if (banners.length > 1) {
    slideTimer = setInterval(() => changeSlide(1), 5000);
  }
}

function changeSlide(direction, direct = false) {
  const slides = document.querySelectorAll(".slide");
  const dots = document.querySelectorAll("#slideDots button");
  if (!slides.length) return;

  slideIndex = direct
    ? direction
    : (slideIndex + direction + slides.length) % slides.length;

  slides.forEach((slide, i) => slide.classList.toggle("active", i === slideIndex));
  dots.forEach((dot, i) => dot.classList.toggle("active", i === slideIndex));
}

function renderFilters() {
  const categories = ["Todos", ...data.categories];

  $("#filters").innerHTML = categories.map(category =>
    `<button class="filter-btn ${category === selectedCategory ? "active" : ""}"
      data-category="${escapeHTML(category)}">${escapeHTML(category)}</button>`
  ).join("");

  $("#menuCategories").innerHTML = data.categories.map(category =>
    `<a class="menu-link category-link" href="#cardapio"
      data-category="${escapeHTML(category)}">🍬 ${escapeHTML(category)}</a>`
  ).join("");
}


function renderProducts() {
  const query = $("#searchInput").value
    .toLocaleLowerCase("pt-BR").trim();

  const sort = $("#sortSelect").value;

  let products = data.products.filter(product =>
    product.active !== false &&
    (selectedCategory === "Todos" ||
      product.category === selectedCategory) &&
    (
      product.name + " " +
      product.description + " " +
      product.category
    ).toLocaleLowerCase("pt-BR").includes(query)
  );

  if (sort === "priceAsc") {
    products.sort((a, b) => a.price - b.price);
  }

  if (sort === "priceDesc") {
    products.sort((a, b) => b.price - a.price);
  }

  if (sort === "name") {
    products.sort((a, b) =>
      a.name.localeCompare(b.name, "pt-BR")
    );
  }

  $("#resultCount").textContent =
    `${products.length} sabores encontrados`;

  $("#emptyResults").classList.toggle(
    "hidden", products.length > 0
  );

  $("#productGrid").innerHTML = products.map(product => {
    const image = safeImage(product.image);
    const selected = isSingle(product) ? "UNICO" : getSelectedSize(product.id);
    const selectedData = getProductInfo(product, selected);

    return `
      <article class="product-card">

        <div class="product-image">
          ${image
            ? `<img src="${escapeHTML(image)}"
                alt="${escapeHTML(product.name)}"
                loading="lazy">`
            : `<span class="product-emoji">🍿</span>`
          }

          ${product.badge
            ? `<span class="product-badge">
                ${escapeHTML(product.badge)}
              </span>`
            : ""
          }
        </div>

        <div class="product-info">

          <span class="product-category">
            ${escapeHTML(product.category)}
          </span>

          <h3>${escapeHTML(product.name)}</h3>

          <p>${escapeHTML(product.description)}</p>

          <div class="product-sizes">
            <span class="size-label">
              ${isSingle(product) ? "Embalagem:" : "Escolha o tamanho:"}
            </span>

            ${isSingle(product) ? `
  <div class="size-options single-size-options">
    <div class="size-option single-size-option active">
      <strong>Único</strong>

      <div class="single-size-details">
        <small>50g</small>
        <span>${money(product.price)}</span>
      </div>
    </div>
  </div>
` : `<div class="size-options">
              ${Object.entries(POPCORN_SIZES)
                .map(([size, info]) => `
                  <button
                    type="button"
                    class="size-option
                      ${selected === size ? "active" : ""}"
                    data-size="${size}"
                    data-product="${escapeHTML(product.id)}"
                    aria-pressed="${selected === size}"
                  >
                    <strong>${size}</strong>
                    <small>${info.grams}g</small>
                    <span>${money(info.price)}</span>
                  </button>
                `).join("")}
            </div>`}
          </div>

          <div class="product-bottom">

            <strong class="product-price"
              id="price-${escapeHTML(product.id)}">
              ${money(selectedData.price)}
            </strong>

            <button class="add-btn"
              data-add="${escapeHTML(product.id)}">
              + Adicionar
            </button>

          </div>
        </div>
      </article>
    `;
  }).join("");
}


function saveCart() {
  try { localStorage.setItem("pipoca_cart", JSON.stringify(cart)); } catch {}
  renderCart();
}


let pendingSelection = null;
function addToCart(id, button) {
  const product = data.products.find(item => item.id === id && item.active !== false);
  if (!product) return;
  const size = isSingle(product) ? "UNICO" : getSelectedSize(id);
  if (!isSingle(product)) {
    pendingSelection = {product, size, button};
    openCustomization();
    return;
  }
  commitCart(product, size, [], "", button);
}
function commitCart(product, size, flavors = [], topping = "", button = null) {
  const key = getCartKey(product.id, size, flavors, topping);
  cart[key] = Math.min(99, (Number(cart[key]) || 0) + 1);
  saveCart();
  $("#cartBtn").classList.remove("bump");
  void $("#cartBtn").offsetWidth;
  $("#cartBtn").classList.add("bump");
  if (button) {
    button.textContent = "✓ Adicionado";
    button.classList.add("added");
    setTimeout(() => {
      if (button.isConnected) { button.textContent = "+ Adicionar"; button.classList.remove("added"); }
    }, 1100);
  }
  const toast = $("#toast");
  toast.querySelector("strong").textContent = `${product.name} — ${isSingle(product) ? "Sachê 50g" : size} adicionado!`;
  toast.querySelector("small").textContent = `${getProductInfo(product, size).grams}g • ${money(getProductInfo(product, size).price)}`;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2500);
}
function closeCustomization() {
  $("#customizeModal").classList.remove("open");
  pendingSelection = null;
  document.body.classList.remove("customizing");
}
function openCustomization() {
  const {product, size} = pendingSelection;
  const {flavors, toppings} = choices();
  $("#customizeTitle").textContent = `${product.name} • Pote ${size}`;
  const flavorArea = $("#customizeFlavors");
  flavorArea.classList.toggle("hidden", size !== "G");
  flavorArea.innerHTML = size === "G" ? `<h3>🍿 Escolha seus sabores</h3><p class="custom-help">Escolha de 1 a 3 sabores.</p><div class="custom-choice-grid">${flavors.map(flavor => `<label class="custom-choice"><input type="checkbox" name="chosenFlavor" value="${escapeHTML(flavor)}"><span>${escapeHTML(flavor)}</span></label>`).join("")}</div><small id="flavorCounter">0 de 3 sabores selecionados</small>` : "";
  $("#customizeToppings").innerHTML = `<label class="custom-choice"><input type="radio" name="chosenTopping" value="" checked><span>Sem complemento</span></label>${toppings.map(topping => `<label class="custom-choice"><input type="radio" name="chosenTopping" value="${escapeHTML(topping)}"><span>${escapeHTML(topping)}</span></label>`).join("")}`;
  $("#customizeError").textContent = "";
  $("#customizeModal").classList.add("open");
  document.body.classList.add("customizing");
}
function confirmCustomization() {
  if (!pendingSelection) return;
  const {product, size, button} = pendingSelection;
  const flavors = [...document.querySelectorAll('input[name="chosenFlavor"]:checked')].map(el => el.value);
  if (size === "G" && (flavors.length < 1 || flavors.length > 3)) {
    $("#customizeError").textContent = "Selecione entre 1 e 3 sabores.";
    return;
  }
  const topping = document.querySelector('input[name="chosenTopping"]:checked')?.value || "";
  closeCustomization();
  commitCart(product, size, flavors, topping, button);
}


function updateQuantity(key, delta) {
  const quantity = Math.max(
    0,
    Math.min(99, (Number(cart[key]) || 0) + delta)
  );

  if (quantity === 0) {
    delete cart[key];
  } else {
    cart[key] = quantity;
  }

  saveCart();
}


function renderCart() {
  const entries = Object.entries(cart).filter(
    ([key, quantity]) => {
      const {id, size} = cartDetails(key);

      return (
        data.products.some(
          p => p.id === id && p.active !== false
        ) &&
        (isSingle(data.products.find(p => p.id === id)) ? size === "UNICO" : !!POPCORN_SIZES[size]) &&
        Number.isFinite(Number(quantity)) &&
        Number(quantity) > 0
      );
    }
  );

  const count = entries.reduce(
    (sum, [, quantity]) => sum + Number(quantity), 0
  );

  const total = entries.reduce(
    (sum, [key, quantity]) => {
      const {id, size} = cartDetails(key);
      const product = data.products.find(p => p.id === id);
      return sum +
        getProductInfo(product, size).price * Number(quantity);
    }, 0
  );

  $("#cartCount").textContent = count;
  $("#floatingCount").textContent = count;
  $("#cartTotal").textContent = money(total);
  $("#checkoutBtn").disabled = count === 0;

  if (!entries.length) {
    $("#cartItems").innerHTML = `
      <div class="cart-empty">
        <span>🛒</span>
        <h3>Seu carrinho está vazio</h3>
        <p>Adicione algumas delícias para começar!</p>
      </div>
    `;
    return;
  }

  $("#cartItems").innerHTML = entries.map(
    ([key, quantity]) => {
      const {id, size} = cartDetails(key);
      const product = data.products.find(p => p.id === id);
      const info = getProductInfo(product, size);
      const image = safeImage(product.image);

      return `
        <div class="cart-item">

          ${image
            ? `<img class="cart-thumb"
                src="${escapeHTML(image)}" alt="">`
            : `<div class="cart-thumb cart-thumb-placeholder">
                🍿
              </div>`
          }

          <div class="cart-item-info">

            <h4>${escapeHTML(product.name)}</h4>

            <span class="cart-size">
              ${getSizeLabel(product, size)}
            </span>
            ${size !== "UNICO" ? `<small class="cart-custom-details">${escapeHTML(detailsLabel(cartDetails(key)))}</small>` : ""}

            <strong>
              ${money(info.price * Number(quantity))}
            </strong>

            <div class="cart-controls">

              <button data-minus="${escapeHTML(key)}"
                aria-label="Diminuir quantidade">
                −
              </button>

              <span>${Number(quantity)}</span>

              <button data-plus="${escapeHTML(key)}"
                aria-label="Aumentar quantidade">
                +
              </button>

              <button class="remove-item"
                data-remove="${escapeHTML(key)}"
                aria-label="Remover produto">
                ✕
              </button>

            </div>
          </div>
        </div>
      `;
    }
  ).join("");
}


function setDrawer(type, open) {
  const menu = type === "menu";
  const drawer = $(menu ? "#sideMenu" : "#cartDrawer");
  const overlay = $(menu ? "#menuOverlay" : "#cartOverlay");
  if (open) {
    setDrawer(menu ? "cart" : "menu", false);
  }
  drawer.classList.toggle("open", open);
  overlay.classList.toggle("open", open);
  $("#menuBtn").setAttribute("aria-expanded", String(menu && open));
  document.body.classList.toggle("no-scroll",
    $("#sideMenu").classList.contains("open") ||
    $("#cartDrawer").classList.contains("open"));
}


function checkout() {
  const phone = String(
    data.store.whatsapp || ""
  ).replace(/\D/g, "");

  if (phone.length < 10 || phone.length > 13) {
    alert("O WhatsApp da loja ainda não foi configurado.");
    return;
  }

  const lines = [];
  let total = 0;

  for (const [key, quantity] of Object.entries(cart)) {
    const {id, size} = cartDetails(key);

    const product = data.products.find(
      p => p.id === id && p.active !== false
    );

    const info = product ? getProductInfo(product, size) : null;

    if (!product || !info || !Number.isFinite(info.price) || Number(quantity) <= 0) {
      continue;
    }

    const subtotal = info.price * Number(quantity);
    total += subtotal;

    lines.push(
      `• ${quantity}x ${product.name}\n` +
      `   ${getSizeLabel(product, size)}\n` +
      (size !== "UNICO" ? `   ${detailsLabel(cartDetails(key))}\n` : "") +
      `   ${money(subtotal)}`
    );
  }

  if (!lines.length) return;

  const message = [
    `🍿 *NOVO PEDIDO — ${data.store.name}*`,
    "",
    "Olá! Gostaria de fazer o seguinte pedido:",
    "",
    ...lines,
    "",
    `*Subtotal: ${money(total)}*`,
    "*Taxa de entrega: a calcular*",
    "",
    "Poderia me informar o valor da entrega?",
    "Vou enviar meu nome, endereço completo, número e bairro.",
    "",
    "Obrigado(a)! 💜"
  ].join("\n");

  window.open(
    `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
    "_blank",
    "noopener,noreferrer"
  );
}



let locationTimer;
function locationInfo() {
  const item = data.location || {};
  if (item.active === false || !item.date || !item.place) return null;
  const date = new Date(`${item.date}T12:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  const day = date.toLocaleDateString("pt-BR", {weekday:"long", day:"2-digit", month:"2-digit"});
  return {day, place:String(item.place), details:String(item.details || "")};
}
function renderLocation() {
  const info = locationInfo();
  ["#locationBubble", "#menuLocationBtn"].forEach(selector => $(selector).classList.toggle("hidden", !info));
  if (!info) { $("#locationNotice").classList.remove("open"); return; }
  $("#locationDate").textContent = info.day;
  $("#locationPlace").textContent = info.place;
  $("#locationDetails").textContent = info.details;
  $("#menuLocationText").textContent = `${info.day} • ${info.place}`;
  showLocationNotice(false);
}
function showLocationNotice(persistent = false) {
  if (!locationInfo()) return;
  clearTimeout(locationTimer);
  $("#locationNotice").classList.add("open");
  $("#locationBubble").classList.add("hidden");
  if (!persistent) locationTimer = setTimeout(hideLocationNotice, 7000);
}
function hideLocationNotice() {
  clearTimeout(locationTimer);
  $("#locationNotice").classList.remove("open");
  if (locationInfo()) $("#locationBubble").classList.remove("hidden");
}

function bindEvents() {
  $("#menuBtn").addEventListener("click", () => setDrawer("menu", true));
  $("#closeMenu").addEventListener("click", () => setDrawer("menu", false));
  $("#menuOverlay").addEventListener("click", () => setDrawer("menu", false));
  $("#cartBtn").addEventListener("click", () => setDrawer("cart", true));
  $("#floatingCart").addEventListener("click", () => setDrawer("cart", true));
  $("#closeCart").addEventListener("click", () => setDrawer("cart", false));
  $("#cartOverlay").addEventListener("click", () => setDrawer("cart", false));
  $("#continueBtn").addEventListener("click", () => setDrawer("cart", false));
  $("#checkoutBtn").addEventListener("click", checkout);

  $("#searchInput").addEventListener("input", renderProducts);
  $("#sortSelect").addEventListener("change", renderProducts);

  $("#prevSlide").addEventListener("click", () => changeSlide(-1));
  $("#nextSlide").addEventListener("click", () => changeSlide(1));
  $("#slideDots").addEventListener("click", event => {
    const button = event.target.closest("[data-slide]");
    if (button) changeSlide(Number(button.dataset.slide), true);
  });

  $("#filters").addEventListener("click", event => {
    const button = event.target.closest("[data-category]");
    if (!button) return;
    selectedCategory = button.dataset.category;
    renderFilters();
    renderProducts();
  });

  $("#sideMenu").addEventListener("click", event => {
    const link = event.target.closest("a");
    if (!link) return;
    if (link.dataset.category) {
      selectedCategory = link.dataset.category;
      renderFilters();
      renderProducts();
    }
    setDrawer("menu", false);
  });

$("#productGrid").addEventListener("click", event => {

  /* Selecionar tamanho */
  const sizeButton = event.target.closest("[data-size]");

  if (sizeButton) {
    const id = sizeButton.dataset.product;
    const size = sizeButton.dataset.size;

    selectedSizes[id] = size;

    const card = sizeButton.closest(".product-card");

    card.querySelectorAll(".size-option").forEach(btn => {
      const active = btn.dataset.size === size;

      btn.classList.toggle("active", active);
      btn.setAttribute("aria-pressed", String(active));
    });

    card.querySelector(".product-price").textContent =
      money(POPCORN_SIZES[size].price);

    return;
  }

  /* Adicionar produto ao carrinho */
  const addButton = event.target.closest("[data-add]");

  if (addButton) {
    addToCart(addButton.dataset.add, addButton);
  }
});

  $("#cartItems").addEventListener("click", event => {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.dataset.plus) updateQuantity(button.dataset.plus, 1);
    if (button.dataset.minus) updateQuantity(button.dataset.minus, -1);
    if (button.dataset.remove) {
      delete cart[button.dataset.remove];
      saveCart();
    }
  });

  $("#customizeClose").addEventListener("click", closeCustomization);
  $("#customizeCancel").addEventListener("click", closeCustomization);
  $("#customizeConfirm").addEventListener("click", confirmCustomization);
  $("#customizeModal").addEventListener("click", event => { if (event.target.id === "customizeModal") closeCustomization(); });
  $("#customizeFlavors").addEventListener("change", event => {
    if (event.target.name !== "chosenFlavor") return;
    const selected = [...document.querySelectorAll('input[name="chosenFlavor"]:checked')];
    if (selected.length > 3) { event.target.checked = false; $("#customizeError").textContent = "O máximo é 3 sabores."; }
    else $("#customizeError").textContent = "";
    $("#flavorCounter").textContent = `${document.querySelectorAll('input[name="chosenFlavor"]:checked').length} de 3 sabores selecionados`;
  });
  $("#locationBubble").addEventListener("click", () => showLocationNotice(true));
  $("#locationNoticeClose").addEventListener("click", hideLocationNotice);
  $("#menuLocationBtn").addEventListener("click", () => { setDrawer("menu", false); showLocationNotice(true); });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      closeCustomization();
      setDrawer("menu", false);
      setDrawer("cart", false);
    }
  });
}

loadData();


document.addEventListener("DOMContentLoaded", () => {
  if (window.lucide) {
    lucide.createIcons();
  }
});