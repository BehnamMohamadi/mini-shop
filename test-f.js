// shop.js - Complete file with basket status handling
import {
  getProducts,
  groupProducts,
  basketService,
  authService,
  imageService,
} from "./shop/shop-services.js";

console.log("Shop.js with basket status support");

// Global state
let currentBasket = {};
let groupedProducts = {};
let allProducts = [];
let currentBasketStatus = "open"; // Track current basket status

// FUNCTIONS WITH STATUS SUPPORT
window.addToCart = async function (productId) {
  console.log("ADD TO CART:", productId);

  // Check if basket is open
  if (currentBasketStatus !== "open") {
    basketService.showNotification(
      "نمی‌توان محصول به سبد اضافه کرد. سبد در حالت فعال نیست",
      "warning"
    );
    return;
  }

  try {
    currentBasket = await basketService.addToBasket(productId, 1);
    console.log("Cart updated:", currentBasket);

    updateProductDisplay(productId);
    updateCartBadge();

    basketService.showNotification("محصول اضافه شد", "success");
  } catch (error) {
    console.error("Error adding to cart:", error);
    showErrorOnProductCard(productId, "موجودی این محصول در انبار کافی نیست");
    basketService.showNotification("موجودی کافی نیست", "error");
  }
};

window.changeQuantity = async function (productId, newQuantity) {
  console.log("CHANGE QUANTITY:", productId, "to", newQuantity);

  // Check if basket is open
  if (currentBasketStatus !== "open") {
    basketService.showNotification(
      "نمی‌توان تعداد محصولات را تغییر داد. سبد در حالت فعال نیست",
      "warning"
    );
    return;
  }

  if (newQuantity < 0) {
    newQuantity = 0;
  }

  try {
    currentBasket = await basketService.updateQuantity(productId, newQuantity);
    console.log("Cart updated:", currentBasket);

    updateProductDisplay(productId);
    updateCartBadge();

    if (isCartOpen()) {
      renderCartModal();
    }

    if (newQuantity === 0) {
      basketService.showNotification("محصول از سبد حذف شد", "info");
    }
  } catch (error) {
    console.error("Error changing quantity:", error);
    showErrorOnProductCard(productId, "تعداد درخواستی بیش از موجودی انبار است");
    basketService.showNotification("موجودی کافی نیست", "error");
    await loadBasket();
  }
};

window.removeFromCart = async function (productId) {
  console.log("REMOVE FROM CART:", productId);

  // Check if basket is open
  if (currentBasketStatus !== "open") {
    basketService.showNotification(
      "نمی‌توان محصول از سبد حذف کرد. سبد در حالت فعال نیست",
      "warning"
    );
    return;
  }

  try {
    currentBasket = await basketService.removeFromBasket(productId);
    console.log("Cart updated:", currentBasket);

    updateProductDisplay(productId);
    updateCartBadge();

    if (isCartOpen()) {
      renderCartModal();
    }

    basketService.showNotification("محصول از سبد حذف شد", "success");
  } catch (error) {
    console.error("Error removing from cart:", error);
    basketService.showNotification("خطا در حذف محصول", "error");
  }
};

window.clearBasket = async function () {
  // Check if basket is open
  if (currentBasketStatus !== "open") {
    basketService.showNotification(
      "نمی‌توان سبد را پاک کرد. سبد در حالت فعال نیست",
      "warning"
    );
    return;
  }

  if (!confirm("پاک کردن همه محصولات؟")) return;

  try {
    currentBasket = await basketService.clearBasket();
    updateAllProducts();
    updateCartBadge();

    if (isCartOpen()) {
      renderCartModal();
    }

    basketService.showNotification("سبد پاک شد", "success");
  } catch (error) {
    console.error("Error clearing basket:", error);
    basketService.showNotification("خطا در پاک کردن سبد", "error");
  }
};

// NEW: Payment flow functions
window.proceedToPayment = async function () {
  const itemCount = basketService.getBasketItemCount(currentBasket);
  if (itemCount === 0) {
    basketService.showNotification("سبد خالی است", "warning");
    return;
  }

  if (currentBasketStatus !== "open") {
    basketService.showNotification("سبد در وضعیت مناسب برای پرداخت نیست", "warning");
    return;
  }

  try {
    // Update basket status to pending
    currentBasket = await basketService.updateBasketStatus("pending");
    currentBasketStatus = "pending";

    // Update UI to reflect status change
    updateBasketStatusUI();

    basketService.showNotification("در حال انتقال به صفحه پرداخت...", "info");

    // Simulate redirect to payment page (replace with actual payment page URL)
    setTimeout(() => {
      basketService.showNotification("شبیه‌سازی: انتقال به صفحه پرداخت", "info");
    }, 1000);
  } catch (error) {
    console.error("Error proceeding to payment:", error);
    basketService.showNotification("خطا در انتقال به پرداخت", "error");
  }
};

// NEW: Complete payment (call this after successful payment)
window.completePayment = async function () {
  try {
    currentBasket = await basketService.updateBasketStatus("finished");
    currentBasketStatus = "finished";

    basketService.showNotification("پرداخت موفقیت آمیز بود", "success");

    // Create new basket for future purchases by reloading
    setTimeout(async () => {
      await loadBasket();
      basketService.showNotification("سبد جدید آماده خرید است", "info");
    }, 2000);
  } catch (error) {
    console.error("Error completing payment:", error);
    basketService.showNotification("خطا در تکمیل پرداخت", "error");
  }
};

// NEW: Cancel payment (if payment fails)
window.cancelPayment = async function () {
  try {
    currentBasket = await basketService.updateBasketStatus("open");
    currentBasketStatus = "open";

    // Update UI to reflect status change
    updateBasketStatusUI();

    basketService.showNotification("پرداخت لغو شد، سبد دوباره فعال است", "info");
  } catch (error) {
    console.error("Error cancelling payment:", error);
    basketService.showNotification("خطا در لغو پرداخت", "error");
  }
};

// NEW: Update UI based on basket status
function updateBasketStatusUI() {
  const statusText = basketService.getStatusText(currentBasketStatus);

  // Update any status indicators in the UI
  const statusElements = document.querySelectorAll(".basket-status");
  statusElements.forEach((element) => {
    element.textContent = statusText;
  });

  // Disable/enable controls based on status
  const controls = document.querySelectorAll(".buy-btn, .quantity-btn");
  controls.forEach((control) => {
    if (currentBasketStatus !== "open") {
      control.disabled = true;
      control.style.opacity = "0.5";
      control.style.cursor = "not-allowed";
    } else {
      control.disabled = false;
      control.style.opacity = "1";
      control.style.cursor = "pointer";
    }
  });
}

window.viewProductDetails = function (productId) {
  window.location.href = `/product/${productId}`;
};

// SHOW ERROR ON PRODUCT CARD
function showErrorOnProductCard(productId, errorMessage) {
  const productCards = document.querySelectorAll(`[data-product-id='${productId}']`);

  productCards.forEach((card) => {
    const existingError = card.querySelector(".product-error");
    if (existingError) {
      existingError.remove();
    }

    const errorElement = document.createElement("div");
    errorElement.className = "product-error";
    errorElement.textContent = errorMessage;

    const productInfo = card.querySelector(".product-info");
    if (productInfo) {
      productInfo.appendChild(errorElement);
    }

    setTimeout(() => {
      if (errorElement.parentNode) {
        errorElement.remove();
      }
    }, 5000);
  });
}

// Helper functions
function updateProductDisplay(productId) {
  const quantity = basketService.getProductQuantity(productId, currentBasket);
  const productCards = document.querySelectorAll(`[data-product-id='${productId}']`);

  console.log(
    `Updating ${productCards.length} cards for product ${productId} with quantity ${quantity}`
  );

  productCards.forEach((card, index) => {
    const actionsContainer = card.querySelector(".product-actions");
    if (!actionsContainer) {
      console.warn(`No actions container found for card ${index}`);
      return;
    }

    const existingError = card.querySelector(".product-error");
    if (existingError) {
      existingError.remove();
    }

    const isDisabled = currentBasketStatus !== "open";
    const disabledStyle = isDisabled
      ? ' disabled style="opacity: 0.5; cursor: not-allowed;"'
      : "";

    if (quantity > 0) {
      actionsContainer.innerHTML = `
        <div class="quantity-controls">
          <button onclick="changeQuantity('${productId}', ${
        quantity - 1
      })" class="quantity-btn"${disabledStyle}>-</button>
          <span class="quantity-display">${quantity}</span>
          <button onclick="changeQuantity('${productId}', ${
        quantity + 1
      })" class="quantity-btn"${disabledStyle}>+</button>
        </div>
      `;
      console.log(
        `Updated card ${index} with quantity controls for quantity ${quantity}`
      );
    } else {
      actionsContainer.innerHTML = `
        <button onclick="addToCart('${productId}')" class="buy-btn"${disabledStyle}>خرید</button>
      `;
      console.log(`Updated card ${index} with buy button`);
    }
  });
}

function updateAllProducts() {
  const allProductElements = document.querySelectorAll("[data-product-id]");
  const uniqueProductIds = new Set();

  allProductElements.forEach((element) => {
    uniqueProductIds.add(element.dataset.productId);
  });

  uniqueProductIds.forEach((productId) => {
    updateProductDisplay(productId);
  });
}

function updateCartBadge() {
  const cartIcon = document.getElementById("cart-icon");
  if (!cartIcon) return;

  const existingBadge = cartIcon.querySelector(".cart-badge");
  if (existingBadge) existingBadge.remove();

  const itemCount = basketService.getBasketItemCount(currentBasket);

  if (itemCount > 0) {
    const badge = document.createElement("span");
    badge.className = "cart-badge";
    badge.textContent = itemCount > 99 ? "99+" : itemCount;
    cartIcon.appendChild(badge);
  }
}

function isCartOpen() {
  const cartModal = document.getElementById("cart-modal");
  return cartModal && !cartModal.classList.contains("hidden");
}

