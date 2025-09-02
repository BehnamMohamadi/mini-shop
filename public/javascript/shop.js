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

// UPDATED: Redirect to basket management page without changing status
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

  // Simply redirect to basket management page without changing status
  basketService.showNotification("در حال انتقال به صفحه مدیریت سبد...", "info");

  setTimeout(() => {
    window.location.href = "/basket";
  }, 1000);
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
        <button onclick="proceedToPayment()" class="checkout-btn">مدیریت سبد و پرداخت</button>
        <button onclick="clearBasket()" class="clear-btn">پاک کردن</button>
      `;
    } else if (currentBasketStatus === "pending") {
      actionButtons = `
        <button onclick="proceedToPayment()" class="checkout-btn">مدیریت سبد</button>
        <div class="status-message">سبد در انتظار پرداخت</div>
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
