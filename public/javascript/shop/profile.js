// shop.js - Modular Frontend with Backend Integration
import {
  getProducts,
  groupProducts,
  basketService,
  authService,
  imageService,
} from "./shop/shop-services.js";

// Global state management
const shopState = {
  grouped: {},
  currentBasket: {},
  isLoading: false,
  user: null,
};

// DOM elements cache
const shopElements = {
  productContainer: null,
  cartModal: null,
  cartIcon: null,
  cartItems: null,
  cartTotal: null,
  closeCart: null,
  sidebar: null,
  btn: null,
  searchBtn: null,
  logOutBtn: null,
  userIcon: null,
};

// Initialize DOM elements
function initializeElements() {
  shopElements.productContainer = document.getElementById("product-container");
  shopElements.cartModal = document.getElementById("cart-modal");
  shopElements.cartIcon = document.getElementById("cart-icon");
  shopElements.cartItems = document.getElementById("cart-items");
  shopElements.cartTotal = document.getElementById("cart-total");
  shopElements.closeCart = document.getElementById("close-cart");
  shopElements.sidebar = document.querySelector(".sidebar");
  shopElements.btn = document.querySelector("#btn");
  shopElements.searchBtn = document.querySelector(".bx-search");
  shopElements.logOutBtn = document.getElementById("log_out-btn");
  shopElements.userIcon = document.getElementById("user-icon");
}

// Basket Management Module
const basketManager = {
  // Load basket from database
  async loadBasket() {
    try {
      shopState.isLoading = true;
      console.log("Loading basket from database...");

      shopState.currentBasket = await basketService.getBasket();
      console.log("Basket loaded:", shopState.currentBasket);

      this.updateCartIcon();
      this.updateAllProductControls();

      shopState.isLoading = false;
    } catch (error) {
      console.error("Error loading basket:", error);
      shopState.currentBasket = {};
      shopState.isLoading = false;
    }
  },

  // Add product to cart
  async addToCart(productId) {
    if (shopState.isLoading) return;

    console.log("Adding to cart:", productId);

    try {
      shopState.isLoading = true;
      shopState.currentBasket = await basketService.addToBasket(productId, 1);

      this.updateProductControls(productId);
      this.updateCartIcon();

      if (cartModalManager.isOpen()) {
        await cartModalManager.renderCart();
      }

      shopState.isLoading = false;
    } catch (error) {
      console.error("Error adding to cart:", error);
      shopState.isLoading = false;
    }
  },

  // Change product quantity
  async changeQuantity(productId, newQuantity) {
    if (shopState.isLoading) return;

    console.log("Changing quantity:", productId, "to:", newQuantity);

    try {
      shopState.isLoading = true;
      shopState.currentBasket = await basketService.updateQuantity(
        productId,
        newQuantity
      );

      this.updateProductControls(productId);
      this.updateCartIcon();

      if (cartModalManager.isOpen()) {
        await cartModalManager.renderCart();
      }

      shopState.isLoading = false;
    } catch (error) {
      console.error("Error changing quantity:", error);
      shopState.isLoading = false;
    }
  },

  // Remove product from cart
  async removeFromCart(productId) {
    if (shopState.isLoading) return;

    try {
      shopState.isLoading = true;
      shopState.currentBasket = await basketService.removeFromBasket(productId);

      this.updateProductControls(productId);
      this.updateCartIcon();

      if (cartModalManager.isOpen()) {
        await cartModalManager.renderCart();
      }

      shopState.isLoading = false;
    } catch (error) {
      console.error("Error removing from cart:", error);
      shopState.isLoading = false;
    }
  },

  // Clear entire basket
  async clearBasket() {
    if (shopState.isLoading) return;

    if (confirm("پاک کردن همه محصولات؟")) {
      try {
        shopState.isLoading = true;
        shopState.currentBasket = await basketService.clearBasket();

        this.updateAllProductControls();
        this.updateCartIcon();

        if (cartModalManager.isOpen()) {
          await cartModalManager.renderCart();
        }

        shopState.isLoading = false;
      } catch (error) {
        console.error("Error clearing basket:", error);
        shopState.isLoading = false;
      }
    }
  },

  // Update cart icon with item count
  updateCartIcon() {
    if (!shopElements.cartIcon) return;

    const totalItems = basketService.getBasketItemCount(shopState.currentBasket);

    // Remove existing badge
    const existingBadge = shopElements.cartIcon.querySelector(".cart-badge");
    if (existingBadge) {
      existingBadge.remove();
    }

    // Add new badge if there are items
    if (totalItems > 0) {
      const badge = document.createElement("span");
      badge.className = "cart-badge";
      badge.textContent = totalItems > 99 ? "99+" : totalItems;
      badge.style.cssText = `
        position: absolute;
        top: -8px;
        right: -8px;
        background: #ff4444;
        color: white;
        border-radius: 50%;
        padding: 2px 6px;
        font-size: 12px;
        font-weight: bold;
        min-width: 18px;
        text-align: center;
      `;
      shopElements.cartIcon.appendChild(badge);
    }
  },

  // Update product controls for specific product
  updateProductControls(productId) {
    const quantity = basketService.getProductQuantity(productId, shopState.currentBasket);
    const productElements = document.querySelectorAll(`[data-product-id='${productId}']`);

    productElements.forEach((element) => {
      const actionsContainer = element.querySelector(".product-actions");
      if (!actionsContainer) return;

      if (quantity > 0) {
        actionsContainer.innerHTML = `
          <div class="quantity-controls">
            <button onclick="basketManager.changeQuantity('${productId}', ${
          quantity - 1
        })" 
                    class="quantity-btn" ${
                      shopState.isLoading ? "disabled" : ""
                    }>-</button>
            <span class="quantity-display">${quantity}</span>
            <button onclick="basketManager.changeQuantity('${productId}', ${
          quantity + 1
        })" 
                    class="quantity-btn" ${
                      shopState.isLoading ? "disabled" : ""
                    }>+</button>
          </div>
        `;
      } else {
        actionsContainer.innerHTML = `
          <button onclick="basketManager.addToCart('${productId}')" 
                  class="buy-btn" ${shopState.isLoading ? "disabled" : ""}>خرید</button>
        `;
      }
    });
  },

  // Update all product controls
  updateAllProductControls() {
    Object.keys(shopState.currentBasket).forEach((productId) => {
      this.updateProductControls(productId);
    });

    const allProductElements = document.querySelectorAll("[data-product-id]");
    allProductElements.forEach((element) => {
      const productId = element.dataset.productId;
      if (!basketService.isProductInBasket(productId, shopState.currentBasket)) {
        this.updateProductControls(productId);
      }
    });
  },
};

