// shop.js - Fixed version with proper + button functionality and compact basket
import { getProducts, groupProducts, logOut } from "./shop-services.js";

// Global variables
let grouped = {};

// Enhanced image error handling - MOVED TO TOP
function handleImageError(img, type = "product") {
  const defaultImages = {
    product: "/images/models-images/product-images/default-thumbnail.jpeg",
    category: "/images/models-images/category-images/default-category-icon.jpeg",
    subcategory: "/images/models-images/subCategory-images/default-sub-icon.jpeg",
  };

  if (img.src !== defaultImages[type]) {
    img.src = defaultImages[type];
  } else {
    // If even the default image fails, use a data URL placeholder
    img.src =
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23f0f0f0'/%3E%3Ctext x='50' y='50' text-anchor='middle' dy='.3em' fill='%23999' font-family='Arial' font-size='12'%3ENo Image%3C/text%3E%3C/svg%3E";
  }
}

// Make handleImageError globally available immediately
window.handleImageError = handleImageError;

// LocalStorage helper functions
function getLocalBasket() {
  try {
    const basket = localStorage.getItem("userBasket");
    return basket ? JSON.parse(basket) : {};
  } catch (error) {
    console.error("Error reading local basket:", error);
    return {};
  }
}

function setLocalBasket(basket) {
  try {
    localStorage.setItem("userBasket", JSON.stringify(basket));
  } catch (error) {
    console.error("Error saving local basket:", error);
  }
}

function getLocalQuantity(productId) {
  const localBasket = getLocalBasket();
  return localBasket[productId] || 0;
}

function setLocalQuantity(productId, quantity) {
  const localBasket = getLocalBasket();
  if (quantity > 0) {
    localBasket[productId] = quantity;
  } else {
    delete localBasket[productId];
  }
  setLocalBasket(localBasket);
}

// Helper function to get correct image path with fallback
function getImagePath(imageName, type = "product") {
  const basePaths = {
    product: "/images/models-images/product-images/",
    category: "/images/models-images/category-images/",
    subcategory: "/images/models-images/subCategory-images/",
  };

  const defaultImages = {
    product: "default-thumbnail.jpeg",
    category: "default-category-icon.jpeg",
    subcategory: "default-sub-icon.jpeg",
  };

  return {
    src: basePaths[type] + imageName,
    fallback: basePaths[type] + defaultImages[type],
  };
}

// DOM Ready
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.querySelector("#btn");
  const sidebar = document.querySelector(".sidebar");
  const searchBtn = document.querySelector(".bx-search");

  btn?.addEventListener("click", () => sidebar.classList.toggle("active"));
  searchBtn?.addEventListener("click", () => sidebar.classList.toggle("active"));

  document.getElementById("log_out-btn")?.addEventListener("click", logOut);
  document.getElementById("user-icon")?.addEventListener("click", () => {
    window.location.href = "http://127.0.0.1:8000/profile";
  });

  // Initialize cart
  updateCartIcon();
  setupCartModal();
});

// Set up cart modal
function setupCartModal() {
  const cartIcon = document.getElementById("cart-icon");
  const cartModal = document.getElementById("cart-modal");
  const closeCart = document.getElementById("close-cart");

  cartIcon?.addEventListener("click", () => {
    cartModal?.classList.toggle("show");
    if (cartModal?.classList.contains("show")) {
      renderCart();
    }
  });

  closeCart?.addEventListener("click", () => {
    cartModal?.classList.remove("show");
  });

  // Close modal when clicking outside
  cartModal?.addEventListener("click", (e) => {
    if (e.target === cartModal) {
      cartModal.classList.remove("show");
    }
  });
}

