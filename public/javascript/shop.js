// shop.js - Show Stock Errors on Product Cards
import {
  getProducts,
  groupProducts,
  basketService,
  authService,
  imageService,
} from "./shop/shop-services.js";

console.log("🚀 Shop.js with Product Card Error Display");

// Global state
let currentBasket = {};
let groupedProducts = {};
let allProducts = [];

// FUNCTIONS WITH PRODUCT CARD ERROR DISPLAY
window.addToCart = async function (productId) {
  console.log("🛒 ADD TO CART:", productId);

  try {
    currentBasket = await basketService.addToBasket(productId, 1);
    console.log("Cart updated:", currentBasket);

    updateProductDisplay(productId);
    updateCartBadge();

    basketService.showNotification("محصول اضافه شد", "success");
  } catch (error) {
    console.error("Error adding to cart:", error);

    // Show error on product card
    showErrorOnProductCard(productId, "موجودی این محصول در انبار کافی نیست");

    // Also show notification
    basketService.showNotification("موجودی کافی نیست", "error");
  }
};

window.changeQuantity = async function (productId, newQuantity) {
  console.log("🔄 CHANGE QUANTITY:", productId, "to", newQuantity);

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

    // Show error on product card
    showErrorOnProductCard(productId, "تعداد درخواستی بیش از موجودی انبار است");

    // Also show notification
    basketService.showNotification("موجودی کافی نیست", "error");

    // Reload basket to sync with server state
    await loadBasket();
  }
};

window.removeFromCart = async function (productId) {
  console.log("🗑️ REMOVE FROM CART:", productId);

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

window.viewProductDetails = function (productId) {
  window.location.href = `/product/${productId}`;
};

window.proceedToCheckout = function () {
  const itemCount = basketService.getBasketItemCount(currentBasket);
  if (itemCount === 0) {
    basketService.showNotification("سبد خالی است", "warning");
    return;
  }
  window.location.href = "/basket";
};

// SHOW ERROR ON PRODUCT CARD
function showErrorOnProductCard(productId, errorMessage) {
  const productCards = document.querySelectorAll(`[data-product-id='${productId}']`);

  productCards.forEach((card) => {
    // Remove any existing error messages
    const existingError = card.querySelector(".product-error");
    if (existingError) {
      existingError.remove();
    }

    // Create error element
    const errorElement = document.createElement("div");
    errorElement.className = "product-error";
    errorElement.textContent = errorMessage;

    // Add to product info section
    const productInfo = card.querySelector(".product-info");
    if (productInfo) {
      productInfo.appendChild(errorElement);
    }

    // Auto-remove error after 5 seconds
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

    // Clear any existing error messages when updating
    const existingError = card.querySelector(".product-error");
    if (existingError) {
      existingError.remove();
    }

    if (quantity > 0) {
      actionsContainer.innerHTML = `
        <div class="quantity-controls">
          <button onclick="changeQuantity('${productId}', ${
        quantity - 1
      })" class="quantity-btn">-</button>
          <span class="quantity-display">${quantity}</span>
          <button onclick="changeQuantity('${productId}', ${
        quantity + 1
      })" class="quantity-btn">+</button>
        </div>
      `;
      console.log(
        `Updated card ${index} with quantity controls for quantity ${quantity}`
      );
    } else {
      actionsContainer.innerHTML = `
        <button onclick="addToCart('${productId}')" class="buy-btn">خرید</button>
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

    cartItems.innerHTML = "";

    basketInfo.items.forEach(({ productId, quantity }) => {
      const product = allProducts.find((p) => p._id === productId);
      if (!product) return;

      const itemTotal = product.price * quantity;
      const imagePath = imageService.getImagePath(product.thumbnail, "product");

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
      })" class="quantity-btn">-</button>
            <span class="quantity-display">${quantity}</span>
            <button onclick="changeQuantity('${productId}', ${
        quantity + 1
      })" class="quantity-btn">+</button>
          </div>
          <div class="cart-item-total">${itemTotal.toLocaleString()} تومان</div>
        </div>
      `;
      cartItems.appendChild(cartItem);
    });

    cartTotal.innerHTML = `
      <div class="cart-total-section">
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
          <button onclick="proceedToCheckout()" class="checkout-btn">تسویه</button>
          <button onclick="clearBasket()" class="clear-btn">پاک کردن</button>
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
                    })" class="quantity-btn">-</button>
                  <span class="quantity-display">${quantity}</span>
                  <button onclick="changeQuantity('${product._id}', ${
                      quantity + 1
                    })" class="quantity-btn">+</button>
                </div>
              `
                  : `
                <button onclick="addToCart('${product._id}')" class="buy-btn">خرید</button>
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
    currentBasket = await basketService.getBasket();
    console.log("Basket loaded:", currentBasket);
    updateCartBadge();
    updateAllProducts();
  } catch (error) {
    console.error("Error loading basket:", error);
    currentBasket = {};
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
                })" class="quantity-btn">-</button>
              <span class="quantity-display">${quantity}</span>
              <button onclick="changeQuantity('${product._id}', ${
                  quantity + 1
                })" class="quantity-btn">+</button>
            </div>
          `
              : `
            <button onclick="addToCart('${product._id}')" class="buy-btn">خرید</button>
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
  console.log("🚀 Initializing shop with product card error display...");

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

    console.log("✅ Shop with product card errors initialized successfully");
    basketService.showNotification("فروشگاه بارگذاری شد", "success");
  } catch (error) {
    console.error("❌ Error initializing shop:", error);
    basketService.showNotification("خطا در بارگذاری فروشگاه", "error");
  }
});

// Test function
window.testButtons = function () {
  console.log("Testing button functions...");
  console.log("addToCart function:", typeof window.addToCart);
  console.log("changeQuantity function:", typeof window.changeQuantity);
  console.log("removeFromCart function:", typeof window.removeFromCart);
};