// Cart Modal Management Module
const cartModalManager = {
  // Check if cart modal is open
  isOpen() {
    return shopElements.cartModal && !shopElements.cartModal.classList.contains("hidden");
  },

  // Open cart modal
  open() {
    if (shopElements.cartModal) {
      shopElements.cartModal.classList.remove("hidden");
      this.renderCart();
    }
  },

  // Close cart modal
  close() {
    if (shopElements.cartModal) {
      shopElements.cartModal.classList.add("hidden");
    }
  },

  // Render cart contents
  async renderCart() {
    if (!shopElements.cartItems || !shopElements.cartTotal) return;

    shopElements.cartItems.innerHTML = "";

    const basketInfo = basketService.formatBasketForDisplay(shopState.currentBasket);

    if (basketInfo.isEmpty) {
      shopElements.cartItems.innerHTML = `
        <div class="empty-cart">
          <div class="empty-cart-icon">🛒</div>
          <div class="empty-cart-text">سبد خالی است</div>
        </div>
      `;
      shopElements.cartTotal.innerHTML = `
        <div class="cart-total-section">
          <div class="total-amount">۰ تومان</div>
        </div>
      `;
      return;
    }

    try {
      const products = await getProducts();
      const totalAmount = await basketService.getBasketTotal(shopState.currentBasket);

      basketInfo.items.forEach(({ productId, quantity }) => {
        const product = products.find((p) => p._id === productId);

        if (product && quantity > 0) {
          const itemTotal = product.price * quantity;
          const imagePath = imageService.getImagePath(product.thumbnail, "product");

          const cartItem = document.createElement("div");
          cartItem.className = "cart-item";

          cartItem.innerHTML = `
            <img src="${imagePath}" 
                 alt="${product.name}" 
                 onerror="handleImageError(this, 'product')"
                 class="cart-item-image" />
            
            <div class="cart-item-details">
              <div class="cart-item-name">${product.name}</div>
              <div class="cart-item-price">${product.price.toLocaleString()} تومان</div>
            </div>
            
            <div class="cart-item-controls">
              <div class="quantity-controls">
                <button onclick="basketManager.changeQuantity('${productId}', ${
            quantity - 1
          })" 
                        class="quantity-btn">-</button>
                <span class="quantity-display">${quantity}</span>
                <button onclick="basketManager.changeQuantity('${productId}', ${
            quantity + 1
          })" 
                        class="quantity-btn">+</button>
              </div>
              <div class="cart-item-total">${itemTotal.toLocaleString()}</div>
            </div>
          `;

          shopElements.cartItems.appendChild(cartItem);
        }
      });

      shopElements.cartTotal.innerHTML = `
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
            <button onclick="navigationManager.proceedToCheckout()" class="checkout-btn">تسویه</button>
            <button onclick="basketManager.clearBasket()" class="clear-btn">پاک کردن</button>
          </div>
        </div>
      `;
    } catch (error) {
      console.error("Error loading products for cart:", error);
      shopElements.cartItems.innerHTML = `<div class="cart-error">خطا در بارگذاری</div>`;
    }
  },

  // Setup event listeners
  setupEventListeners() {
    shopElements.cartIcon?.addEventListener("click", () => {
      this.isOpen() ? this.close() : this.open();
    });

    shopElements.closeCart?.addEventListener("click", () => {
      this.close();
    });

    shopElements.cartModal?.addEventListener("click", (e) => {
      if (e.target === shopElements.cartModal) {
        this.close();
      }
    });
  },
};