// Update cart icon with item count
function updateCartIcon() {
  const cartIcon = document.getElementById("cart-icon");
  if (!cartIcon) return;

  const localBasket = getLocalBasket();
  const totalItems = Object.values(localBasket).reduce((sum, qty) => sum + qty, 0);

  // Remove existing badge
  const existingBadge = cartIcon.querySelector(".cart-badge");
  if (existingBadge) {
    existingBadge.remove();
  }

  // Add new badge if there are items
  if (totalItems > 0) {
    const badge = document.createElement("span");
    badge.className = "cart-badge";
    badge.style.cssText = `
      position: absolute;
      top: -6px;
      right: -6px;
      background: #dc3545;
      color: white;
      border-radius: 50%;
      padding: 2px 6px;
      font-size: 10px;
      font-weight: bold;
      min-width: 16px;
      height: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    badge.textContent = totalItems > 99 ? "99+" : totalItems;
    cartIcon.appendChild(badge);
  }
}

// FIXED: Add to cart function
function addToCart(productId) {
  console.log("Adding to cart:", productId);

  const currentQuantity = getLocalQuantity(productId);
  const newQuantity = currentQuantity + 1;

  setLocalQuantity(productId, newQuantity);

  // IMPORTANT: Update ALL product controls immediately
  updateAllProductControlsForProduct(productId);
  updateCartIcon();

  if (isCartModalOpen()) {
    renderCart();
  }

  showNotification("محصول اضافه شد", "success");
}

// FIXED: Change quantity function
function changeQuantity(productId, newQuantity) {
  console.log("Changing quantity:", productId, "to:", newQuantity);

  if (newQuantity <= 0) {
    setLocalQuantity(productId, 0);
  } else {
    setLocalQuantity(productId, newQuantity);
  }

  // IMPORTANT: Update ALL product controls immediately
  updateAllProductControlsForProduct(productId);
  updateCartIcon();

  if (isCartModalOpen()) {
    renderCart();
  }
}

// Remove from cart
function removeFromCart(productId) {
  setLocalQuantity(productId, 0);
  updateAllProductControlsForProduct(productId);
  updateCartIcon();

  if (isCartModalOpen()) {
    renderCart();
  }

  showNotification("محصول حذف شد", "success");
}

// Clear entire basket
function clearBasket() {
  if (confirm("پاک کردن همه محصولات؟")) {
    setLocalBasket({});
    updateAllProductControls();
    updateCartIcon();

    if (isCartModalOpen()) {
      renderCart();
    }

    showNotification("سبد پاک شد", "success");
  }
}

// FIXED: Update product controls for a specific product (finds ALL instances)
function updateAllProductControlsForProduct(productId) {
  const quantity = getLocalQuantity(productId);

  // Find ALL instances of this product on the page
  const productElements = document.querySelectorAll(`[data-product-id='${productId}']`);

  productElements.forEach((element) => {
    const actionsContainer = element.querySelector(".product-actions");
    if (!actionsContainer) return;

    if (quantity > 0) {
      // Show quantity controls
      actionsContainer.innerHTML = `
        <div class="quantity-controls" style="display: flex; align-items: center; gap: 5px; background: #f1f3f4; border-radius: 4px; padding: 2px;">
          <button onclick="changeQuantity('${productId}', ${quantity - 1})" 
                  style="background: white; border: 1px solid #ddd; width: 24px; height: 24px; border-radius: 3px; cursor: pointer; font-size: 12px; color: #333;">-</button>
          <span style="min-width: 20px; text-align: center; font-size: 12px; font-weight: 600;">${quantity}</span>
          <button onclick="changeQuantity('${productId}', ${quantity + 1})" 
                  style="background: white; border: 1px solid #ddd; width: 24px; height: 24px; border-radius: 3px; cursor: pointer; font-size: 12px; color: #333;">+</button>
        </div>
      `;
    } else {
      // Show buy button
      actionsContainer.innerHTML = `
        <button onclick="addToCart('${productId}')" 
                style="background: #4CAF50; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600;">خرید</button>
      `;
    }
  });
}

// Update all product controls on page load
function updateAllProductControls() {
  const localBasket = getLocalBasket();

  Object.keys(localBasket).forEach((productId) => {
    updateAllProductControlsForProduct(productId);
  });

  // Also reset products not in basket
  const allProductElements = document.querySelectorAll("[data-product-id]");
  allProductElements.forEach((element) => {
    const productId = element.dataset.productId;
    if (!localBasket[productId]) {
      updateAllProductControlsForProduct(productId);
    }
  });
}

// Check if cart modal is open
function isCartModalOpen() {
  const cartModal = document.getElementById("cart-modal");
  return cartModal && cartModal.classList.contains("show");
}

// COMPACT: Render cart modal with smaller design
async function renderCart() {
  const cartItemsDiv = document.getElementById("cart-items");
  const cartTotalDiv = document.getElementById("cart-total");

  if (!cartItemsDiv || !cartTotalDiv) return;

  cartItemsDiv.innerHTML = "";

  const localBasket = getLocalBasket();
  const productIds = Object.keys(localBasket);

  if (productIds.length === 0) {
    cartItemsDiv.innerHTML = `
      <div style="text-align: center; padding: 20px; color: #666;">
        <div style="font-size: 2rem; margin-bottom: 5px;">🛒</div>
        <div style="font-size: 14px;">سبد خالی است</div>
      </div>
    `;
    cartTotalDiv.innerHTML = `
      <div style="padding: 15px; text-align: center; border-top: 1px solid #eee; background: #f9f9f9;">
        <div style="font-size: 16px; font-weight: bold;">۰ تومان</div>
      </div>
    `;
    return;
  }

  let totalAmount = 0;

  try {
    const products = await getProducts();

    productIds.forEach((productId) => {
      const quantity = localBasket[productId];
      const product = products.find((p) => p._id === productId);

      if (product && quantity > 0) {
        const itemTotal = product.price * quantity;
        totalAmount += itemTotal;

        const cartItem = document.createElement("div");
        cartItem.style.cssText = `
          display: flex;
          align-items: center;
          padding: 8px;
          margin-bottom: 5px;
          background: white;
          border-radius: 6px;
          border: 1px solid #eee;
        `;

        const imagePaths = getImagePath(product.thumbnail, "product");

        cartItem.innerHTML = `
          <img src="${imagePaths.src}" 
               alt="${product.name}" 
               onerror="this.onerror=null; this.src='${imagePaths.fallback}';" 
               style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px; margin-left: 8px;" />
          
          <div style="flex: 1; min-width: 0;">
            <div style="font-size: 13px; font-weight: 600; color: #333; margin-bottom: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${product.name}
            </div>
            <div style="font-size: 11px; color: #666;">
              ${product.price.toLocaleString()} تومان
            </div>
          </div>
          
          <div style="display: flex; align-items: center; gap: 6px;">
            <div style="display: flex; align-items: center; gap: 3px; background: #f1f3f4; border-radius: 4px; padding: 2px;">
              <button onclick="changeQuantity('${productId}', ${quantity - 1})" 
                      style="background: white; border: 1px solid #ddd; width: 20px; height: 20px; border-radius: 3px; cursor: pointer; font-size: 10px;">-</button>
              <span style="min-width: 15px; text-align: center; font-size: 11px; font-weight: 600;">${quantity}</span>
              <button onclick="changeQuantity('${productId}', ${quantity + 1})" 
                      style="background: white; border: 1px solid #ddd; width: 20px; height: 20px; border-radius: 3px; cursor: pointer; font-size: 10px;">+</button>
            </div>
            <div style="font-size: 12px; font-weight: 600; color: #4CAF50; min-width: 50px; text-align: right;">
              ${itemTotal.toLocaleString()}
            </div>
          </div>
        `;

        cartItemsDiv.appendChild(cartItem);
      }
    });
  } catch (error) {
    console.error("Error loading products for cart:", error);
    cartItemsDiv.innerHTML = `
      <div style="text-align: center; padding: 20px; color: #f44336; font-size: 12px;">
        خطا در بارگذاری
      </div>
    `;
  }

  // Compact total section
  cartTotalDiv.innerHTML = `
    <div style="padding: 12px; border-top: 1px solid #eee; background: #f9f9f9;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 12px;">
        <span>تعداد:</span>
        <span>${Object.values(localBasket).reduce((sum, qty) => sum + qty, 0)} عدد</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; font-weight: bold;">
        <span>جمع:</span>
        <span style="color: #4CAF50;">${totalAmount.toLocaleString()} تومان</span>
      </div>
      
      <div style="display: flex; gap: 6px;">
        <button onclick="proceedToCheckout()" 
                style="background: #4CAF50; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; flex: 1;">
          تسویه
        </button>
        <button onclick="clearBasket()" 
                style="background: #999; color: white; border: none; padding: 8px 10px; border-radius: 4px; cursor: pointer; font-size: 11px;">
          پاک
        </button>
      </div>
    </div>
  `;
}

// Proceed to checkout
function proceedToCheckout() {
  const localBasket = getLocalBasket();
  const totalItems = Object.values(localBasket).reduce((sum, qty) => sum + qty, 0);

  if (totalItems === 0) {
    showNotification("سبد خالی است", "warning");
    return;
  }

  window.location.href = "/checkout";
}

// Compact notification
function showNotification(message, type = "info") {
  const existingNotifications = document.querySelectorAll(".notification");
  existingNotifications.forEach((notification) => notification.remove());

  const notification = document.createElement("div");
  notification.textContent = message;

  notification.style.cssText = `
    position: fixed;
    top: 15px;
    right: 15px;
    padding: 8px 12px;
    border-radius: 4px;
    color: white;
    font-size: 12px;
    font-weight: 600;
    z-index: 10000;
    transform: translateX(100%);
    transition: transform 0.3s ease;
    background: ${
      type === "success"
        ? "#4CAF50"
        : type === "error"
        ? "#f44336"
        : type === "warning"
        ? "#ff9800"
        : "#2196F3"
    };
  `;

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
  }, 2000);
}

// Make functions globally available
window.addToCart = addToCart;
window.changeQuantity = changeQuantity;
window.removeFromCart = removeFromCart;
window.clearBasket = clearBasket;
window.proceedToCheckout = proceedToCheckout;
// handleImageError is already global from the top

// Product rendering functions
const productContainer = document.getElementById("product-container");
const categoryIcon = document.querySelector(".bx-grid-alt");

const renderGroupedProducts = (groupedData) => {
  productContainer.innerHTML = "";

  for (const category in groupedData) {
    const categoryTitle = document.createElement("h2");
    categoryTitle.textContent = category;
    categoryTitle.style.cssText = `
      color: #333;
      font-size: 1.3rem;
      font-weight: bold;
      margin: 20px 0 15px 0;
      padding-bottom: 8px;
      border-bottom: 2px solid #007bff;
      text-align: right;
    `;
    productContainer.appendChild(categoryTitle);

    const subCategories = groupedData[category].subCategories;
    for (const sub in subCategories) {
      const subCategoryTitle = document.createElement("h3");
      subCategoryTitle.textContent = sub;
      subCategoryTitle.style.cssText = `
        color: #666;
        font-size: 1.1rem;
        font-weight: 600;
        margin: 15px 0 10px 0;
        text-align: right;
      `;
      productContainer.appendChild(subCategoryTitle);

      const productGrid = document.createElement("div");
      productGrid.style.cssText = `
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 15px;
        padding: 15px 0;
      `;

      subCategories[sub].products.forEach((product) => {
        const quantity = getLocalQuantity(product._id);
        const imagePaths = getImagePath(product.thumbnail, "product");

        const card = document.createElement("div");
        card.setAttribute("data-product-id", product._id); // IMPORTANT: Add data attribute
        card.style.cssText = `
          display: flex;
          border-radius: 6px;
          overflow: hidden;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
          background: white;
          border: 1px solid #e9ecef;
          transition: transform 0.2s;
        `;

        card.innerHTML = `
          <div style="flex-shrink: 0;">
            <img 
              src="${imagePaths.src}" 
              alt="${product.name}" 
              onerror="handleImageError(this, 'product')"
              style="width: 100px; height: 100px; object-fit: cover; display: block;"
            />
          </div>

          <div style="display: flex; flex-direction: column; justify-content: space-between; flex: 1; padding: 12px;">
            <div style="flex: 1; margin-bottom: 8px;">
              <div style="font-weight: 600; color: #333; margin-bottom: 6px; font-size: 14px; line-height: 1.3;">${
                product.name
              }</div>
              <div style="color: #4CAF50; font-size: 13px; font-weight: 600;">${product.price.toLocaleString()} تومان</div>
            </div>
            <div class="product-actions" style="margin-top: auto;">
              ${
                quantity > 0
                  ? `
                <div class="quantity-controls" style="display: flex; align-items: center; gap: 5px; background: #f1f3f4; border-radius: 4px; padding: 2px;">
                  <button onclick="changeQuantity('${product._id}', ${quantity - 1})" 
                          style="background: white; border: 1px solid #ddd; width: 24px; height: 24px; border-radius: 3px; cursor: pointer; font-size: 12px; color: #333;">-</button>
                  <span style="min-width: 20px; text-align: center; font-size: 12px; font-weight: 600;">${quantity}</span>
                  <button onclick="changeQuantity('${product._id}', ${quantity + 1})" 
                          style="background: white; border: 1px solid #ddd; width: 24px; height: 24px; border-radius: 3px; cursor: pointer; font-size: 12px; color: #333;">+</button>
                </div>
                `
                  : `<button onclick="addToCart('${product._id}')" 
                            style="background: #4CAF50; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600;">خرید</button>`
              }
            </div>
          </div>
        `;

        card.addEventListener("mouseenter", () => {
          card.style.transform = "translateY(-2px)";
        });

        card.addEventListener("mouseleave", () => {
          card.style.transform = "translateY(0)";
        });

        productGrid.appendChild(card);
      });

      productContainer.appendChild(productGrid);
    }
  }
};

categoryIcon?.addEventListener("click", async () => {
  productContainer.innerHTML = "";
  const products = await getProducts();
  grouped = groupProducts(products);

  for (const category in grouped) {
    const imagePaths = getImagePath(grouped[category].icon, "category");

    const btn = document.createElement("div");
    btn.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 15px;
      margin: 8px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      cursor: pointer;
      transition: all 0.2s;
      border: 1px solid #e9ecef;
    `;

    btn.innerHTML = `
      <img src="${imagePaths.src}" 
           alt="${category}" 
           onerror="handleImageError(this, 'category')" 
           style="width: 60px; height: 60px; object-fit: cover; border-radius: 50%; margin-bottom: 8px;" />
      <div style="font-weight: 600; color: #333; text-align: center; font-size: 13px;">${category}</div>
    `;

    btn.addEventListener("mouseenter", () => {
      btn.style.transform = "translateY(-3px)";
      btn.style.boxShadow = "0 4px 15px rgba(0, 0, 0, 0.15)";
    });

    btn.addEventListener("mouseleave", () => {
      btn.style.transform = "translateY(0)";
      btn.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.1)";
    });

    btn.addEventListener("click", () => showSubCategories(category));
    productContainer.appendChild(btn);
  }
});