async function renderCartModal() {
  const cartItems = document.getElementById("cart-items");
  const cartTotal = document.getElementById("cart-total");

  if (!cartItems || !cartTotal) return;

  const basketInfo = basketService.formatBasketForDisplay(currentBasket);

  if (basketInfo.isEmpty) {
    cartItems.innerHTML = `
      <div class="empty-cart">
        <div class="empty-cart-icon">🛒</div>
        <div class="empty-cart-text">سبد خالی است</div>
      </div>
    `;
    cartTotal.innerHTML = `
      <div class="cart-total-section">
        <div class="total-amount">۰ تومان</div>
      </div>
    `;
    return;
  }

  try {
    const totalAmount = await basketService.getBasketTotal(currentBasket);
    const statusText = basketService.getStatusText(currentBasketStatus);
    const isDisabled = currentBasketStatus !== "open";

    cartItems.innerHTML = "";

    basketInfo.items.forEach(({ productId, quantity }) => {
      const product = allProducts.find((p) => p._id === productId);
      if (!product) return;

      const itemTotal = product.price * quantity;
      const imagePath = imageService.getImagePath(product.thumbnail, "product");
      const disabledStyle = isDisabled
        ? ' disabled style="opacity: 0.5; cursor: not-allowed;"'
        : "";

      const cartItem = document.createElement("div");
      cartItem.className = "cart-item";
      cartItem.innerHTML = `
        <img src="${imagePath}" alt="${product.name}" 
             onerror="handleImageError(this, 'product')" class="cart-item-image" />
        <div class="cart-item-details">
          <div class="cart-item-name">${product.name}</div>
          <div class="cart-item-price">${product.price.toLocaleString()} تومان</div>
        </div>
        <div class="cart-item-controls">
          <div class="quantity-controls">
            <button onclick="changeQuantity('${productId}', ${
        quantity - 1
      })" class="quantity-btn"${disabledStyle}>-</button>
            <span class="quantity-display">${quantity}</span>
            <button onclick="changeQuantity('${productId}', ${
        quantity + 1
      })" class="quantity-btn"${disabledStyle}>+</button>
          </div>
          <div class="cart-item-total">${itemTotal.toLocaleString()} تومان</div>
        </div>
      `;
      cartItems.appendChild(cartItem);
    });

    // Show different buttons based on status
    let actionButtons = "";
    if (currentBasketStatus === "open") {
      actionButtons = `
        <button onclick="proceedToPayment()" class="checkout-btn">پرداخت</button>
        <button onclick="clearBasket()" class="clear-btn">پاک کردن</button>
      `;
    } else if (currentBasketStatus === "pending") {
      actionButtons = `
        <button onclick="completePayment()" class="checkout-btn">تکمیل پرداخت</button>
        <button onclick="cancelPayment()" class="clear-btn">لغو پرداخت</button>
      `;
    } else if (currentBasketStatus === "finished") {
      actionButtons = `
        <div class="finished-message">سفارش تکمیل شده است</div>
      `;
    }

    cartTotal.innerHTML = `
      <div class="cart-total-section">
        <div class="cart-status">
          <span>وضعیت: <strong>${statusText}</strong></span>
        </div>
        <div class="cart-summary">
          <div class="cart-summary-row">
            <span>تعداد:</span>
            <span>${basketInfo.itemCount} عدد</span>
          </div>
          <div class="cart-summary-row total">
            <span>جمع:</span>
            <span class="total-amount">${totalAmount.toLocaleString()} تومان</span>
          </div>
        </div>
        <div class="cart-actions">
          ${actionButtons}
        </div>
      </div>
    `;
  } catch (error) {
    console.error("Error rendering cart:", error);
  }
}

function renderProducts(groupedData) {
  const productContainer = document.getElementById("product-container");
  if (!productContainer) return;

  productContainer.innerHTML = "";

  Object.keys(groupedData).forEach((categoryName) => {
    const categoryTitle = document.createElement("h2");
    categoryTitle.className = "category-title";
    categoryTitle.textContent = categoryName;
    productContainer.appendChild(categoryTitle);

    const subCategories = groupedData[categoryName].subCategories;

    Object.keys(subCategories).forEach((subCategoryName) => {
      const subCategoryTitle = document.createElement("h3");
      subCategoryTitle.className = "subcategory-title";
      subCategoryTitle.textContent = subCategoryName;
      productContainer.appendChild(subCategoryTitle);

      const productGrid = document.createElement("div");
      productGrid.className = "product-grid";

      subCategories[subCategoryName].products.forEach((product) => {
        const quantity = basketService.getProductQuantity(product._id, currentBasket);
        const imagePath = imageService.getImagePath(product.thumbnail, "product");
        const isDisabled = currentBasketStatus !== "open";
        const disabledStyle = isDisabled
          ? ' disabled style="opacity: 0.5; cursor: not-allowed;"'
          : "";

        const productCard = document.createElement("div");
        productCard.className = "product-card";
        productCard.setAttribute("data-product-id", product._id);

        productCard.innerHTML = `
          <div class="product-image-container">
            <img src="${imagePath}" alt="${product.name}" 
                 onerror="handleImageError(this, 'product')" class="product-image" />
          </div>
          
          <div class="product-info">
            <div class="product-name">${product.name}</div>
            <div class="product-brand">برند: ${product.brand}</div>
            <div class="product-price">${product.price.toLocaleString()} تومان</div>
            
            <div class="product-actions">
              ${
                quantity > 0
                  ? `
                <div class="quantity-controls">
                  <button onclick="changeQuantity('${product._id}', ${
                      quantity - 1
                    })" class="quantity-btn"${disabledStyle}>-</button>
                  <span class="quantity-display">${quantity}</span>
                  <button onclick="changeQuantity('${product._id}', ${
                      quantity + 1
                    })" class="quantity-btn"${disabledStyle}>+</button>
                </div>
              `
                  : `
                <button onclick="addToCart('${product._id}')" class="buy-btn"${disabledStyle}>خرید</button>
              `
              }
            </div>
            
            <button onclick="viewProductDetails('${
              product._id
            }')" class="details-btn">مشاهده جزئیات</button>
          </div>
        `;

        productGrid.appendChild(productCard);
      });

      productContainer.appendChild(productGrid);
    });
  });
}

async function loadBasket() {
  try {
    console.log("Loading basket...");

    // Get basket summary first to check status
    const summary = await basketService.getBasketSummary();
    currentBasketStatus = summary.basketStatus || "open";

    currentBasket = await basketService.getBasket();
    console.log("Basket loaded:", currentBasket, "Status:", currentBasketStatus);

    updateCartBadge();
    updateAllProducts();
    updateBasketStatusUI();
  } catch (error) {
    console.error("Error loading basket:", error);
    currentBasket = {};
    currentBasketStatus = "open";
  }
}

function setupCartModal() {
  const cartIcon = document.getElementById("cart-icon");
  const cartModal = document.getElementById("cart-modal");
  const closeCart = document.getElementById("close-cart");

  if (!cartIcon || !cartModal || !closeCart) return;

  cartIcon.addEventListener("click", () => {
    if (isCartOpen()) {
      cartModal.classList.add("hidden");
    } else {
      cartModal.classList.remove("hidden");
      renderCartModal();
    }
  });

  closeCart.addEventListener("click", () => {
    cartModal.classList.add("hidden");
  });

  cartModal.addEventListener("click", (e) => {
    if (e.target === cartModal) {
      cartModal.classList.add("hidden");
    }
  });
}

function setupCategoryNavigation() {
  const categoryIcon = document.querySelector(".bx-grid-alt");
  if (!categoryIcon) return;

  categoryIcon.addEventListener("click", async () => {
    const productContainer = document.getElementById("product-container");
    if (!productContainer) return;

    productContainer.innerHTML = "<div class='loading'>در حال بارگذاری...</div>";

    try {
      groupedProducts = groupProducts(allProducts);

      productContainer.innerHTML = "";

      Object.keys(groupedProducts).forEach((category) => {
        const imagePath = imageService.getImagePath(
          groupedProducts[category].icon,
          "category"
        );

        const categoryCard = document.createElement("div");
        categoryCard.className = "category-card";
        categoryCard.innerHTML = `
          <img src="${imagePath}" alt="${category}" 
               onerror="handleImageError(this, 'category')" class="category-image" />
          <div class="category-name">${category}</div>
        `;

        categoryCard.addEventListener("click", () => showSubCategories(category));
        productContainer.appendChild(categoryCard);
      });
    } catch (error) {
      console.error("Error loading categories:", error);
      basketService.showNotification("خطا در بارگذاری دسته‌بندی‌ها", "error");
    }
  });
}

function showSubCategories(category) {
  const productContainer = document.getElementById("product-container");
  if (!productContainer) return;

  productContainer.innerHTML = "";

  const subCategories = groupedProducts[category]?.subCategories;
  if (!subCategories) return;

  Object.keys(subCategories).forEach((sub) => {
    const imagePath = imageService.getImagePath(subCategories[sub].icon, "subcategory");

    const subCard = document.createElement("div");
    subCard.className = "subcategory-card";
    subCard.innerHTML = `
      <img src="${imagePath}" alt="${sub}" 
           onerror="handleImageError(this, 'subcategory')" class="subcategory-image" />
      <div class="subcategory-name">${sub}</div>
    `;

    subCard.addEventListener("click", () =>
      showCategoryProducts(subCategories[sub].products)
    );
    productContainer.appendChild(subCard);
  });

  const backBtn = document.createElement("button");
  backBtn.textContent = "⬅ بازگشت به دسته‌بندی‌ها";
  backBtn.className = "back-btn";
  backBtn.addEventListener("click", () => {
    document.querySelector(".bx-grid-alt").click();
  });
  productContainer.appendChild(backBtn);
}

