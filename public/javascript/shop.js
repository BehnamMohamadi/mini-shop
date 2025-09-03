// shop.js - Complete file with debugging fixes
import {
  getProducts,
  groupProducts,
  basketService,
  authService,
  imageService,
} from "./shop/shop-services.js";

console.log("Shop.js with debugging fixes");

// Global state
let currentBasket = {};
let groupedProducts = {};
let allProducts = [];
let currentBasketStatus = "open";

// FUNCTIONS WITH STATUS SUPPORT
window.addToCart = async function (productId) {
  console.log("🔧 DEBUG: ADD TO CART called:", productId);

  if (currentBasketStatus !== "open") {
    basketService.showNotification(
      "نمی‌توان محصول به سبد اضافه کرد. سبد در حالت فعال نیست",
      "warning"
    );
    return;
  }

  try {
    currentBasket = await basketService.addToBasket(productId, 1);
    console.log("🔧 DEBUG: Cart updated:", currentBasket);

    updateProductDisplay(productId);
    updateCartBadge();

    basketService.showNotification("محصول اضافه شد", "success");
  } catch (error) {
    console.error("🔧 DEBUG: Error adding to cart:", error);
    showErrorOnProductCard(productId, "موجودی این محصول در انبار کافی نیست");
    basketService.showNotification("موجودی کافی نیست", "error");
  }
};

window.changeQuantity = async function (productId, newQuantity) {
  console.log("🔧 DEBUG: CHANGE QUANTITY called:", {
    productId,
    newQuantity,
    currentBasketStatus,
  });

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
    console.log("🔧 DEBUG: About to call basketService.updateQuantity");

    const result = await basketService.updateQuantity(productId, newQuantity);
    console.log("🔧 DEBUG: basketService.updateQuantity returned:", result);

    currentBasket = result;
    console.log("🔧 DEBUG: Updated currentBasket:", currentBasket);

    updateProductDisplay(productId);
    updateCartBadge();

    if (isCartOpen()) {
      renderCartModal();
    }

    if (newQuantity === 0) {
      basketService.showNotification("محصول از سبد حذف شد", "info");
    } else {
      basketService.showNotification(`تعداد به ${newQuantity} تغییر یافت`, "success");
    }
  } catch (error) {
    console.error("🔧 DEBUG: Error in changeQuantity:", error);
    showErrorOnProductCard(productId, "خطا در تغییر تعداد");
    basketService.showNotification("خطا در تغییر تعداد محصول", "error");

    console.log("🔧 DEBUG: Reloading basket due to error");
    await loadBasket();
  }
};

window.removeFromCart = async function (productId) {
  console.log("🔧 DEBUG: REMOVE FROM CART:", productId);

  if (currentBasketStatus !== "open") {
    basketService.showNotification(
      "نمی‌توان محصول از سبد حذف کرد. سبد در حالت فعال نیست",
      "warning"
    );
    return;
  }

  try {
    currentBasket = await basketService.removeFromBasket(productId);
    console.log("🔧 DEBUG: Cart updated:", currentBasket);

    updateProductDisplay(productId);
    updateCartBadge();

    if (isCartOpen()) {
      renderCartModal();
    }

    basketService.showNotification("محصول از سبد حذف شد", "success");
  } catch (error) {
    console.error("🔧 DEBUG: Error removing from cart:", error);
    basketService.showNotification("خطا در حذف محصول", "error");
  }
};

window.clearBasket = async function () {
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
    console.error("🔧 DEBUG: Error clearing basket:", error);
    basketService.showNotification("خطا در پاک کردن سبد", "error");
  }
};

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

  basketService.showNotification("در حال انتقال به صفحه مدیریت سبد...", "info");

  setTimeout(() => {
    window.location.href = "/basket";
  }, 1000);
};

window.goToBasketPage = function () {
  window.location.href = "/basket";
};

function updateBasketStatusUI() {
  const statusText = basketService.getStatusText(currentBasketStatus);

  const statusElements = document.querySelectorAll(".basket-status");
  statusElements.forEach((element) => {
    element.textContent = statusText;
  });

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

  console.log("🔧 DEBUG: UI updated for basket status:", currentBasketStatus);
}

window.viewProductDetails = function (productId) {
  window.location.href = `/product/${productId}`;
};

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

