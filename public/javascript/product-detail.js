// javascript/product-detail.js - Fixed with direct +/- controls like shop page

import { basketService, authService, imageService } from "./shop/shop-services.js";

console.log("Product Detail JS loaded");

// Global state
let currentProduct = null;
let currentBasket = {};
let currentBasketStatus = "open";

// Get product ID from the page
const productId = window.location.pathname.split("/").pop();

// Initialize page
document.addEventListener("DOMContentLoaded", async () => {
  console.log("DEBUG: Initializing product detail page for:", productId);

  try {
    // Check authentication
    const isAuthenticated = await authService.checkAuth();
    if (!isAuthenticated) {
      showNotification("لطفا ابتدا وارد شوید", "warning");
      setTimeout(() => (window.location.href = "/login"), 2000);
      return;
    }

    // Setup cart modal
    setupCartModal();

    // Load product and basket
    await Promise.all([loadProductDetail(), loadBasket()]);

    console.log("DEBUG: Product detail page initialized successfully");
  } catch (error) {
    console.error("DEBUG: Error initializing product detail page:", error);
    showErrorState("خطا در بارگذاری صفحه");
  }
});

// Load product details from database
async function loadProductDetail() {
  try {
    console.log("DEBUG: Loading product detail for:", productId);

    const response = await fetch(`/api/products/${productId}`);
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("Product not found");
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    currentProduct = data.data;

    console.log("DEBUG: Product loaded:", currentProduct.name);
    renderProductDetail();
  } catch (error) {
    console.error("DEBUG: Error loading product:", error);
    if (error.message === "Product not found") {
      showErrorState("محصول یافت نشد", "متأسفانه محصول مورد نظر شما یافت نشد.");
    } else {
      showErrorState("خطا در بارگذاری محصول", "لطفا دوباره تلاش کنید.");
    }
  }
}

// Load current basket
async function loadBasket() {
  try {
    console.log("DEBUG: Loading basket...");

    const summary = await basketService.getBasketSummary();
    currentBasketStatus = summary.basketStatus || "open";

    currentBasket = await basketService.getBasket();
    console.log("DEBUG: Basket loaded:", currentBasket);

    updateCartBadge();
    updateProductDisplay();
  } catch (error) {
    console.error("DEBUG: Error loading basket:", error);
    currentBasket = {};
    currentBasketStatus = "open";
    updateCartBadge();
  }
}

// Render product detail
function renderProductDetail() {
  if (!currentProduct) return;

  const imagePath = imageService.getImagePath(currentProduct.thumbnail, "product");
  const isOutOfStock = currentProduct.quantity <= 0;

  let stockStatusHtml = "";
  let stockClass = "";

  if (isOutOfStock) {
    stockStatusHtml = `<i class='bx bx-x-circle'></i> این محصول در حال حاضر موجود نیست`;
    stockClass = "out-of-stock";
  } else {
    stockStatusHtml = `<i class='bx bx-package'></i> موجود`;
    stockClass = "in-stock";
  }

  document.getElementById("product-detail-content").innerHTML = `
    <div class="product-detail-content">
      <div class="product-detail-grid">
        <div class="product-images">
          <img src="${imagePath}" 
               alt="${currentProduct.name}" 
               class="main-image"
               onerror="handleImageError(this, 'product')" />
        </div>
        
        <div class="product-info-detail">
          <h1 class="product-title">${currentProduct.name}</h1>
          <div class="product-brand-detail">برند: ${currentProduct.brand}</div>
          <div class="product-price-detail">
            <i class='bx bx-money'></i>
            ${currentProduct.price.toLocaleString()} تومان
          </div>
          <div class="product-stock-detail ${stockClass}">
            ${stockStatusHtml}
          </div>
          
          <div class="product-actions-detail" id="product-actions">
            <!-- This will be populated by updateProductDisplay -->
          </div>
        </div>
      </div>
      
      <div class="product-description-detail">
        <h3><i class='bx bx-detail'></i> توضیحات محصول</h3>
        <p>${currentProduct.description || "توضیحاتی برای این محصول ارائه نشده است."}</p>
      </div>
    </div>
  `;

  // Update the product display with current basket state
  updateProductDisplay();
}

