// javascript/wishlist.js - Complete wishlist functionality

import {
  basketService,
  authService,
  imageService,
  wishlistService,
} from "./shop/shop-services.js";

console.log("Wishlist JS loaded");

// Global state
let currentBasket = {};
let currentBasketStatus = "open";
let userWishlist = [];

// Initialize page
document.addEventListener("DOMContentLoaded", async () => {
  console.log("DEBUG: Initializing wishlist page");

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

    // Load data
    await Promise.all([loadBasket(), loadWishlist()]);

    console.log("DEBUG: Wishlist page initialized successfully");
  } catch (error) {
    console.error("DEBUG: Error initializing wishlist page:", error);
    showNotification("خطا در بارگذاری صفحه", "error");
  }
});

// Load current basket
async function loadBasket() {
  try {
    console.log("DEBUG: Loading basket...");

    const summary = await basketService.getBasketSummary();
    currentBasketStatus = summary.basketStatus || "open";

    currentBasket = await basketService.getBasket();
    console.log("DEBUG: Basket loaded:", currentBasket);

    updateCartBadge();
  } catch (error) {
    console.error("DEBUG: Error loading basket:", error);
    currentBasket = {};
    currentBasketStatus = "open";
    updateCartBadge();
  }
}

// Load user's wishlist
async function loadWishlist() {
  try {
    console.log("DEBUG: Loading wishlist...");

    userWishlist = await wishlistService.getWishlist();
    console.log("DEBUG: Wishlist loaded with", userWishlist.length, "items");

    renderWishlist();
  } catch (error) {
    console.error("DEBUG: Error loading wishlist:", error);
    showErrorState("خطا در بارگذاری علاقه‌مندی‌ها");
  }
}

// Render wishlist content
function renderWishlist() {
  const contentElement = document.getElementById("wishlist-content");
  const clearAllBtn = document.getElementById("clear-all-btn");

  if (userWishlist.length === 0) {
    // Show empty state
    contentElement.innerHTML = `
      <div class="empty-wishlist">
        <div class="empty-wishlist-icon">💝</div>
        <h3>هیچ محصولی در علاقه‌مندی‌های شما نیست</h3>
        <p>محصولات مورد علاقه‌تان را برای خرید آینده ذخیره کنید</p>
        <button onclick="goBackToShop()" class="start-shopping-btn">
          <i class='bx bx-shopping-bag'></i>
          شروع خرید
        </button>
      </div>
    `;

    // Disable clear all button
    clearAllBtn.disabled = true;
    return;
  }

  // Enable clear all button
  clearAllBtn.disabled = false;

  // Render wishlist items
  const wishlistItemsHtml = userWishlist
    .map((item) => {
      const product = item.product;
      const imagePath = imageService.getImagePath(product.thumbnail, "product");
      const isOutOfStock = product.quantity <= 0;
      const currentQuantityInBasket = basketService.getProductQuantity(
        product._id,
        currentBasket
      );

      return `
      <div class="wishlist-item" data-product-id="${product._id}">
        <div class="wishlist-item-image">
          <img src="${imagePath}" 
               alt="${product.name}" 
               onerror="handleImageError(this, 'product')" />
          <button class="remove-from-wishlist" 
                  onclick="removeFromWishlist('${product._id}')"
                  title="حذف از علاقه‌مندی‌ها">
            <i class='bx bx-x'></i>
          </button>
        </div>
        
        <div class="wishlist-item-info">
          <div class="wishlist-item-name">${product.name}</div>
          <div class="wishlist-item-brand">برند: ${product.brand}</div>
          <div class="wishlist-item-price">${product.price.toLocaleString()} تومان</div>
          
          <div class="wishlist-item-stock ${isOutOfStock ? "out-of-stock" : "in-stock"}">
            ${isOutOfStock ? "ناموجود" : "موجود"}
          </div>
          
          <div class="wishlist-item-actions">
            ${
              !isOutOfStock && currentBasketStatus === "open"
                ? `
              <button onclick="addToCartFromWishlist('${product._id}')" 
                      class="add-to-cart-from-wishlist">
                <i class='bx bx-cart-add'></i>
                ${
                  currentQuantityInBasket > 0
                    ? `افزودن (${currentQuantityInBasket} در سبد)`
                    : "افزودن به سبد"
                }
              </button>
            `
                : `
              <button class="add-to-cart-from-wishlist" disabled>
                <i class='bx bx-x-circle'></i>
                ${isOutOfStock ? "ناموجود" : "سبد غیرفعال"}
              </button>
            `
            }
            
            <button onclick="viewProductFromWishlist('${product._id}')" 
                    class="view-product-from-wishlist">
              <i class='bx bx-show'></i>
            </button>
          </div>
        </div>
      </div>
    `;
    })
    .join("");

  contentElement.innerHTML = `
    <div class="wishlist-content">
      <div class="wishlist-items">
        ${wishlistItemsHtml}
      </div>
    </div>
  `;
}