// Navigation Manager Module
const navigationManager = {
  // Navigate to product detail page
  viewProductDetails(productId) {
    window.location.href = `/product/${productId}`;
  },

  // Proceed to checkout
  proceedToCheckout() {
    const totalItems = basketService.getBasketItemCount(shopState.currentBasket);

    if (totalItems === 0) {
      basketService.showNotification("سبد خالی است", "warning");
      return;
    }

    window.location.href = "/basket";
  },

  // Navigate to profile
  goToProfile() {
    window.location.href = "/profile";
  },

  // Logout
  async logout() {
    await authService.logOut();
  },
};

// Product Rendering Module
const productRenderer = {
  // Render grouped products
  renderGroupedProducts(groupedData) {
    if (!shopElements.productContainer) {
      console.error("Product container not found");
      return;
    }

    shopElements.productContainer.innerHTML = "";

    try {
      for (const categoryName in groupedData) {
        console.log("Rendering category:", categoryName);

        const categoryTitleElement = document.createElement("h2");
        categoryTitleElement.textContent = categoryName;
        categoryTitleElement.className = "category-title";
        shopElements.productContainer.appendChild(categoryTitleElement);

        const subCategories = groupedData[categoryName].subCategories;

        for (const subCategoryName in subCategories) {
          console.log("Rendering subcategory:", subCategoryName);

          const subCategoryTitleElement = document.createElement("h3");
          subCategoryTitleElement.textContent = subCategoryName;
          subCategoryTitleElement.className = "subcategory-title";
          shopElements.productContainer.appendChild(subCategoryTitleElement);

          const productGridElement = document.createElement("div");
          productGridElement.className = "product-grid";

          const products = subCategories[subCategoryName].products;

          products.forEach((product) => {
            const productCard = this.createProductCard(product);
            productGridElement.appendChild(productCard);
          });

          shopElements.productContainer.appendChild(productGridElement);
        }
      }
      console.log("Products rendered successfully");
    } catch (error) {
      console.error("Error in renderGroupedProducts:", error);
      shopElements.productContainer.innerHTML = `
        <div class="error-container">
          <h2>خطا در نمایش محصولات</h2>
          <p>مشکل: ${error.message}</p>
          <button onclick="window.location.reload()" class="retry-btn">تلاش مجدد</button>
        </div>
      `;
    }
  },

  // Create product card
  createProductCard(product) {
    const quantity = basketService.getProductQuantity(
      product._id,
      shopState.currentBasket
    );
    const imagePath = imageService.getImagePath(product.thumbnail, "product");

    const productCard = document.createElement("div");
    productCard.setAttribute("data-product-id", product._id);
    productCard.className = "product-card";

    productCard.innerHTML = `
      <div class="product-image-container">
        <img 
          src="${imagePath}" 
          alt="${product.name}" 
          onerror="handleImageError(this, 'product')"
          class="product-image"
        />
      </div>

      <div class="product-info">
        <div class="product-details">
          <div class="product-name">${product.name}</div>
          <div class="product-brand">برند: ${product.brand}</div>
          <div class="product-price">${product.price.toLocaleString()} تومان</div>
        </div>
        
        <div class="product-bottom">
          <button onclick="navigationManager.viewProductDetails('${product._id}')" 
                  class="details-btn">مشاهده جزئیات</button>
          
          <div class="product-actions">
            ${
              quantity > 0
                ? `
              <div class="quantity-controls">
                <button onclick="basketManager.changeQuantity('${product._id}', ${
                    quantity - 1
                  })" 
                        class="quantity-btn">-</button>
                <span class="quantity-display">${quantity}</span>
                <button onclick="basketManager.changeQuantity('${product._id}', ${
                    quantity + 1
                  })" 
                        class="quantity-btn">+</button>
              </div>
              `
                : `<button onclick="basketManager.addToCart('${product._id}')" 
                      class="buy-btn">خرید</button>`
            }
          </div>
        </div>
      </div>
    `;

    return productCard;
  },

  // Render categories for navigation
  async renderCategories() {
    if (!shopElements.productContainer) return;

    shopElements.productContainer.innerHTML =
      "<div class='loading'>در حال بارگذاری...</div>";

    try {
      const products = await getProducts();
      shopState.grouped = groupProducts(products);

      shopElements.productContainer.innerHTML = "";

      for (const category in shopState.grouped) {
        const imagePath = imageService.getImagePath(
          shopState.grouped[category].icon,
          "category"
        );

        const categoryCard = document.createElement("div");
        categoryCard.className = "category-card";

        categoryCard.innerHTML = `
          <img src="${imagePath}" 
               alt="${category}" 
               onerror="handleImageError(this, 'category')" 
               class="category-image" />
          <div class="category-name">${category}</div>
        `;

        categoryCard.addEventListener("click", () => this.showSubCategories(category));
        shopElements.productContainer.appendChild(categoryCard);
      }
    } catch (error) {
      console.error("Error loading categories:", error);
      basketService.showNotification("خطا در بارگذاری دسته‌بندی‌ها", "error");
    }
  },

  // Show subcategories
  showSubCategories(category) {
    if (!shopElements.productContainer) return;

    shopElements.productContainer.innerHTML = "";

    if (!shopState.grouped[category] || !shopState.grouped[category].subCategories) {
      basketService.showNotification("دسته‌بندی یافت نشد", "error");
      return;
    }

    const subCategories = shopState.grouped[category].subCategories;

    for (const sub in subCategories) {
      const imagePath = imageService.getImagePath(subCategories[sub].icon, "subcategory");

      const subCategoryCard = document.createElement("div");
      subCategoryCard.className = "subcategory-card";

      subCategoryCard.innerHTML = `
        <img src="${imagePath}" 
             alt="${sub}" 
             onerror="handleImageError(this, 'subcategory')" 
             class="subcategory-image" />
        <div class="subcategory-name">${sub}</div>
      `;

      subCategoryCard.addEventListener("click", () =>
        this.showProducts(subCategories[sub].products, category)
      );
      shopElements.productContainer.appendChild(subCategoryCard);
    }

    const backBtn = document.createElement("button");
    backBtn.textContent = "⬅ بازگشت به دسته‌بندی‌ها";
    backBtn.className = "back-btn";
    backBtn.addEventListener("click", () => this.renderCategories());
    shopElements.productContainer.appendChild(backBtn);
  },

  // Show products in a subcategory
  showProducts(products, categoryName) {
    if (!shopElements.productContainer) return;

    shopElements.productContainer.innerHTML = "";

    if (!products || products.length === 0) {
      shopElements.productContainer.innerHTML = `
        <div class="no-products">
          <p>محصولی در این دسته یافت نشد</p>
        </div>
      `;
      return;
    }

    const productGrid = document.createElement("div");
    productGrid.className = "product-grid";

    products.forEach((product) => {
      const productCard = this.createProductCard(product);
      productGrid.appendChild(productCard);
    });

    shopElements.productContainer.appendChild(productGrid);

    const backBtn = document.createElement("button");
    backBtn.textContent = "⬅ بازگشت به زیردسته‌ها";
    backBtn.className = "back-btn";
    backBtn.addEventListener("click", () => this.showSubCategories(categoryName));
    shopElements.productContainer.appendChild(backBtn);
  },
};