function updateProductDisplay(productId) {
  console.log("🔧 DEBUG: updateProductDisplay called for:", productId);

  const quantity = basketService.getProductQuantity(productId, currentBasket);
  const productCards = document.querySelectorAll(`[data-product-id='${productId}']`);

  console.log("🔧 DEBUG: Found", productCards.length, "cards for product", productId);
  console.log("🔧 DEBUG: Current quantity in basket:", quantity);

  productCards.forEach((card, index) => {
    const actionsContainer = card.querySelector(".product-actions");
    if (!actionsContainer) {
      console.warn("🔧 DEBUG: No actions container found for card", index);
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
      console.log(
        "🔧 DEBUG: Rendering quantity controls for card",
        index,
        "with quantity",
        quantity
      );
      actionsContainer.innerHTML = `
        <div class="quantity-controls">
          <button onclick="changeQuantity('${productId}', ${quantity - 1})" 
                  class="quantity-btn"${disabledStyle}>-</button>
          <span class="quantity-display">${quantity}</span>
          <button onclick="changeQuantity('${productId}', ${quantity + 1})" 
                  class="quantity-btn"${disabledStyle}>+</button>
        </div>
      `;
      console.log(
        `🔧 DEBUG: Updated card ${index} with quantity controls for quantity ${quantity}`
      );
    } else {
      console.log("🔧 DEBUG: Rendering buy button for card", index);
      actionsContainer.innerHTML = `
        <button onclick="addToCart('${productId}')" class="buy-btn"${disabledStyle}>خرید</button>
      `;
      console.log(`🔧 DEBUG: Updated card ${index} with buy button`);
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

    let actionButtons = "";
    if (currentBasketStatus === "open") {
      actionButtons = `
        <button onclick="goToBasketPage()" class="checkout-btn">مدیریت سبد و پرداخت</button>
        <button onclick="clearBasket()" class="clear-btn">پاک کردن</button>
      `;
    } else if (currentBasketStatus === "pending") {
      actionButtons = `
        <button onclick="goToBasketPage()" class="checkout-btn">مدیریت سبد</button>
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
    console.error("🔧 DEBUG: Error rendering cart:", error);
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
    console.log("🔧 DEBUG: Loading basket...");

    const summary = await basketService.getBasketSummary();
    console.log("🔧 DEBUG: Basket summary received:", summary);

    currentBasketStatus = summary.basketStatus || "open";
    console.log("🔧 DEBUG: Current basket status set to:", currentBasketStatus);

    currentBasket = await basketService.getBasket();
    console.log("🔧 DEBUG: Basket loaded:", currentBasket);

    updateCartBadge();
    updateAllProducts();
    updateBasketStatusUI();

    console.log("🔧 DEBUG: Basket loading completed successfully");
  } catch (error) {
    console.error("🔧 DEBUG: Error loading basket:", error);

    currentBasket = {};
    currentBasketStatus = "open";

    updateCartBadge();
    updateAllProducts();
    updateBasketStatusUI();
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
      console.error("🔧 DEBUG: Error loading categories:", error);
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
  console.log("🔧 DEBUG: Initializing shop...");

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
    console.log("🔧 DEBUG: Loading products...");
    allProducts = await getProducts();
    groupedProducts = groupProducts(allProducts);

    // Render products
    renderProducts(groupedProducts);

    // Load basket
    await loadBasket();

    console.log("🔧 DEBUG: Shop initialized successfully");
    basketService.showNotification("فروشگاه بارگذاری شد", "success");
  } catch (error) {
    console.error("🔧 DEBUG: Error initializing shop:", error);
    basketService.showNotification("خطا در بارگذاری فروشگاه", "error");
  }
});

// Global functions for testing
window.testButtons = function () {
  console.log("Testing button functions...");
  console.log("addToCart function:", typeof window.addToCart);
  console.log("changeQuantity function:", typeof window.changeQuantity);
  console.log("removeFromCart function:", typeof window.removeFromCart);
  console.log("proceedToPayment function:", typeof window.proceedToPayment);
  console.log("goToBasketPage function:", typeof window.goToBasketPage);
  console.log("Current basket status:", currentBasketStatus);
  console.log("Current basket:", currentBasket);
};

// DEBUG: Test quantity update directly
window.testQuantityUpdate = async function (productId, newQuantity) {
  console.log("🔧 DEBUG: Manual test - updating quantity");
  console.log("🔧 DEBUG: Product ID:", productId);
  console.log("🔧 DEBUG: New Quantity:", newQuantity);
  console.log("🔧 DEBUG: Current basket:", currentBasket);

  try {
    const response = await fetch(`/api/basket/item/${productId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ count: newQuantity }),
    });

    console.log("🔧 DEBUG: Response status:", response.status);

    const result = await response.json();
    console.log("🔧 DEBUG: Response data:", result);

    if (!response.ok) {
      console.error("🔧 DEBUG: API Error:", result);
    }

    return result;
  } catch (error) {
    console.error("🔧 DEBUG: Network error:", error);
    throw error;
  }
};

// Admin panel navigation
document.querySelector("#admin-btn-page")?.addEventListener("click", (e) => {
  e.preventDefault();
  window.location.href = `/admin-panel`;
});