function showCategoryProducts(products) {
  const productContainer = document.getElementById("product-container");
  if (!productContainer) return;

  productContainer.innerHTML = "";

  const productGrid = document.createElement("div");
  productGrid.className = "product-grid";

  products.forEach((product) => {
    const quantity = basketService.getProductQuantity(product._id, currentBasket);
    const imagePath = imageService.getImagePath(product.thumbnail, "product");
    const isDisabled = currentBasketStatus !== "open";
    const disabledStyle = isDisabled
      ? ' disabled style="opacity: 0.5; cursor: not-allowed;"'
      : "";

    const productCard = document.createElement("div");
    productCard.className = "product-card";
    productCard.setAttribute("data-product-id", product._id);

    productCard.innerHTML = `
      <div class="product-image-container">
        <img src="${imagePath}" alt="${product.name}" 
             onerror="handleImageError(this, 'product')" class="product-image" />
      </div>
      
      <div class="product-info">
        <div class="product-name">${product.name}</div>
        <div class="product-brand">برند: ${product.brand}</div>
        <div class="product-price">${product.price.toLocaleString()} تومان</div>
        
        <div class="product-actions">
          ${
            quantity > 0
              ? `
            <div class="quantity-controls">
              <button onclick="changeQuantity('${product._id}', ${
                  quantity - 1
                })" class="quantity-btn"${disabledStyle}>-</button>
              <span class="quantity-display">${quantity}</span>
              <button onclick="changeQuantity('${product._id}', ${
                  quantity + 1
                })" class="quantity-btn"${disabledStyle}>+</button>
            </div>
          `
              : `
            <button onclick="addToCart('${product._id}')" class="buy-btn"${disabledStyle}>خرید</button>
          `
          }
        </div>
        
        <button onclick="viewProductDetails('${
          product._id
        }')" class="details-btn">مشاهده جزئیات</button>
      </div>
    `;

    productGrid.appendChild(productCard);
  });

  productContainer.appendChild(productGrid);
}

// Initialize app
document.addEventListener("DOMContentLoaded", async () => {
  console.log("Initializing shop with basket status support...");

  try {
    // Setup UI
    const btn = document.querySelector("#btn");
    const sidebar = document.querySelector(".sidebar");
    const searchBtn = document.querySelector(".bx-search");

    btn?.addEventListener("click", () => sidebar?.classList.toggle("active"));
    searchBtn?.addEventListener("click", () => sidebar?.classList.toggle("active"));

    document.getElementById("log_out-btn")?.addEventListener("click", authService.logOut);
    document.getElementById("user-icon")?.addEventListener("click", () => {
      window.location.href = "/profile";
    });

    setupCartModal();
    setupCategoryNavigation();

    // Check authentication
    const isAuthenticated = await authService.checkAuth();
    if (!isAuthenticated) {
      basketService.showNotification("لطفا ابتدا وارد شوید", "warning");
      setTimeout(() => (window.location.href = "/login"), 2000);
      return;
    }

    // Load products
    console.log("Loading products...");
    allProducts = await getProducts();
    groupedProducts = groupProducts(allProducts);

    // Render products
    renderProducts(groupedProducts);

    // Load basket
    await loadBasket();

    console.log("Shop initialized successfully with basket status support");
    basketService.showNotification("فروشگاه بارگذاری شد", "success");
  } catch (error) {
    console.error("Error initializing shop:", error);
    basketService.showNotification("خطا در بارگذاری فروشگاه", "error");
  }
});

// Test function
window.testButtons = function () {
  console.log("Testing button functions...");
  console.log("addToCart function:", typeof window.addToCart);
  console.log("changeQuantity function:", typeof window.changeQuantity);
  console.log("removeFromCart function:", typeof window.removeFromCart);
  console.log("proceedToPayment function:", typeof window.proceedToPayment);
  console.log("completePayment function:", typeof window.completePayment);
  console.log("cancelPayment function:", typeof window.cancelPayment);
};

document.querySelector("#admin-btn-page").addEventListener("click", (e) => {
  e.preventDefault();

  window.location.href = `/admin-panel`;
});

// shop-services.js - Updated with status handling
console.log("🔧 DEBUG Shop services loaded - Backend integration with basket status");

// API Base URL
const API_BASE = "http://127.0.0.1:8000/api";

// Product Services (unchanged)
export const getProducts = async () => {
  try {
    console.log("🔧 DEBUG: Fetching products from:", `${API_BASE}/products`);
    const response = await fetch(`${API_BASE}/products`);
    console.log("🔧 DEBUG: Products response status:", response.status);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log("🔧 DEBUG: Products data:", data);
    return data.data.products;
  } catch (error) {
    console.error("🔧 DEBUG: Error fetching products:", error);
    throw error;
  }
};