// UI Controller Module
const uiController = {
  // Setup sidebar functionality
  setupSidebar() {
    shopElements.btn?.addEventListener("click", () => {
      shopElements.sidebar?.classList.toggle("active");
    });

    shopElements.searchBtn?.addEventListener("click", () => {
      shopElements.sidebar?.classList.toggle("active");
    });
  },

  // Setup navigation event listeners
  setupNavigation() {
    shopElements.logOutBtn?.addEventListener("click", navigationManager.logout);
    shopElements.userIcon?.addEventListener("click", navigationManager.goToProfile);

    // Category navigation
    const categoryIcon = document.querySelector(".bx-grid-alt");
    categoryIcon?.addEventListener("click", () => productRenderer.renderCategories());
  },

  // Setup all event listeners
  setupEventListeners() {
    this.setupSidebar();
    this.setupNavigation();
    cartModalManager.setupEventListeners();
  },
};

// Main App Controller
const shopApp = {
  // Initialize the application
  async init() {
    console.log("Initializing shop application...");

    try {
      // Initialize DOM elements
      initializeElements();

      // Setup UI event listeners
      uiController.setupEventListeners();

      // Check authentication
      const isAuthenticated = await authService.checkAuth();
      if (!isAuthenticated) {
        console.warn("User not authenticated");
        basketService.showNotification("لطفا ابتدا وارد شوید", "warning");
        setTimeout(() => {
          window.location.href = "/login";
        }, 2000);
        return;
      }

      // Load products and render
      console.log("Loading products...");
      const products = await getProducts();
      console.log("Products loaded:", products.length);

      shopState.grouped = groupProducts(products);
      console.log("Grouped products:", Object.keys(shopState.grouped));

      productRenderer.renderGroupedProducts(shopState.grouped);

      // Load basket
      console.log("Loading basket...");
      await basketManager.loadBasket();

      console.log("Shop initialized successfully");
      basketService.showNotification("فروشگاه بارگذاری شد", "success");
    } catch (error) {
      console.error("Error initializing shop:", error);
      basketService.showNotification("خطا در بارگذاری فروشگاه", "error");

      if (shopElements.productContainer) {
        shopElements.productContainer.innerHTML = `
          <div class="error-container">
            <h2>خطا در بارگذاری</h2>
            <p>مشکل: ${error.message}</p>
            <p>لطفا صفحه را مجددا بارگذاری کنید</p>
            <button onclick="window.location.reload()" class="retry-btn">تلاش مجدد</button>
          </div>
        `;
      }
    }
  },

  // Refresh basket data
  async refreshBasket() {
    try {
      await basketManager.loadBasket();
      basketService.showNotification("سبد به‌روزرسانی شد", "success");
    } catch (error) {
      console.error("Error refreshing basket:", error);
      basketService.showNotification("خطا در به‌روزرسانی سبد", "error");
    }
  },
};

// Make functions globally available for onclick handlers
window.basketManager = basketManager;
window.navigationManager = navigationManager;
window.cartModalManager = cartModalManager;
window.productRenderer = productRenderer;
window.shopApp = shopApp;

// Backward compatibility - global functions
window.addToCart = basketManager.addToCart.bind(basketManager);
window.changeQuantity = basketManager.changeQuantity.bind(basketManager);
window.removeFromCart = basketManager.removeFromCart.bind(basketManager);
window.clearBasket = basketManager.clearBasket.bind(basketManager);
window.proceedToCheckout = navigationManager.proceedToCheckout.bind(navigationManager);
window.viewProductDetails = navigationManager.viewProductDetails.bind(navigationManager);

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", shopApp.init);

// Export modules for external use
export {
  shopState,
  basketManager,
  cartModalManager,
  navigationManager,
  productRenderer,
  uiController,
  shopApp,
};
