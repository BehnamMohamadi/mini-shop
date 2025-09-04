// javascript/order-history.js - Complete order history functionality

import { basketService, authService, imageService } from "./shop/shop-services.js";

console.log("Order History JS loaded");

// Global state
let orderHistory = [];

// Initialize page
document.addEventListener("DOMContentLoaded", async () => {
  console.log("DEBUG: Initializing order history page");

  try {
    // Check authentication
    const isAuthenticated = await authService.checkAuth();
    if (!isAuthenticated) {
      showNotification("لطفا ابتدا وارد شوید", "warning");
      setTimeout(() => (window.location.href = "/login"), 2000);
      return;
    }

    // Load order history
    await loadOrderHistory();

    console.log("DEBUG: Order history page initialized successfully");
  } catch (error) {
    console.error("DEBUG: Error initializing order history page:", error);
    showNotification("خطا در بارگذاری صفحه", "error");
  }
});

// Load order history
async function loadOrderHistory() {
  try {
    console.log("DEBUG: Loading order history...");

    orderHistory = await basketService.getBasketHistory();
    console.log("DEBUG: Order history loaded with", orderHistory.length, "orders");

    renderOrderHistory();
  } catch (error) {
    console.error("DEBUG: Error loading order history:", error);
    showErrorState("خطا در بارگذاری تاریخچه سفارشات");
  }
}

// Render order history content
function renderOrderHistory() {
  const contentElement = document.getElementById("order-history-content");

  if (orderHistory.length === 0) {
    // Show empty state
    contentElement.innerHTML = `
      <div class="empty-orders">
        <div class="empty-orders-icon">📋</div>
        <h3>هیچ سفارش تکمیل شده‌ای ندارید</h3>
        <p>سفارشات تکمیل شده شما در اینجا نمایش داده خواهد شد</p>
        <button onclick="goBackToShop()" class="start-shopping-btn">
          <i class='bx bx-shopping-bag'></i>
          شروع خرید
        </button>
      </div>
    `;
    return;
  }

  // Render order history items
  const ordersHtml = orderHistory
    .map((order, index) => {
      const orderDate = new Date(order.completedAt || order.createdAt).toLocaleDateString(
        "fa-IR",
        {
          year: "numeric",
          month: "long",
          day: "numeric",
        }
      );

      const orderTime = new Date(order.completedAt || order.createdAt).toLocaleTimeString(
        "fa-IR",
        {
          hour: "2-digit",
          minute: "2-digit",
        }
      );

      return `
      <div class="order-item" data-order-id="${order._id}">
        <div class="order-header">
          <div class="order-info">
            <h3>سفارش #${index + 1}</h3>
            <div class="order-date">
              <i class='bx bx-calendar'></i>
              ${orderDate} - ${orderTime}
            </div>
          </div>
          <div class="order-summary">
            <div class="order-status completed">
              <i class='bx bx-check-circle'></i>
              تکمیل شده
            </div>
            <div class="order-total">
              <strong>${order.totalPrice.toLocaleString()} تومان</strong>
            </div>
          </div>
        </div>

        <div class="order-details">
          <div class="order-stats">
            <div class="stat-item">
              <i class='bx bx-package'></i>
              <span>${order.totalItems} محصول</span>
            </div>
            <div class="stat-item">
              <i class='bx bx-time-five'></i>
              <span>تکمیل شده</span>
            </div>
          </div>

          <div class="order-products">
            ${order.products
              .map((item) => {
                const product = item.product;
                const imagePath = imageService.getImagePath(product.thumbnail, "product");

                return `
                <div class="order-product-item">
                  <img src="${imagePath}" 
                       alt="${product.name}" 
                       class="order-product-image"
                       onerror="handleImageError(this, 'product')" />
                  <div class="order-product-info">
                    <div class="order-product-name">${product.name}</div>
                    <div class="order-product-details">
                      <span class="order-product-brand">برند: ${product.brand}</span>
                      <span class="order-product-quantity">تعداد: ${item.count}</span>
                      <span class="order-product-price">${(
                        product.price * item.count
                      ).toLocaleString()} تومان</span>
                    </div>
                  </div>
                  <div class="order-product-actions">
                    <button onclick="reorderProduct('${product._id}')" 
                            class="reorder-btn" 
                            title="سفارش مجدد">
                      <i class='bx bx-refresh'></i>
                    </button>
                    <button onclick="viewProductFromOrder('${product._id}')" 
                            class="view-product-btn" 
                            title="مشاهده محصول">
                      <i class='bx bx-show'></i>
                    </button>
                  </div>
                </div>
              `;
              })
              .join("")}
          </div>

          <div class="order-actions">
            <button onclick="reorderAll('${order._id}')" class="reorder-all-btn">
              <i class='bx bx-refresh'></i>
              سفارش مجدد همه محصولات
            </button>
          </div>
        </div>
      </div>
    `;
    })
    .join("");

  contentElement.innerHTML = `
    <div class="order-history-content">
      <div class="orders-summary">
        <h2>تاریخچه سفارشات شما</h2>
        <p>مجموع ${orderHistory.length} سفارش تکمیل شده</p>
      </div>
      <div class="orders-list">
        ${ordersHtml}
      </div>
    </div>
  `;
}

// Reorder a single product
window.reorderProduct = async function (productId) {
  console.log("DEBUG: Reordering product:", productId);

  try {
    const result = await basketService.addToBasket(productId, 1);
    console.log("DEBUG: Product reordered successfully");

    showNotification("محصول به سبد خرید اضافه شد", "success");
  } catch (error) {
    console.error("DEBUG: Error reordering product:", error);
    showNotification("خطا در افزودن محصول به سبد", "error");
  }
};

// Reorder all products from an order
window.reorderAll = async function (orderId) {
  console.log("DEBUG: Reordering all products from order:", orderId);

  const order = orderHistory.find((o) => o._id === orderId);
  if (!order) {
    showNotification("سفارش یافت نشد", "error");
    return;
  }

  if (
    !confirm(
      `آیا می‌خواهید همه محصولات این سفارش (${order.products.length} محصول) را مجدداً به سبد اضافه کنید؟`
    )
  ) {
    return;
  }

  try {
    let successCount = 0;
    let failedCount = 0;

    for (const item of order.products) {
      try {
        await basketService.addToBasket(item.product._id, item.count);
        successCount++;
      } catch (error) {
        console.error("DEBUG: Error reordering product:", item.product._id, error);
        failedCount++;
      }
    }

    if (successCount > 0) {
      showNotification(
        `${successCount} محصول به سبد اضافه شد${
          failedCount > 0 ? ` (${failedCount} محصول با خطا مواجه شد)` : ""
        }`,
        "success"
      );
    } else {
      showNotification("هیچ محصولی به سبد اضافه نشد", "error");
    }
  } catch (error) {
    console.error("DEBUG: Error reordering all products:", error);
    showNotification("خطا در افزودن محصولات به سبد", "error");
  }
};

// View product details from order
window.viewProductFromOrder = function (productId) {
  window.location.href = `/product/${productId}`;
};

// Navigation functions
window.goBackToShop = function () {
  window.location.href = "/shop";
};

// Utility functions
function showErrorState(title, message = "") {
  document.getElementById("order-history-content").innerHTML = `
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
  basketService.showNotification(message, type);
}

// Make image error handler globally available
window.handleImageError = imageService.handleImageError;