// Add product to cart from wishlist
window.addToCartFromWishlist = async function (productId) {
  console.log("DEBUG: Adding to cart from wishlist:", productId);

  if (currentBasketStatus !== "open") {
    showNotification("سبد در حالت فعال نیست", "warning");
    return;
  }

  try {
    currentBasket = await basketService.addToBasket(productId, 1);
    console.log("DEBUG: Product added to basket from wishlist");

    updateCartBadge();

    // Update the button text to show current quantity
    const productCard = document.querySelector(`[data-product-id="${productId}"]`);
    if (productCard) {
      const addButton = productCard.querySelector(".add-to-cart-from-wishlist");
      const currentQuantity = basketService.getProductQuantity(productId, currentBasket);
      if (addButton && !addButton.disabled) {
        addButton.innerHTML = `
          <i class='bx bx-cart-add'></i>
          افزودن (${currentQuantity} در سبد)
        `;
      }
    }

    showNotification("محصول به سبد خرید اضافه شد", "success");
  } catch (error) {
    console.error("DEBUG: Error adding to cart from wishlist:", error);
    showNotification("خطا در افزودن به سبد خرید", "error");
  }
};

// Remove product from wishlist
window.removeFromWishlist = async function (productId) {
  console.log("DEBUG: Removing from wishlist:", productId);

  try {
    const success = await wishlistService.removeFromWishlist(productId);

    if (success) {
      // Remove from local state
      userWishlist = userWishlist.filter((item) => item.product._id !== productId);

      // Re-render wishlist
      renderWishlist();

      showNotification("محصول از علاقه‌مندی‌ها حذف شد", "success");
    }
  } catch (error) {
    console.error("DEBUG: Error removing from wishlist:", error);
    showNotification("خطا در حذف از علاقه‌مندی‌ها", "error");
  }
};

// Clear all wishlist
window.clearAllWishlist = async function () {
  if (!confirm("آیا از پاک کردن تمام علاقه‌مندی‌ها اطمینان دارید؟")) {
    return;
  }

  console.log("DEBUG: Clearing all wishlist");

  try {
    const success = await wishlistService.clearWishlist();

    if (success) {
      userWishlist = [];
      renderWishlist();
      showNotification("تمام علاقه‌مندی‌ها پاک شدند", "success");
    }
  } catch (error) {
    console.error("DEBUG: Error clearing wishlist:", error);
    showNotification("خطا در پاک کردن علاقه‌مندی‌ها", "error");
  }
};

// View product details from wishlist
window.viewProductFromWishlist = function (productId) {
  window.location.href = `/product/${productId}`;
};

// Navigation functions
window.goBackToShop = function () {
  window.location.href = "/shop";
};

window.goToBasketPage = function () {
  window.location.href = "/basket";
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
      <div style="text-align: center; padding: 40px; color: #666;">
        <div style="font-size: 48px; margin-bottom: 10px;">🛒</div>
        <div style="font-size: 18px; font-weight: 600; margin-bottom: 5px;">سبد خالی است</div>
      </div>
    `;
    cartTotal.innerHTML = `
      <div style="text-align: center; padding: 20px;">
        <div style="font-size: 18px; font-weight: 600;">۰ تومان</div>
      </div>
    `;
    return;
  }

  try {
    const totalAmount = await basketService.getBasketTotal(currentBasket);

    cartItems.innerHTML = basketInfo.items
      .map(({ productId, quantity }) => {
        return `
        <div style="display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid #eee;">
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

// Utility functions
function showErrorState(title, message = "") {
  document.getElementById("wishlist-content").innerHTML = `
    <div style="text-align: center; padding: 100px 20px; color: #f44336;">
      <h2>${title}</h2>
      ${message ? `<p>${message}</p>` : ""}
      <button onclick="goBackToShop()" class="back-btn">
        <i class='bx bx-arrow-back'></i> بازگشت به فروشگاه
      </button>
    </div>
  `;
}

function showNotification(message, type = "info") {
  wishlistService.showNotification(message, type);
}

// Make image error handler globally available
window.handleImageError = imageService.handleImageError;