// FIXED: Update product display like shop page
function updateProductDisplay() {
  if (!currentProduct) return;

  const actionsContainer = document.getElementById("product-actions");
  if (!actionsContainer) return;

  const quantity = basketService.getProductQuantity(currentProduct._id, currentBasket);
  const isOutOfStock = currentProduct.quantity <= 0;
  const isDisabled = currentBasketStatus !== "open" || isOutOfStock;

  const disabledStyle = isDisabled
    ? ' disabled style="opacity: 0.5; cursor: not-allowed;"'
    : "";

  console.log(
    "DEBUG: Updating product display - quantity in basket:",
    quantity,
    "out of stock:",
    isOutOfStock
  );

  if (isOutOfStock) {
    actionsContainer.innerHTML = `
      <button class="add-to-cart-detail" disabled style="opacity: 0.5; cursor: not-allowed;">
        <i class='bx bx-x-circle'></i>
        ناموجود
      </button>
    `;
  } else if (quantity > 0) {
    // Show quantity controls like shop page
    actionsContainer.innerHTML = `
      <div class="quantity-controls-detail">
        <button onclick="changeQuantityDirect(${quantity - 1})" 
                class="quantity-btn-detail"${disabledStyle}>-</button>
        <span class="quantity-display-detail">${quantity}</span>
        <button onclick="changeQuantityDirect(${quantity + 1})" 
                class="quantity-btn-detail"${disabledStyle}>+</button>
      </div>
      <div class="current-in-basket">
        <i class='bx bx-shopping-bag'></i>
        ${quantity} عدد در سبد شما
      </div>
    `;
  } else {
    // Show buy button for first add
    actionsContainer.innerHTML = `
      <button onclick="changeQuantityDirect(1)" class="add-to-cart-detail"${disabledStyle}>
        <i class='bx bx-cart-add'></i>
        افزودن به سبد خرید
      </button>
    `;
  }
}

// FIXED: Direct quantity change function like shop page
window.changeQuantityDirect = async function (newQuantity) {
  console.log("DEBUG: changeQuantityDirect called:", {
    productId: currentProduct._id,
    newQuantity,
    currentBasketStatus,
  });

  if (currentBasketStatus !== "open") {
    basketService.showNotification("سبد در حالت فعال نیست", "warning");
    return;
  }

  if (!currentProduct) {
    basketService.showNotification("خطا در بارگذاری محصول", "error");
    return;
  }

  if (newQuantity < 0) {
    newQuantity = 0;
  }

  try {
    console.log("DEBUG: About to call basketService.updateQuantity");

    const result = await basketService.updateQuantity(currentProduct._id, newQuantity);
    console.log("DEBUG: basketService.updateQuantity returned:", result);

    currentBasket = result;
    console.log("DEBUG: Updated currentBasket:", currentBasket);

    updateProductDisplay();
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
    console.error("DEBUG: Error in changeQuantityDirect:", error);
    basketService.showNotification("خطا در تغییر تعداد محصول", "error");

    console.log("DEBUG: Reloading basket due to error");
    await loadBasket();
  }
};

// Cart functions
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
      <div class="empty-cart" style="text-align: center; padding: 40px; color: #666;">
        <div style="font-size: 48px; margin-bottom: 10px;">🛒</div>
        <div style="font-size: 18px; font-weight: 600; margin-bottom: 5px;">سبد خالی است</div>
        <div style="font-size: 14px;">هیچ محصولی در سبد شما وجود ندارد</div>
      </div>
    `;
    cartTotal.innerHTML = `
      <div style="text-align: center; padding: 20px;">
        <div style="font-size: 18px; font-weight: 600;">۰ تومان</div>
        <button onclick="goBackToShop()" style="margin-top: 10px; padding: 10px 20px; background: #4CAF50; color: white; border: none; border-radius: 6px; cursor: pointer;">
          شروع خرید
        </button>
      </div>
    `;
    return;
  }

  try {
    const totalAmount = await basketService.getBasketTotal(currentBasket);

    cartItems.innerHTML = basketInfo.items
      .map(({ productId, quantity }) => {
        return `
        <div class="cart-item" style="display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid #eee;">
          <div style="flex: 1;">
            <div style="font-weight: 600;">محصول</div>
            <div style="font-size: 14px; color: #666;">تعداد: ${quantity}</div>
          </div>
        </div>
      `;
      })
      .join("");

    cartTotal.innerHTML = `
      <div style="text-align: center; padding: 20px;">
        <div style="font-size: 18px; font-weight: 600; margin-bottom: 15px;">
          جمع: ${totalAmount.toLocaleString()} تومان
        </div>
        <button onclick="goToBasketPage()" style="width: 100%; padding: 12px; background: #4CAF50; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
          مدیریت سبد و پرداخت
        </button>
      </div>
    `;
  } catch (error) {
    console.error("DEBUG: Error rendering cart:", error);
  }
}

// Navigation functions
window.goBackToShop = function () {
  window.location.href = "/shop";
};

window.goToBasketPage = function () {
  window.location.href = "/basket";
};

// Utility functions
function showErrorState(title, message = "") {
  document.getElementById("product-detail-content").innerHTML = `
    <div class="error-detail">
      <h2>${title}</h2>
      ${message ? `<p>${message}</p>` : ""}
      <button onclick="goBackToShop()" class="back-to-shop">
        <i class='bx bx-arrow-back'></i> بازگشت به فروشگاه
      </button>
    </div>
  `;
}

function showNotification(message, type = "info") {
  basketService.showNotification(message, type);
}

// Make image error handler globally available
window.handleImageError = imageService.handleImageError;