export const getProductById = async (productId) => {
  try {
    console.log("🔧 DEBUG: Fetching product:", productId);
    const response = await fetch(`${API_BASE}/products/${productId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error("🔧 DEBUG: Error fetching product:", error);
    throw error;
  }
};

export const groupProducts = (products) => {
  const result = {};

  for (const product of products) {
    if (!product.category || !product.subCategory) continue;

    const { name: categoryName, icon: categoryIcon = "default-category-icon.jpeg" } =
      product.category;
    const { name: subCategoryName, icon: subCategoryIcon = "default-sub-icon.jpeg" } =
      product.subCategory;

    if (!result[categoryName]) {
      result[categoryName] = { icon: categoryIcon, subCategories: {} };
    }

    if (!result[categoryName].subCategories[subCategoryName]) {
      result[categoryName].subCategories[subCategoryName] = {
        icon: subCategoryIcon,
        products: [],
      };
    }

    result[categoryName].subCategories[subCategoryName].products.push(product);
  }

  return result;
};

// Updated Basket Services with status handling
export const basketService = {
  // Get basket from database
  async getBasket() {
    try {
      console.log("🔧 DEBUG: Getting basket from:", `${API_BASE}/basket`);

      const response = await fetch(`${API_BASE}/basket`, {
        method: "GET",
        credentials: "include",
      });

      console.log("🔧 DEBUG: Basket response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("🔧 DEBUG: Raw basket data from server:", data);

        const basket = data.data.basket;
        if (basket && basket.status !== "open") {
          console.warn("🔧 DEBUG: Basket is not open, status:", basket.status);
          this.showNotification(
            `سبد در حالت ${this.getStatusText(basket.status)} است`,
            "info"
          );
        }

        const transformedBasket = this.transformServerBasket(basket);
        console.log("🔧 DEBUG: Transformed basket:", transformedBasket);

        return transformedBasket;
      } else if (response.status === 401) {
        console.warn("🔧 DEBUG: User not authenticated");
        return {};
      } else {
        console.warn("🔧 DEBUG: Failed to get basket:", response.status);
        return {};
      }
    } catch (error) {
      console.error("🔧 DEBUG: Error getting basket:", error);
      return {};
    }
  },

  // Add to basket in database
  async addToBasket(productId, count = 1) {
    try {
      console.log("🔧 DEBUG: Adding to basket:", { productId, count });

      const response = await fetch(`${API_BASE}/basket`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ productId, count }),
      });

      console.log("🔧 DEBUG: Add to basket response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("🔧 DEBUG: Add to basket success data:", data);
        this.showNotification(data.message || "محصول اضافه شد", "success");
        return this.transformServerBasket(data.data.basket);
      } else {
        const errorText = await response.text();
        console.error("🔧 DEBUG: Add to basket failed:", response.status, errorText);

        try {
          const errorData = JSON.parse(errorText);
          this.showNotification(errorData.message || "خطا در افزودن محصول", "error");
          throw new Error(errorData.message);
        } catch (parseError) {
          this.showNotification("خطا در افزودن محصول", "error");
          throw new Error(`Server error: ${response.status}`);
        }
      }
    } catch (error) {
      console.error("🔧 DEBUG: Error adding to basket:", error);
      this.showNotification("خطا در افزودن محصول", "error");
      throw error;
    }
  },

  // Update count in database
  async updateQuantity(productId, count) {
    try {
      console.log("🔧 DEBUG: Updating count:", { productId, count });

      if (count <= 0) {
        return await this.removeFromBasket(productId);
      }

      const response = await fetch(`${API_BASE}/basket/item/${productId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ count }),
      });

      console.log("🔧 DEBUG: Update count response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("🔧 DEBUG: Update count success:", data);
        this.showNotification(data.message || "تعداد به‌روزرسانی شد", "success");
        return this.transformServerBasket(data.data.basket);
      } else {
        const errorText = await response.text();
        console.error("🔧 DEBUG: Update count failed:", response.status, errorText);

        try {
          const errorData = JSON.parse(errorText);
          this.showNotification(errorData.message || "خطا در به‌روزرسانی", "error");
          throw new Error(errorData.message);
        } catch (parseError) {
          this.showNotification("خطا در به‌روزرسانی تعداد", "error");
          throw new Error(`Server error: ${response.status}`);
        }
      }
    } catch (error) {
      console.error("🔧 DEBUG: Error updating count:", error);
      this.showNotification("خطا در به‌روزرسانی تعداد", "error");
      throw error;
    }
  },

  // Remove from basket in database
  async removeFromBasket(productId) {
    try {
      console.log("🔧 DEBUG: Removing from basket:", productId);

      const response = await fetch(`${API_BASE}/basket/item/${productId}`, {
        method: "DELETE",
        credentials: "include",
      });

      console.log("🔧 DEBUG: Remove from basket response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("🔧 DEBUG: Remove from basket success:", data);
        this.showNotification(data.message || "محصول حذف شد", "success");
        return this.transformServerBasket(data.data.basket);
      } else {
        const errorText = await response.text();
        console.error("🔧 DEBUG: Remove from basket failed:", response.status, errorText);

        try {
          const errorData = JSON.parse(errorText);
          this.showNotification(errorData.message || "خطا در حذف محصول", "error");
          throw new Error(errorData.message);
        } catch (parseError) {
          this.showNotification("خطا در حذف محصول", "error");
          throw new Error(`Server error: ${response.status}`);
        }
      }
    } catch (error) {
      console.error("🔧 DEBUG: Error removing from basket:", error);
      this.showNotification("خطا در حذف محصول", "error");
      throw error;
    }
  },

  // Clear entire basket in database
  async clearBasket() {
    try {
      console.log("🔧 DEBUG: Clearing basket");

      const response = await fetch(`${API_BASE}/basket`, {
        method: "DELETE",
        credentials: "include",
      });

      console.log("🔧 DEBUG: Clear basket response status:", response.status);

      if (response.ok) {
        console.log("🔧 DEBUG: Clear basket success");
        this.showNotification("سبد پاک شد", "success");
        return {};
      } else {
        const errorText = await response.text();
        console.error("🔧 DEBUG: Clear basket failed:", response.status, errorText);

        try {
          const errorData = JSON.parse(errorText);
          this.showNotification(errorData.message || "خطا در پاک کردن سبد", "error");
          throw new Error(errorData.message);
        } catch (parseError) {
          this.showNotification("خطا در پاک کردن سبد", "error");
          throw new Error(`Server error: ${response.status}`);
        }
      }
    } catch (error) {
      console.error("🔧 DEBUG: Error clearing basket:", error);
      this.showNotification("خطا در پاک کردن سبد", "error");
      throw error;
    }
  },

  // NEW: Update basket status
  async updateBasketStatus(status) {
    try {
      console.log("🔧 DEBUG: Updating basket status to:", status);

      const response = await fetch(`${API_BASE}/basket/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ status }),
      });

      console.log("🔧 DEBUG: Update status response:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("🔧 DEBUG: Status update success:", data);
        this.showNotification(data.message || "وضعیت سبد به‌روزرسانی شد", "success");
        return this.transformServerBasket(data.data.basket);
      } else {
        const errorText = await response.text();
        console.error("🔧 DEBUG: Status update failed:", response.status, errorText);

        try {
          const errorData = JSON.parse(errorText);
          this.showNotification(errorData.message || "خطا در به‌روزرسانی وضعیت", "error");
          throw new Error(errorData.message);
        } catch (parseError) {
          this.showNotification("خطا در به‌روزرسانی وضعیت سبد", "error");
          throw new Error(`Server error: ${response.status}`);
        }
      }
    } catch (error) {
      console.error("🔧 DEBUG: Error updating basket status:", error);
      this.showNotification("خطا در به‌روزرسانی وضعیت سبد", "error");
      throw error;
    }
  },

  // Get basket summary from database
  async getBasketSummary() {
    try {
      console.log("🔧 DEBUG: Getting basket summary");

      const response = await fetch(`${API_BASE}/basket/summary`, {
        method: "GET",
        credentials: "include",
      });

      console.log("🔧 DEBUG: Basket summary response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("🔧 DEBUG: Basket summary data:", data);
        return data.data;
      } else {
        console.log("🔧 DEBUG: Basket summary failed, returning defaults");
        return { totalItems: 0, totalPrice: 0, itemCount: 0, basketStatus: null };
      }
    } catch (error) {
      console.error("🔧 DEBUG: Error getting basket summary:", error);
      return { totalItems: 0, totalPrice: 0, itemCount: 0, basketStatus: null };
    }
  },

  // Transform server basket to simple object format for frontend
  transformServerBasket(serverBasket) {
    console.log("🔧 DEBUG: Transforming server basket:", serverBasket);

    const basket = {};
    if (serverBasket && serverBasket.products && Array.isArray(serverBasket.products)) {
      console.log(
        "🔧 DEBUG: Server basket has",
        serverBasket.products.length,
        "products"
      );

      serverBasket.products.forEach((item, index) => {
        console.log(`🔧 DEBUG: Processing product ${index}:`, item);

        if (item.product && item.product._id) {
          basket[item.product._id] = item.count;
          console.log(`🔧 DEBUG: Added to basket - ${item.product._id}: ${item.count}`);
        } else {
          console.warn(`🔧 DEBUG: Invalid product structure at index ${index}:`, item);
        }
      });
    } else {
      console.log("🔧 DEBUG: Server basket is empty or invalid:", serverBasket);
    }

    console.log("🔧 DEBUG: Final transformed basket:", basket);
    return basket;
  },

  // Helper function to get status text in Persian
  getStatusText(status) {
    const statusTexts = {
      open: "فعال",
      pending: "در انتظار پرداخت",
      finished: "تکمیل شده",
    };
    return statusTexts[status] || status;
  },

  // Utility functions
  getBasketItemCount(basket) {
    const count = Object.values(basket).reduce((sum, qty) => sum + qty, 0);
    console.log("🔧 DEBUG: Basket item count:", count);
    return count;
  },

  getProductQuantity(productId, basket) {
    const quantity = basket[productId] || 0;
    console.log(`🔧 DEBUG: Product ${productId} quantity:`, quantity);
    return quantity;
  },

  isProductInBasket(productId, basket) {
    const inBasket = !!(basket[productId] && basket[productId] > 0);
    console.log(`🔧 DEBUG: Product ${productId} in basket:`, inBasket);
    return inBasket;
  },

  formatBasketForDisplay(basket) {
    const itemCount = this.getBasketItemCount(basket);
    const items = Object.entries(basket).map(([productId, count]) => ({
      productId,
      quantity: count,
    }));
    const result = { items, itemCount, isEmpty: itemCount === 0 };
    console.log("🔧 DEBUG: Formatted basket for display:", result);
    return result;
  },

  async getBasketTotal(basket) {
    try {
      const products = await getProducts();
      let total = 0;
      Object.entries(basket).forEach(([productId, count]) => {
        const product = products.find((p) => p._id === productId);
        if (product) total += product.price * count;
      });
      console.log("🔧 DEBUG: Basket total:", total);
      return total;
    } catch {
      console.log("🔧 DEBUG: Error calculating basket total, returning 0");
      return 0;
    }
  },

  showNotification(message, type = "info") {
    console.log(`🔧 DEBUG: Showing notification - ${type}: ${message}`);

    const existingNotifications = document.querySelectorAll(".notification");
    existingNotifications.forEach((notification) => notification.remove());

    const notification = document.createElement("div");
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    Object.assign(notification.style, {
      position: "fixed",
      top: "20px",
      right: "20px",
      padding: "12px 20px",
      borderRadius: "5px",
      color: "white",
      zIndex: "10000",
      transform: "translateX(100%)",
      transition: "transform 0.3s ease",
      fontFamily: "Arial, sans-serif",
      fontSize: "14px",
      maxWidth: "300px",
      wordWrap: "break-word",
    });

    const colors = {
      success: "#4CAF50",
      error: "#f44336",
      warning: "#ff9800",
      info: "#2196F3",
    };
    notification.style.backgroundColor = colors[type] || colors.info;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.transform = "translateX(0)";
    }, 100);

    setTimeout(() => {
      notification.style.transform = "translateX(100%)";
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  },
};

// Authentication Service (unchanged)
export const authService = {
  async checkAuth() {
    try {
      console.log("🔧 DEBUG: Checking authentication");

      const response = await fetch(`${API_BASE}/basket/summary`, {
        method: "GET",
        credentials: "include",
      });

      const isAuth = response.ok;
      console.log("🔧 DEBUG: Authentication status:", isAuth);

      if (!isAuth) {
        const responseText = await response.text();
        console.log("🔧 DEBUG: Auth failed response:", responseText);
      }

      return isAuth;
    } catch (error) {
      console.error("🔧 DEBUG: Auth check error:", error);
      return false;
    }
  },

  async logOut() {
    try {
      console.log("🔧 DEBUG: Logging out");
      await basketService.clearBasket();
    } catch (error) {
      console.warn("🔧 DEBUG: Could not clear basket on logout:", error);
    }

    window.location.href = "/api/auth/logout";
  },
};

// Image handling utilities (unchanged)
export const imageService = {
  getImagePath(imageName, type = "product") {
    const basePaths = {
      product: "/images/models-images/product-images/",
      category: "/images/models-images/category-images/",
      subcategory: "/images/models-images/subCategory-images/",
    };
    return basePaths[type] + imageName;
  },

  handleImageError(img, type = "product") {
    const defaultImages = {
      product: "/images/models-images/product-images/default-thumbnail.jpeg",
      category: "/images/models-images/category-images/default-category-icon.jpeg",
      subcategory: "/images/models-images/subCategory-images/default-sub-icon.jpeg",
    };

    if (img.src !== defaultImages[type]) {
      img.src = defaultImages[type];
    } else {
      img.src =
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23e0e0e0'/%3E%3Ctext x='50' y='50' text-anchor='middle' dy='.3em' fill='%23999' font-family='Arial' font-size='12'%3E📦%3C/text%3E%3C/svg%3E";
    }
  },
};

window.handleImageError = imageService.handleImageError;

export default {
  getProducts,
  getProductById,
  groupProducts,
  basketService,
  authService,
  imageService,
};

//profile.js
const editTableBtn = document.getElementById("edit-table-btn");
editTableBtn.addEventListener("click", renderUpdateUser);

async function renderUpdateUser() {
  try {
    const response = await fetch(`http://127.0.0.1:8000/api/account`);

    if (!response.ok) {
      throw new Error("user api can't reachable:");
    }

    const responseAsJson = await response.json();
    const user = responseAsJson.data.user;
    console.log(Object.keys(user));
    modalBody.innerHTML = Object.keys(user)
      .map((property) => {
        if (property !== "_id" && property !== "profile" && property !== "role") {
          return `
          <div class="row-data">
            <label class="label-edit-form">${property}:</label>
            <input type="text" id="${property}" class="update-inputs" value="${user[property]}" placeholder="${property}" />
          </div>
          `;
        }
      })
      .join("");

    modalFooter.innerHTML = `
      <button class="button" onclick="updateUser()">Save</button>
      <button class="button" onclick="closeModal()">Cancel</button>
    `;

    openModal();
  } catch (error) {
    console.error("error in profile>renderUpdateUser", error);
  }
}

async function updateUser() {
  const updateInputs = Array.from(document.querySelectorAll(".update-inputs"));

  const data = {};
  updateInputs.forEach((input) => {
    data[input.id] = input.value;
  });
  console.log("data", data);

  try {
    const response = await fetch(`http://127.0.0.1:8000/api/account`, {
      method: "PATCH",
      body: JSON.stringify(data),
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    closeModal();

    window.location.reload();
  } catch (error) {
    console.error("error in profile>updateUser", error);
  }
}

async function renderUpdateProfileImage() {
  try {
    const userProfile = document.body.dataset.profile;

    modalBody.innerHTML = `
      <div class="row-data">
        <div class="profile">
          <img id="profile-image" src="/images/profiles/${userProfile}" alt="Profile Image" />
          <input type="file" id="profile-img" />
        </div> 
      </div>
    `;

    modalFooter.innerHTML = `
      <button class="button" onclick="updateImage()">Save</button>
      <button class="button" onclick="closeModal()">Cancel</button>
    `;

    openModal();
  } catch (error) {
    console.error("error in profile>renderUpdateProfileImage", error);
  }
}

async function updateImage() {
  const input = document.getElementById("profile-img");
  const file = input.files[0];

  if (!file) return alert("No file selected!");

  const formData = new FormData();
  formData.append("profile", file);
  console.log(formData);

  const response = await fetch("http://127.0.0.1:8000/api/account/change-profile-image", {
    method: "PATCH",
    body: formData,
    headers: {
      authorization: { token: localStorage.getItem("authToken") },
    },
  });

  const responseAsJSon = await response.json();

  console.log(responseAsJSon);
}

//modal.js
const modalHeader = document.querySelector(".modal-header > h2");
const modalBody = document.querySelector(".modal-body");
const modalFooter = document.querySelector(".modal-footer");
const modal = document.getElementById("modal");
const closeButton = document.getElementsByClassName("close")[0];

function openModal() {
  modal.style.display = "block";
}

function closeModal() {
  resetModal();
  modal.style.display = "none";
}

function resetModal() {
  modalHeader.textContent = "DEFAULT";
  modalBody.innerHTML = "";
  modalFooter.innerHTML = "";
}

closeButton.onclick = closeModal;

window.onclick = function (event) {
  if (event.target == modal) {
    closeModal();
  }
};



// admin-panel.js - Modular Admin Panel Controller
console.log("Admin Panel JS loaded");

// ============= CONFIGURATION =============
const API_CONFIG = {
  BASE_URL: "/api",
  ENDPOINTS: {
    PRODUCTS: "/products",
    BASKETS: "/basket/get-all-baskets",
  },
  PAGINATION: {
    DEFAULT_LIMIT: 10,
    DEFAULT_PAGE: 1,
  },
};

// ============= STATE MANAGEMENT =============
const AdminState = {
  currentTab: "products",
  products: {
    data: [],
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    loading: false,
    searchTerm: "",
    sortBy: "name",
    sortOrder: "asc",
  },
  orders: {
    data: [],
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    loading: false,
    statusFilter: "all",
    sortBy: "createdAt",
    sortOrder: "desc",
  },
  selectedItem: null,
};

// ============= API SERVICE =============
const ApiService = {
  async request(endpoint, options = {}) {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("API Error:", error);
      throw error;
    }
  },

  // Products API
  async getProducts(params = {}) {
    const queryParams = new URLSearchParams({
      page: params.page || AdminState.products.currentPage,
      limit: params.limit || API_CONFIG.PAGINATION.DEFAULT_LIMIT,
      sort: params.sort || AdminState.products.sortBy,
      order: params.order || AdminState.products.sortOrder,
      ...params.filters,
    });

    return this.request(`${API_CONFIG.ENDPOINTS.PRODUCTS}?${queryParams}`);
  },

  async updateProduct(productId, data) {
    return this.request(`${API_CONFIG.ENDPOINTS.PRODUCTS}/${productId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  async deleteProduct(productId) {
    return this.request(`${API_CONFIG.ENDPOINTS.PRODUCTS}/${productId}`, {
      method: "DELETE",
    });
  },

  // Orders API
  async getOrders(params = {}) {
    const queryParams = new URLSearchParams({
      page: params.page || AdminState.orders.currentPage,
      limit: params.limit || API_CONFIG.PAGINATION.DEFAULT_LIMIT,
      sort: params.sort || AdminState.orders.sortBy,
      order: params.order || AdminState.orders.sortOrder,
      ...params.filters,
    });

    return this.request(`${API_CONFIG.ENDPOINTS.BASKETS}?${queryParams}`);
  },
};

// ============= UI COMPONENTS =============
const UIComponents = {
  // Loading component
  loading(message = "در حال بارگذاری...") {
    return `<div class="loading">${message}</div>`;
  },

  // Empty state component
  emptyState(message = "موردی یافت نشد") {
    return `<div class="empty-state">${message}</div>`;
  },

  // Error state component
  errorState(message = "خطا در بارگذاری اطلاعات") {
    return `<div class="error-state">${message}</div>`;
  },

  // Pagination component
  pagination(currentPage, totalPages, onPageChange) {
    let html = '<div class="pagination">';

    // Previous button
    html += `<button class="pagination-btn" ${currentPage === 1 ? "disabled" : ""} 
             onclick="${onPageChange}(${currentPage - 1})">قبلی</button>`;

    // Page numbers
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);

    if (startPage > 1) {
      html += `<button class="pagination-btn" onclick="${onPageChange}(1)">1</button>`;
      if (startPage > 2) {
        html += '<span class="pagination-dots">...</span>';
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      html += `<button class="pagination-btn ${i === currentPage ? "active" : ""}" 
               onclick="${onPageChange}(${i})">${i}</button>`;
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        html += '<span class="pagination-dots">...</span>';
      }
      html += `<button class="pagination-btn" onclick="${onPageChange}(${totalPages})">${totalPages}</button>`;
    }

    // Next button
    html += `<button class="pagination-btn" ${
      currentPage === totalPages ? "disabled" : ""
    } 
             onclick="${onPageChange}(${currentPage + 1})">بعدی</button>`;

    // Page info
    html += `<div class="pagination-info">صفحه ${currentPage} از ${totalPages}</div>`;

    html += "</div>";
    return html;
  },

  // Status badge component
  statusBadge(status) {
    const statusMap = {
      open: { text: "فعال", class: "status-open" },
      pending: { text: "در انتظار", class: "status-pending" },
      finished: { text: "تحویل شده", class: "status-finished" },
    };

    const statusInfo = statusMap[status] || { text: status, class: "status-open" };
    return `<span class="status-badge ${statusInfo.class}">${statusInfo.text}</span>`;
  },
};

// ============= TAB CONTROLLER =============
const TabController = {
  switchTab(tabName) {
    // Update UI
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.classList.remove("active");
    });
    event.target.classList.add("active");

    document.querySelectorAll(".tab-panel").forEach((panel) => {
      panel.classList.remove("active");
    });
    document.getElementById(`${tabName}-panel`).classList.add("active");

    // Update state and load data
    AdminState.currentTab = tabName;
    this.loadTabData(tabName);
  },

  loadTabData(tabName) {
    switch (tabName) {
      case "products":
        ProductsController.loadProducts();
        break;
      case "inventory":
        ProductsController.loadInventory();
        break;
      case "orders":
        OrdersController.loadOrders();
        break;
    }
  },
};

// ============= PRODUCTS CONTROLLER =============
const ProductsController = {
  async loadProducts(page = 1, resetPage = false) {
    if (resetPage) {
      AdminState.products.currentPage = 1;
      page = 1;
    }

    AdminState.products.loading = true;
    const container = document.getElementById("products-table-container");
    container.innerHTML = UIComponents.loading("در حال بارگذاری محصولات...");

    try {
      const response = await ApiService.getProducts({ page });

      AdminState.products.data = response.data.products;
      AdminState.products.currentPage = response.page;
      AdminState.products.totalPages = response.totalPages;
      AdminState.products.totalItems = response.total;

      this.renderProductsTable();
    } catch (error) {
      console.error("Error loading products:", error);
      container.innerHTML = UIComponents.errorState("خطا در بارگذاری محصولات");
    } finally {
      AdminState.products.loading = false;
    }
  },

  renderProductsTable() {
    const container = document.getElementById("products-table-container");
    const products = AdminState.products.data;

    if (!products || products.length === 0) {
      container.innerHTML = UIComponents.emptyState("محصولی یافت نشد");
      return;
    }

    let html = `
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>تصویر</th>
              <th>نام محصول</th>
              <th>برند</th>
              <th>دسته بندی</th>
              <th>قیمت</th>
              <th>موجودی</th>
              <th>عملیات</th>
            </tr>
          </thead>
          <tbody>
    `;

    products.forEach((product) => {
      const categoryName = product.category?.name || "نامشخص";
      const subCategoryName = product.subCategory?.name || "نامشخص";
      const imagePath = `/images/models-images/product-images/${product.thumbnail}`;

      html += `
        <tr>
          <td>
            <img src="${imagePath}" alt="${product.name}" class="product-thumb" 
                 onerror="this.src='/images/models-images/product-images/default-thumbnail.jpeg'">
          </td>
          <td><strong>${product.name}</strong></td>
          <td>${product.brand}</td>
          <td>${categoryName} / ${subCategoryName}</td>
          <td>${product.price.toLocaleString()} تومان</td>
          <td>${product.quantity} عدد</td>
          <td>
            <div class="action-btns">
              <button class="btn btn-edit" onclick="ProductsController.editProduct('${
                product._id
              }')">
                ویرایش
              </button>
              <button class="btn btn-delete" onclick="ProductsController.deleteProduct('${
                product._id
              }')">
                حذف
              </button>
            </div>
          </td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </div>
    `;

    // Add pagination
    html += UIComponents.pagination(
      AdminState.products.currentPage,
      AdminState.products.totalPages,
      "ProductsController.changePage"
    );

    container.innerHTML = html;
  },

  async loadInventory() {
    // Inventory is the same as products but with different display
    await this.loadProducts();
    this.renderInventoryTable();
  },

  renderInventoryTable() {
    const container = document.getElementById("inventory-table-container");
    const products = AdminState.products.data;

    if (!products || products.length === 0) {
      container.innerHTML = UIComponents.emptyState("محصولی یافت نشد");
      return;
    }

    let html = `
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>نام محصول</th>
              <th>برند</th>
              <th>قیمت فعلی</th>
              <th>موجودی فعلی</th>
              <th>عملیات</th>
            </tr>
          </thead>
          <tbody>
    `;

    products.forEach((product) => {
      html += `
        <tr>
          <td><strong>${product.name}</strong></td>
          <td>${product.brand}</td>
          <td>${product.price.toLocaleString()} تومان</td>
          <td>${product.quantity} عدد</td>
          <td>
            <div class="action-btns">
              <button class="btn btn-edit" onclick="ProductsController.editInventory('${
                product._id
              }')">
                ویرایش قیمت و موجودی
              </button>
            </div>
          </td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </div>
    `;

    // Add pagination
    html += UIComponents.pagination(
      AdminState.products.currentPage,
      AdminState.products.totalPages,
      "ProductsController.changePage"
    );

    container.innerHTML = html;
  },

  changePage(page) {
    AdminState.products.currentPage = page;
    if (AdminState.currentTab === "inventory") {
      this.loadInventory();
    } else {
      this.loadProducts(page);
    }
  },

  editProduct(productId) {
    const product = AdminState.products.data.find((p) => p._id === productId);
    if (!product) return;

    AdminState.selectedItem = product;

    // Fill form
    document.getElementById("editProductName").value = product.name || "";
    document.getElementById("editProductBrand").value = product.brand || "";
    document.getElementById("editProductPrice").value = product.price || "";
    document.getElementById("editProductQuantity").value = product.quantity || "";
    document.getElementById("editProductDescription").value = product.description || "";

    ModalController.openModal("editProductModal");
  },

  editInventory(productId) {
    const product = AdminState.products.data.find((p) => p._id === productId);
    if (!product) return;

    AdminState.selectedItem = product;

    // Fill form
    document.getElementById("inventoryProductName").value = product.name || "";
    document.getElementById("inventoryPrice").value = product.price || "";
    document.getElementById("inventoryQuantity").value = product.quantity || "";

    ModalController.openModal("editInventoryModal");
  },

  async updateProduct(formData) {
    if (!AdminState.selectedItem) return;

    try {
      await ApiService.updateProduct(AdminState.selectedItem._id, formData);
      NotificationController.show("محصول با موفقیت به‌روزرسانی شد", "success");
      ModalController.closeModal("editProductModal");
      this.loadProducts();
    } catch (error) {
      NotificationController.show("خطا در به‌روزرسانی محصول", "error");
    }
  },

  async updateInventory(formData) {
    if (!AdminState.selectedItem) return;

    try {
      await ApiService.updateProduct(AdminState.selectedItem._id, formData);
      NotificationController.show("موجودی و قیمت با موفقیت به‌روزرسانی شد", "success");
      ModalController.closeModal("editInventoryModal");
      this.loadInventory();
    } catch (error) {
      NotificationController.show("خطا در به‌روزرسانی موجودی", "error");
    }
  },

  async deleteProduct(productId) {
    if (!confirm("آیا از حذف این محصول اطمینان دارید؟")) return;

    try {
      await ApiService.deleteProduct(productId);
      NotificationController.show("محصول با موفقیت حذف شد", "success");
      this.loadProducts();
    } catch (error) {
      NotificationController.show("خطا در حذف محصول", "error");
    }
  },
};

// ============= ORDERS CONTROLLER =============
const OrdersController = {
  async loadOrders(page = 1, resetPage = false) {
    if (resetPage) {
      AdminState.orders.currentPage = 1;
      page = 1;
    }

    AdminState.orders.loading = true;
    const container = document.getElementById("orders-table-container");
    container.innerHTML = UIComponents.loading("در حال بارگذاری سفارشات...");

    try {
      const filters = {};
      if (AdminState.orders.statusFilter !== "all") {
        filters.status = AdminState.orders.statusFilter;
      }

      const response = await ApiService.getOrders({
        page,
        filters,
        sort: AdminState.orders.sortBy,
        order: AdminState.orders.sortOrder,
      });

      AdminState.orders.data = response.data.baskets || [];
      AdminState.orders.currentPage = response.page;
      AdminState.orders.totalPages = response.totalPages;
      AdminState.orders.totalItems = response.total;

      this.renderOrdersTable();
    } catch (error) {
      console.error("Error loading orders:", error);
      container.innerHTML = UIComponents.errorState("خطا در بارگذاری سفارشات");
    } finally {
      AdminState.orders.loading = false;
    }
  },

  renderOrdersTable() {
    const container = document.getElementById("orders-table-container");
    const orders = AdminState.orders.data;

    if (!orders || orders.length === 0) {
      container.innerHTML = UIComponents.emptyState("سفارشی یافت نشد");
      return;
    }

    let html = `
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>نام کاربر</th>
              <th>تعداد اقلام</th>
              <th>مجموع مبلغ</th>
              <th>وضعیت</th>
              <th onclick="OrdersController.sortByDate()" style="cursor: pointer;">
                تاریخ ایجاد ${AdminState.orders.sortOrder === "asc" ? "↑" : "↓"}
              </th>
              <th>عملیات</th>
            </tr>
          </thead>
          <tbody>
    `;

    orders.forEach((order) => {
      const userName = order.user
        ? `${order.user.firstname} ${order.user.lastname}`
        : "کاربر نامشخص";
      const orderDate = new Date(order.createdAt).toLocaleDateString("fa-IR");
      const orderTime = new Date(order.createdAt).toLocaleTimeString("fa-IR", {
        hour: "2-digit",
        minute: "2-digit",
      });

      html += `
        <tr>
          <td><strong>${userName}</strong></td>
          <td>${order.totalItems} عدد</td>
          <td>${order.totalPrice.toLocaleString()} تومان</td>
          <td>${UIComponents.statusBadge(order.status)}</td>
          <td>${orderDate}<br><small>${orderTime}</small></td>
          <td>
            <div class="action-btns">
              <button class="btn btn-view" onclick="OrdersController.viewOrder('${
                order._id
              }')">
                بررسی جزئیات
              </button>
            </div>
          </td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </div>
    `;

    // Add pagination
    html += UIComponents.pagination(
      AdminState.orders.currentPage,
      AdminState.orders.totalPages,
      "OrdersController.changePage"
    );

    container.innerHTML = html;
  },

  changePage(page) {
    AdminState.orders.currentPage = page;
    this.loadOrders(page);
  },

  filterOrders(status) {
    // Update filter buttons
    document.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.classList.remove("active");
    });
    event.target.classList.add("active");

    AdminState.orders.statusFilter = status;
    this.loadOrders(1, true);
  },

  sortByDate() {
    AdminState.orders.sortOrder = AdminState.orders.sortOrder === "asc" ? "desc" : "asc";
    this.loadOrders();
  },

  async viewOrder(orderId) {
    const order = AdminState.orders.data.find((o) => o._id === orderId);
    if (!order) return;

    AdminState.selectedItem = order;

    let itemsHtml = "";
    if (order.products && order.products.length > 0) {
      order.products.forEach((item) => {
        const productName = item.product?.name || "محصول نامشخص";
        const productPrice = item.product?.price || 0;
        const itemTotal = productPrice * item.count;

        itemsHtml += `
          <tr>
            <td>${productName}</td>
            <td>${item.count}</td>
            <td>${productPrice.toLocaleString()}</td>
            <td>${itemTotal.toLocaleString()}</td>
          </tr>
        `;
      });
    }

    const userName = order.user
      ? `${order.user.firstname} ${order.user.lastname}`
      : "کاربر نامشخص";
    const orderDate = new Date(order.createdAt).toLocaleDateString("fa-IR");
    const orderTime = new Date(order.createdAt).toLocaleTimeString("fa-IR");

    const content = `
      <div class="form-group">
        <label class="form-label">نام مشتری:</label>
        <input type="text" class="form-input" value="${userName}" readonly>
      </div>
      <div class="form-group">
        <label class="form-label">تاریخ سفارش:</label>
        <input type="text" class="form-input" value="${orderDate} - ${orderTime}" readonly>
      </div>
      <div class="form-group">
        <label class="form-label">وضعیت:</label>
        <div style="padding: 12px;">${UIComponents.statusBadge(order.status)}</div>
      </div>
      <div class="form-group">
        <label class="form-label">تعداد کل اقلام:</label>
        <input type="text" class="form-input" value="${order.totalItems} عدد" readonly>
      </div>
      <div class="form-group">
        <label class="form-label">جزئیات سفارش:</label>
        <table class="data-table" style="margin-top: 10px;">
          <thead>
            <tr>
              <th>نام محصول</th>
              <th>تعداد</th>
              <th>قیمت واحد</th>
              <th>جمع</th>
            </tr>
          </thead>
          <tbody>
            ${
              itemsHtml ||
              '<tr><td colspan="4" style="text-align: center;">اطلاعات محصولات موجود نیست</td></tr>'
            }
          </tbody>
        </table>
      </div>
      <div class="form-group">
        <label class="form-label">مجموع کل:</label>
        <input type="text" class="form-input" value="${order.totalPrice.toLocaleString()} تومان" readonly>
      </div>
    `;

    document.getElementById("orderDetailsContent").innerHTML = content;
    ModalController.openModal("orderDetailsModal");
  },
};

// ============= MODAL CONTROLLER =============
const ModalController = {
  openModal(modalId) {
    document.getElementById(modalId).style.display = "block";
  },

  closeModal(modalId) {
    document.getElementById(modalId).style.display = "none";
    AdminState.selectedItem = null;
  },

  setupEventListeners() {
    // Close modal when clicking outside
    window.onclick = function (event) {
      if (event.target.classList.contains("modal")) {
        event.target.style.display = "none";
        AdminState.selectedItem = null;
      }
    };

    // Setup form submissions
    document.getElementById("editProductForm").onsubmit = function (e) {
      e.preventDefault();
      const formData = {
        name: document.getElementById("editProductName").value,
        brand: document.getElementById("editProductBrand").value,
        price: parseFloat(document.getElementById("editProductPrice").value),
        quantity: parseInt(document.getElementById("editProductQuantity").value),
        description: document.getElementById("editProductDescription").value,
      };
      ProductsController.updateProduct(formData);
    };

    document.getElementById("editInventoryForm").onsubmit = function (e) {
      e.preventDefault();
      const formData = {
        price: parseFloat(document.getElementById("inventoryPrice").value),
        quantity: parseInt(document.getElementById("inventoryQuantity").value),
      };
      ProductsController.updateInventory(formData);
    };
  },
};

// ============= NOTIFICATION CONTROLLER =============
const NotificationController = {
  show(message, type = "info") {
    // Remove existing notifications
    const existing = document.querySelectorAll(".admin-notification");
    existing.forEach((notification) => notification.remove());

    // Create notification element
    const notification = document.createElement("div");
    notification.className = `admin-notification admin-notification-${type}`;
    notification.textContent = message;

    // Style the notification
    Object.assign(notification.style, {
      position: "fixed",
      top: "20px",
      left: "50%",
      transform: "translateX(-50%)",
      padding: "15px 25px",
      borderRadius: "8px",
      color: "white",
      zIndex: "10000",
      fontWeight: "600",
      fontSize: "14px",
      maxWidth: "400px",
      textAlign: "center",
      boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
      opacity: "0",
      transition: "all 0.3s ease",
    });

    // Set background color based on type
    const colors = {
      success: "#4CAF50",
      error: "#f44336",
      warning: "#ff9800",
      info: "#2196F3",
    };
    notification.style.backgroundColor = colors[type] || colors.info;

    // Add to DOM and animate
    document.body.appendChild(notification);
    setTimeout(() => {
      notification.style.opacity = "1";
      notification.style.transform = "translateX(-50%) translateY(0)";
    }, 100);

    // Auto remove
    setTimeout(() => {
      notification.style.opacity = "0";
      notification.style.transform = "translateX(-50%) translateY(-20px)";
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  },
};

// ============= MAIN APPLICATION CONTROLLER =============
const AdminApp = {
  init() {
    console.log("Initializing Admin Panel...");

    // Setup modal event listeners
    ModalController.setupEventListeners();

    // Load default tab
    TabController.loadTabData("products");

    console.log("Admin Panel initialized successfully");
  },
};

// ============= GLOBAL FUNCTIONS (for onclick handlers) =============
window.TabController = TabController;
window.ProductsController = ProductsController;
window.OrdersController = OrdersController;
window.ModalController = ModalController;

// Global function wrappers
window.switchTab = (tabName) => TabController.switchTab(tabName);
window.filterOrders = (status) => OrdersController.filterOrders(status);
window.openModal = (modalId) => ModalController.openModal(modalId);
window.closeModal = (modalId) => ModalController.closeModal(modalId);

// ============= INITIALIZE ON DOM LOAD =============
document.addEventListener("DOMContentLoaded", AdminApp.init);

/* admin-panel.css */
@import url("https://fonts.googleapis.com/css2?family=Vazirmatn:wght@100;200;300;400;500;600;700;800;900&display=swap");

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  font-family: "Vazirmatn", Arial, sans-serif;
}

body {
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  direction: rtl;
  min-height: 100vh;
}

/* ============= MAIN LAYOUT ============= */
.admin-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}

.admin-header {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 15px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 8px 32px rgba(31, 38, 135, 0.37);
  border: 1px solid rgba(255, 255, 255, 0.18);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.admin-title {
  color: #2c3e50;
  font-size: 24px;
  font-weight: 700;
}

.back-to-shop {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 25px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 8px;
}

.back-to-shop:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
}

/* ============= TABS ============= */
.admin-tabs {
  display: flex;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 15px;
  padding: 5px;
  margin-bottom: 20px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

.tab-btn {
  flex: 1;
  padding: 15px 20px;
  border: none;
  background: transparent;
  color: #666;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  border-radius: 12px;
  transition: all 0.3s ease;
}

.tab-btn.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

.tab-content {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 15px;
  padding: 25px;
  box-shadow: 0 8px 32px rgba(31, 38, 135, 0.37);
  border: 1px solid rgba(255, 255, 255, 0.18);
  min-height: 500px;
}

.tab-panel {
  display: none;
}

.tab-panel.active {
  display: block;
}

/* ============= TABLE STYLES ============= */
.table-container {
  position: relative;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
  background: white;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

.data-table th,
.data-table td {
  padding: 15px;
  text-align: right;
  border-bottom: 1px solid #eee;
}

.data-table th {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-weight: 600;
  position: sticky;
  top: 0;
  z-index: 10;
}

.data-table tr:hover {
  background: #f8f9ff;
}

.product-thumb {
  width: 50px;
  height: 50px;
  object-fit: cover;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* ============= BUTTONS ============= */
.action-btns {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.btn {
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 11px;
  font-weight: 600;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.btn-edit {
  background: #4CAF50;
  color: white;
}

.btn-edit:hover {
  background: #45a049;
  transform: translateY(-2px);
}

.btn-delete {
  background: #f44336;
  color: white;
}

.btn-delete:hover {
  background: #da190b;
  transform: translateY(-2px);
}

.btn-view {
  background: #2196F3;
  color: white;
}

.btn-view:hover {
  background: #0b7dda;
  transform: translateY(-2px);
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 12px 25px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
}

.btn-secondary {
  background: #6c757d;
  color: white;
  padding: 12px 25px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-secondary:hover {
  background: #545b62;
  transform: translateY(-2px);
}

/* ============= FILTERS ============= */
.filter-section {
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 15px;
}

.filter-btns {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.filter-btn {
  padding: 8px 16px;
  border: 2px solid #667eea;
  background: transparent;
  color: #667eea;
  border-radius: 20px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s ease;
  font-size: 12px;
}

.filter-btn.active {
  background: #667eea;
  color: white;
}

.filter-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
}

/* ============= PAGINATION ============= */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  margin-top: 20px;
  padding: 20px 0;
}

.pagination-info {
  background: rgba(102, 126, 234, 0.1);
  padding: 8px 15px;
  border-radius: 20px;
  font-size: 12px;
  color: #667eea;
  font-weight: 600;
}

.pagination-btn {
  padding: 8px 12px;
  border: 1px solid #ddd;
  background: white;
  color: #666;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 12px;
  min-width: 35px;
  text-align: center;
}

.pagination-btn:hover {
  background: #f0f0f0;
  transform: translateY(-1px);
}

.pagination-btn.active {
  background: #667eea;
  color: white;
  border-color: #667eea;
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

/* ============= MODALS ============= */
.modal {
  display: none;
  position: fixed;
  z-index: 1000;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  overflow: auto;
  background-color: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(5px);
}

.modal-content {
  background: white;
  margin: 5% auto;
  padding: 30px;
  border: none;
  border-radius: 15px;
  width: 90%;
  max-width: 600px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  max-height: 80vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 2px solid #eee;
}

.modal-title {
  font-size: 20px;
  font-weight: 700;
  color: #2c3e50;
}

.close {
  color: #aaa;
  font-size: 28px;
  font-weight: bold;
  cursor: pointer;
  line-height: 1;
  transition: color 0.3s ease;
}

.close:hover {
  color: #000;
}

/* ============= FORMS ============= */
.form-group {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #2c3e50;
}

.form-input,
.form-select {
  width: 100%;
  padding: 12px 15px;
  border: 2px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.3s ease;
}

.form-input:focus,
.form-select:focus {
  border-color: #667eea;
  outline: none;
}

.form-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 30px;
  flex-wrap: wrap;
}

/* ============= STATUS BADGES ============= */
.status-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
}

.status-finished {
  background: #d4edda;
  color: #155724;
}

.status-pending {
  background: #fff3cd;
  color: #856404;
}

.status-open {
  background: #cce5ff;
  color: #004085;
}

/* ============= LOADING AND STATES ============= */
.loading {
  text-align: center;
  padding: 50px;
  font-size: 16px;
  color: #666;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
}

.loading::after {
  content: "";
  display: block;
  width: 40px;
  height: 40px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.empty-state {
  text-align: center;
  padding: 50px;
  color: #666;
}

.error-state {
  text-align: center;
  padding: 50px;
  color: #f44336;
  background: #fff5f5;
  border-radius: 10px;
  margin: 20px 0;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

/* ============= SEARCH ============= */
.search-box {
  display: flex;
  align-items: center;
  gap: 10px;
}

.search-input {
  padding: 8px 15px;
  border: 2px solid #ddd;
  border-radius: 20px;
  font-size: 14px;
  min-width: 200px;
  transition: border-color 0.3s ease;
}

.search-input:focus {
  border-color: #667eea;
  outline: none;
}

.search-btn {
  padding: 8px 15px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 15px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.search-btn:hover {
  background: #5a6fd8;
  transform: translateY(-2px);
}

/* ============= RESPONSIVE DESIGN ============= */
@media (max-width: 768px) {
  .admin-container {
    padding: 10px;
  }

  .admin-header {
    flex-direction: column;
    gap: 15px;
    text-align: center;
  }

  .admin-tabs {
    flex-direction: column;
  }

  .tab-btn {
    margin-bottom: 5px;
  }

  .filter-section {
    flex-direction: column;
    align-items: stretch;
  }

  .data-table {
    font-size: 12px;
  }

  .data-table th,
  .data-table td {
    padding: 8px;
  }

  .modal-content {
    width: 95%;
    margin: 10% auto;
    padding: 20px;
  }

  .form-actions {
    justify-content: center;
  }

  .pagination {
    flex-wrap: wrap;
  }
}

<!-- shop.ejs -->
<!DOCTYPE html>
<html lang="fa">

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>فروشگاه فلان</title>
  <link href="https://unpkg.com/boxicons@2.0.9/css/boxicons.min.css" rel="stylesheet" />
  <link rel="stylesheet" href="/stylesheet/shop.css" />
</head>

<body>
  <!-- Header -->
  <header>
    <div class="right-side-header">
      <h1>فروشگاه فلان</h1>
    </div>
    <div class="left-side-header">
      <nav>
        <% if (user && user.role==='admin' ) { %>
          <a id="admin-btn-page" href="/admin">مدیریت</a>
          <% } %>
      </nav>

      <!-- Cart Modal -->
      <div id="cart-modal" class="cart-modal hidden">
        <div class="cart-header">
          <h3>سبد خرید</h3>
          <span id="close-cart">✖</span>
        </div>
        <div id="cart-items"></div>
        <div id="cart-total"></div>
      </div>

      <!-- Cart Icon -->
      <div class="cart-wrapper">
        <div class="cart-icon" id="cart-icon">🛒</div>
      </div>
    </div>
  </header>

  <!-- Main Content -->
  <main class="container">
    <div id="product-container"></div>
  </main>

  <!-- Sidebar -->
  <div class="sidebar">
    <div class="logo_content">
      <div class="logo">
        <i class="bx bx-store"></i>
        <div class="logo_name">فروشگاه</div>
      </div>
      <i class="bx bx-menu" id="btn"></i>
    </div>

    <ul class="nav_list">
      <li>
        <i class="bx bx-search"></i>
        <input placeholder="جستجو..." />
        <span class="tooltip">جستجو</span>
      </li>

      <li>
        <a href="#" class="user-profile-link">
          <i class="bx bx-user" id="user-icon"></i>
          <span class="links_name">کاربر</span>
        </a>
        <span class="tooltip">کاربر</span>
      </li>

      <li>
        <a href="#">
          <i class="bx bx-grid-alt"></i>
          <span class="links_name">دسته‌بندی</span>
        </a>
        <span class="tooltip">دسته‌بندی</span>
      </li>

      <li>
        <a href="#">
          <i class="bx bx-cart-alt"></i>
          <span class="links_name">سفارشات</span>
        </a>
        <span class="tooltip">سفارشات</span>
      </li>

      <li>
        <a href="#">
          <i class="bx bx-heart"></i>
          <span class="links_name">علاقه‌مندی‌ها</span>
        </a>
        <span class="tooltip">علاقه‌مندی‌ها</span>
      </li>

      <li>
        <a href="#">
          <i class="bx bx-pie-chart-alt-2"></i>
          <span class="links_name">آمار</span>
        </a>
        <span class="tooltip">آمار</span>
      </li>

      <li>
        <a href="#">
          <i class="bx bx-cog"></i>
          <span class="links_name">تنظیمات</span>
        </a>
        <span class="tooltip">تنظیمات</span>
      </li>
    </ul>

    <div class="log_out-bx">
      <div class="log_out">
        <ul>
          <li>
            <a href="#">
              <i class="bx bx-log-out" id="log_out-btn"></i>
              <span class="links_name">خروج</span>
            </a>
            <span class="tooltip">خروج</span>
          </li>
        </ul>
      </div>
    </div>
  </div>

  <!-- Scripts -->
  <script type="module" src="/javascript/shop.js"></script>
</body>

</html>

<!-- views/admin-panel.ejs -->
<!DOCTYPE html>
<html lang="fa" dir="rtl">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>پنل مدیریت فروشگاه</title>
    <link href="https://unpkg.com/boxicons@2.0.9/css/boxicons.min.css" rel="stylesheet" />
    <link rel="stylesheet" href="/stylesheet/admin-panel.css">
</head>

<body>
    <div class="admin-container">
        <!-- Header -->
        <div class="admin-header">
            <h1 class="admin-title">پنل مدیریت فروشگاه</h1>
            <a href="/shop" class="back-to-shop">
                <i class="bx bx-arrow-back"></i>
                بازگشت به فروشگاه
            </a>
        </div>

        <!-- Tabs -->
        <div class="admin-tabs">
            <button class="tab-btn active" onclick="switchTab('products')">
                <i class="bx bx-package"></i>
                مدیریت کالاها
            </button>
            <button class="tab-btn" onclick="switchTab('inventory')">
                <i class="bx bx-box"></i>
                موجودی و قیمت
            </button>
            <button class="tab-btn" onclick="switchTab('orders')">
                <i class="bx bx-receipt"></i>
                مدیریت سفارشها
            </button>
        </div>

        <!-- Tab Content -->
        <div class="tab-content">
            <!-- Products Management Tab -->
            <div id="products-panel" class="tab-panel active">
                <h2>
                    <i class="bx bx-package"></i>
                    مدیریت کالاها
                </h2>
                <div id="products-table-container">
                    <div class="loading">در حال بارگذاری محصولات...</div>
                </div>
            </div>

            <!-- Inventory Management Tab -->
            <div id="inventory-panel" class="tab-panel">
                <h2>
                    <i class="bx bx-box"></i>
                    مدیریت موجودی و قیمت ها
                </h2>
                <div id="inventory-table-container">
                    <div class="loading">در حال بارگذاری اطلاعات موجودی...</div>
                </div>
            </div>

            <!-- Orders Management Tab -->
            <div id="orders-panel" class="tab-panel">
                <h2>
                    <i class="bx bx-receipt"></i>
                    مدیریت سفارشها
                </h2>
                <div class="filter-section">
                    <div class="filter-btns">
                        <button class="filter-btn active" onclick="filterOrders('all')">
                            همه سفارشها
                        </button>
                        <button class="filter-btn" onclick="filterOrders('finished')">
                            تحویل شده
                        </button>
                        <button class="filter-btn" onclick="filterOrders('pending')">
                            در انتظار پرداخت
                        </button>
                        <button class="filter-btn" onclick="filterOrders('open')">
                            فعال
                        </button>
                    </div>
                </div>
                <div id="orders-table-container">
                    <div class="loading">در حال بارگذاری سفارشات...</div>
                </div>
            </div>
        </div>
    </div>

    <!-- Edit Product Modal -->
    <div id="editProductModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2 class="modal-title">
                    <i class="bx bx-edit"></i>
                    ویرایش محصول
                </h2>
                <span class="close" onclick="closeModal('editProductModal')">&times;</span>
            </div>
            <form id="editProductForm">
                <div class="form-group">
                    <label class="form-label">
                        <i class="bx bx-package"></i>
                        نام محصول:
                    </label>
                    <input type="text" id="editProductName" class="form-input" required>
                </div>
                <div class="form-group">
                    <label class="form-label">
                        <i class="bx bx-tag"></i>
                        برند:
                    </label>
                    <input type="text" id="editProductBrand" class="form-input" required>
                </div>
                <div class="form-group">
                    <label class="form-label">
                        <i class="bx bx-dollar"></i>
                        قیمت (تومان):
                    </label>
                    <input type="number" id="editProductPrice" class="form-input" required min="0">
                </div>
                <div class="form-group">
                    <label class="form-label">
                        <i class="bx bx-box"></i>
                        موجودی:
                    </label>
                    <input type="number" id="editProductQuantity" class="form-input" required min="0">
                </div>
                <div class="form-group">
                    <label class="form-label">
                        <i class="bx bx-text"></i>
                        توضیحات:
                    </label>
                    <textarea id="editProductDescription" class="form-input" rows="3"
                        placeholder="توضیحات اختیاری درباره محصول..."></textarea>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn-secondary" onclick="closeModal('editProductModal')">
                        <i class="bx bx-x"></i>
                        انصراف
                    </button>
                    <button type="submit" class="btn-primary">
                        <i class="bx bx-check"></i>
                        ذخیره تغییرات
                    </button>
                </div>
            </form>
        </div>
    </div>

    <!-- Edit Inventory Modal -->
    <div id="editInventoryModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2 class="modal-title">
                    <i class="bx bx-edit"></i>
                    ویرایش قیمت و موجودی
                </h2>
                <span class="close" onclick="closeModal('editInventoryModal')">&times;</span>
            </div>
            <form id="editInventoryForm">
                <div class="form-group">
                    <label class="form-label">
                        <i class="bx bx-package"></i>
                        نام محصول:
                    </label>
                    <input type="text" id="inventoryProductName" class="form-input" readonly>
                </div>
                <div class="form-group">
                    <label class="form-label">
                        <i class="bx bx-dollar"></i>
                        قیمت جدید (تومان):
                    </label>
                    <input type="number" id="inventoryPrice" class="form-input" required min="0">
                </div>
                <div class="form-group">
                    <label class="form-label">
                        <i class="bx bx-box"></i>
                        موجودی جدید:
                    </label>
                    <input type="number" id="inventoryQuantity" class="form-input" required min="0">
                </div>
                <div class="form-actions">
                    <button type="button" class="btn-secondary" onclick="closeModal('editInventoryModal')">
                        <i class="bx bx-x"></i>
                        انصراف
                    </button>
                    <button type="submit" class="btn-primary">
                        <i class="bx bx-check"></i>
                        بروزرسانی
                    </button>
                </div>
            </form>
        </div>
    </div>

    <!-- Order Details Modal -->
    <div id="orderDetailsModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2 class="modal-title">
                    <i class="bx bx-receipt"></i>
                    جزئیات سفارش
                </h2>
                <span class="close" onclick="closeModal('orderDetailsModal')">&times;</span>
            </div>
            <div id="orderDetailsContent">
                <!-- Order details will be loaded here by JavaScript -->
            </div>
        </div>
    </div>

    <!-- Scripts -->
    <script src="/javascript/admin-panel/admin-panel.js"></script>
</body>

</html>