function showSubCategories(category) {
  productContainer.innerHTML = "";
  const subCategories = grouped[category].subCategories;

  for (const sub in subCategories) {
    const imagePaths = getImagePath(subCategories[sub].icon, "subcategory");

    const btn = document.createElement("div");
    btn.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 15px;
      margin: 8px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      cursor: pointer;
      transition: all 0.2s;
      border: 1px solid #e9ecef;
    `;

    btn.innerHTML = `
      <img src="${imagePaths.src}" 
           alt="${sub}" 
           onerror="handleImageError(this, 'subcategory')" 
           style="width: 50px; height: 50px; object-fit: cover; border-radius: 50%; margin-bottom: 8px;" />
      <div style="font-weight: 600; color: #333; text-align: center; font-size: 12px;">${sub}</div>
    `;

    btn.addEventListener("click", () =>
      showProducts(subCategories[sub].products, category)
    );
    productContainer.appendChild(btn);
  }

  const backBtn = document.createElement("button");
  backBtn.textContent = "⬅ بازگشت";
  backBtn.style.cssText = `
    background: #6c757d;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 12px;
    margin: 15px;
  `;
  backBtn.addEventListener("click", () => categoryIcon.click());
  productContainer.appendChild(backBtn);
}

function showProducts(products, categoryName) {
  productContainer.innerHTML = "";

  products.forEach((product) => {
    const quantity = getLocalQuantity(product._id);
    const imagePaths = getImagePath(product.thumbnail, "product");

    const card = document.createElement("div");
    card.setAttribute("data-product-id", product._id); // IMPORTANT: Add data attribute
    card.style.cssText = `
      display: flex;
      border-radius: 6px;
      overflow: hidden;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
      background: white;
      border: 1px solid #e9ecef;
      margin-bottom: 10px;
      transition: transform 0.2s;
    `;

    card.innerHTML = `
      <div style="flex-shrink: 0;">
        <img 
          src="${imagePaths.src}" 
          alt="${product.name}" 
          onerror="handleImageError(this, 'product')"
          style="width: 100px; height: 100px; object-fit: cover; display: block;"
        />
      </div>

      <div style="display: flex; flex-direction: column; justify-content: space-between; flex: 1; padding: 12px;">
        <div style="flex: 1; margin-bottom: 8px;">
          <div style="font-weight: 600; color: #333; margin-bottom: 6px; font-size: 14px; line-height: 1.3;">${
            product.name
          }</div>
          <div style="color: #4CAF50; font-size: 13px; font-weight: 600;">${product.price.toLocaleString()} تومان</div>
        </div>
        <div class="product-actions" style="margin-top: auto;">
          ${
            quantity > 0
              ? ` 
            <div class="quantity-controls" style="display: flex; align-items: center; gap: 5px; background: #f1f3f4; border-radius: 4px; padding: 2px;">
              <button onclick="changeQuantity('${product._id}', ${quantity - 1})" 
                      style="background: white; border: 1px solid #ddd; width: 24px; height: 24px; border-radius: 3px; cursor: pointer; font-size: 12px; color: #333;">-</button>
              <span style="min-width: 20px; text-align: center; font-size: 12px; font-weight: 600;">${quantity}</span>
              <button onclick="changeQuantity('${product._id}', ${quantity + 1})" 
                      style="background: white; border: 1px solid #ddd; width: 24px; height: 24px; border-radius: 3px; cursor: pointer; font-size: 12px; color: #333;">+</button>
            </div>
            `
              : `<button onclick="addToCart('${product._id}')" 
                        style="background: #4CAF50; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600;">خرید</button>`
          }
        </div>
      </div>
      `;

    productContainer.appendChild(card);
  });

  const backBtn = document.createElement("button");
  backBtn.textContent = "⬅ بازگشت";
  backBtn.style.cssText = `
    background: #6c757d;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 12px;
    margin: 15px;
  `;
  backBtn.addEventListener("click", () => {
    showSubCategories(categoryName);
  });
  productContainer.appendChild(backBtn);
}

// Initialize the page
(async () => {
  try {
    const products = await getProducts();
    grouped = groupProducts(products);
    renderGroupedProducts(grouped);

    // Update cart icon and controls on initial load
    updateCartIcon();
    updateAllProductControls();
  } catch (error) {
    console.error("Error initializing shop:", error);
    showNotification("خطا در بارگذاری", "error");
  }
})();
