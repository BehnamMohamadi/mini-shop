// basket-page.js - Complete Basket Management Logic
import {
  basketService,
  getProducts,
  authService,
  imageService,
} from "./shop/shop-services.js";

console.log("Basket Page JS loaded");

// Global state
let currentBasket = {};
let currentBasketStatus = "open";
let allProducts = [];
let basketHistory = [];

// DOM Elements
const statusBadge = document.getElementById("status-badge");
const totalItems = document.getElementById("total-items");
const totalPrice = document.getElementById("total-price");
const basketItems = document.getElementById("basket-items");
const actionsContent = document.getElementById("actions-content");
const historyContent = document.getElementById("history-content");
const paymentModal = document.getElementById("payment-modal");

// Initialize the page
document.addEventListener("DOMContentLoaded", async () => {
  console.log("Initializing basket page...");

  try {
    // Check authentication
    const isAuthenticated = await authService.checkAuth();
    if (!isAuthenticated) {
      showNotification("لطفا ابتدا وارد شوید", "warning");
      setTimeout(() => (window.location.href = "/login"), 2000);
      return;
    }

    // Load products for reference
    allProducts = await getProducts();

    // Load basket and history
    await loadBasket();
    await loadBasketHistory();

    // Setup event listeners
    setupEventListeners();

    showNotification("صفحه سبد خرید بارگذاری شد", "success");
  } catch (error) {
    console.error("Error initializing basket page:", error);
    showNotification("خطا در بارگذاری صفحه", "error");
  }
});

// Load current basket
async function loadBasket() {
  try {
    console.log("Loading basket...");

    // Get basket summary first
    const summary = await basketService.getBasketSummary();
    currentBasketStatus = summary.basketStatus || "open";

    // Get basket data
    currentBasket = await basketService.getBasket();

    // Update UI
    updateBasketStatus(summary);
    renderBasketItems();
    renderActionButtons();

    console.log("Basket loaded successfully");
  } catch (error) {
    console.error("Error loading basket:", error);
    showNotification("خطا در بارگذاری سبد", "error");
  }
}

// Update basket status display
function updateBasketStatus(summary) {
  const statusText = basketService.getStatusText(currentBasketStatus);
  const statusClass = `status-${currentBasketStatus}`;

  statusBadge.textContent = statusText;
  statusBadge.className = `status-badge ${statusClass}`;

  totalItems.textContent = `${summary.totalItems} عدد`;
  totalPrice.textContent = `${summary.totalPrice.toLocaleString()} تومان`;
}

// Render basket items
function renderBasketItems() {
  const basketInfo = basketService.formatBasketForDisplay(currentBasket);

  if (basketInfo.isEmpty) {
    basketItems.innerHTML = `
      <div class="empty-basket">
        <i class="bx bx-shopping-bag empty-icon"></i>
        <h3>سبد خالی است</h3>
        <p>هیچ محصولی در سبد شما وجود ندارد</p>
        <a href="/shop" class="btn-primary">
          <i class="bx bx-shopping-bag"></i>
          شروع خرید
        </a>
      </div>
    `;
    return;
  }

  let itemsHtml = "";
  basketInfo.items.forEach(({ productId, quantity }) => {
    const product = allProducts.find((p) => p._id === productId);
    if (!product) return;

    const itemTotal = product.price * quantity;
    const imagePath = imageService.getImagePath(product.thumbnail, "product");
    const isDisabled = currentBasketStatus !== "open";

    itemsHtml += `
      <div class="basket-item" data-product-id="${productId}">
        <div class="item-image">
          <img src="${imagePath}" alt="${product.name}" 
               onerror="handleImageError(this, 'product')">
        </div>
        <div class="item-details">
          <h4 class="item-name">${product.name}</h4>
          <p class="item-brand">برند: ${product.brand}</p>
          <p class="item-price">${product.price.toLocaleString()} تومان</p>
        </div>
        <div class="item-controls">
          <div class="quantity-section">
            <label>تعداد:</label>
            <div class="quantity-controls">
              <button class="qty-btn" onclick="changeQuantity('${productId}', ${
      quantity - 1
    })" 
                      ${isDisabled ? "disabled" : ""}>
                <i class="bx bx-minus"></i>
              </button>
              <span class="quantity">${quantity}</span>
              <button class="qty-btn" onclick="changeQuantity('${productId}', ${
      quantity + 1
    })"
                      ${isDisabled ? "disabled" : ""}>
                <i class="bx bx-plus"></i>
              </button>
            </div>
          </div>
          <div class="item-total">
            <strong>${itemTotal.toLocaleString()} تومان</strong>
          </div>
          <button class="remove-btn" onclick="removeFromBasket('${productId}')"
                  ${isDisabled ? "disabled" : ""}>
            <i class="bx bx-trash"></i>
          </button>
        </div>
      </div>
    `;
  });

  basketItems.innerHTML = `<div class="items-list">${itemsHtml}</div>`;
}

// Render action buttons based on status
function renderActionButtons() {
  let buttonsHtml = "";

  switch (currentBasketStatus) {
    case "open":
      buttonsHtml = `
        <div class="action-group">
          <button class="btn-primary" onclick="proceedToPayment()">
            <i class="bx bx-credit-card"></i>
            ادامه فرآیند پرداخت
          </button>
          <button class="btn-warning" onclick="clearBasket()">
            <i class="bx bx-trash"></i>
            پاک کردن سبد
          </button>
        </div>
        <div class="action-group">
          <a href="/shop" class="btn-secondary">
            <i class="bx bx-shopping-bag"></i>
            ادامه خرید
          </a>
        </div>
      `;
      break;

    case "pending":
      buttonsHtml = `
        <div class="pending-message">
          <i class="bx bx-time-five"></i>
          <h4>سبد در انتظار پرداخت</h4>
          <p>سفارش شما در حال پردازش است</p>
        </div>
        <div class="action-group">
          <button class="btn-primary" onclick="completePayment()">
            <i class="bx bx-check-circle"></i>
            تکمیل پرداخت
          </button>
          <button class="btn-secondary" onclick="cancelPayment()">
            <i class="bx bx-x-circle"></i>
            لغو پرداخت
          </button>
        </div>
      `;
      break;

    case "finished":
      buttonsHtml = `
        <div class="finished-message">
          <i class="bx bx-check-circle success"></i>
          <h4>سفارش تکمیل شده</h4>
          <p>سفارش شما با موفقیت ثبت و پردازش شده است</p>
        </div>
        <div class="action-group">
          <a href="/shop" class="btn-primary">
            <i class="bx bx-shopping-bag"></i>
            خرید جدید
          </a>
        </div>
      `;
      break;
  }

  actionsContent.innerHTML = buttonsHtml;
}

// Load basket history
async function loadBasketHistory() {
  try {
    basketHistory = await basketService.getBasketHistory();
    renderBasketHistory();
  } catch (error) {
    console.error("Error loading basket history:", error);
  }
}

// Render basket history
function renderBasketHistory() {
  if (!basketHistory || basketHistory.length === 0) {
    historyContent.innerHTML = `
      <div class="no-history">
        <i class="bx bx-history"></i>
        <p>هیچ سابقه سفارشی یافت نشد</p>
      </div>
    `;
    return;
  }

  let historyHtml = "";
  basketHistory.forEach((basket) => {
    const date = new Date(basket.createdAt).toLocaleDateString("fa-IR");
    const statusText = basketService.getStatusText(basket.status);
    const statusClass = `status-${basket.status}`;

    historyHtml += `
      <div class="history-item">
        <div class="history-header">
          <div class="history-date">${date}</div>
          <div class="history-status ${statusClass}">${statusText}</div>
        </div>
        <div class="history-summary">
          <span>تعداد اقلام: ${basket.totalItems}</span>
          <span>مبلغ: ${basket.totalPrice.toLocaleString()} تومان</span>
        </div>
      </div>
    `;
  });

  historyContent.innerHTML = historyHtml;
}

// Event listeners setup
function setupEventListeners() {
  // Refresh button
  document.getElementById("refresh-btn").addEventListener("click", async () => {
    showNotification("در حال بروزرسانی...", "info");
    await loadBasket();
    await loadBasketHistory();
  });

  // Toggle history
  document.getElementById("toggle-history-btn").addEventListener("click", () => {
    const historySection = historyContent;
    const toggleBtn = document.getElementById("toggle-history-btn");
    const icon = toggleBtn.querySelector("i");

    if (historySection.classList.contains("hidden")) {
      historySection.classList.remove("hidden");
      icon.className = "bx bx-chevron-up";
      toggleBtn.innerHTML = '<i class="bx bx-chevron-up"></i> مخفی کردن سوابق';
    } else {
      historySection.classList.add("hidden");
      icon.className = "bx bx-chevron-down";
      toggleBtn.innerHTML = '<i class="bx bx-chevron-down"></i> نمایش سوابق';
    }
  });

  // Payment modal events
  document
    .getElementById("close-payment-modal")
    .addEventListener("click", closePaymentModal);
  document.getElementById("cancel-payment").addEventListener("click", closePaymentModal);
  document.getElementById("confirm-payment").addEventListener("click", confirmPayment);

  // Close modal on overlay click
  document.querySelector(".modal-overlay").addEventListener("click", closePaymentModal);
}

// Basket operations
window.changeQuantity = async function (productId, newQuantity) {
  if (currentBasketStatus !== "open") {
    showNotification("سبد در حالت فعال نیست", "warning");
    return;
  }

  try {
    currentBasket = await basketService.updateQuantity(productId, newQuantity);
    await loadBasket();
  } catch (error) {
    console.error("Error changing quantity:", error);
    showNotification("خطا در تغییر تعداد", "error");
  }
};

window.removeFromBasket = async function (productId) {
  if (currentBasketStatus !== "open") {
    showNotification("سبد در حالت فعال نیست", "warning");
    return;
  }

  if (!confirm("آیا از حذف این محصول اطمینان دارید؟")) return;

  try {
    currentBasket = await basketService.removeFromBasket(productId);
    await loadBasket();
  } catch (error) {
    console.error("Error removing from basket:", error);
    showNotification("خطا در حذف محصول", "error");
  }
};

window.clearBasket = async function () {
  if (currentBasketStatus !== "open") {
    showNotification("سبد در حالت فعال نیست", "warning");
    return;
  }

  if (!confirm("آیا از پاک کردن تمام محصولات اطمینان دارید؟")) return;

  try {
    currentBasket = await basketService.clearBasket();
    await loadBasket();
  } catch (error) {
    console.error("Error clearing basket:", error);
    showNotification("خطا در پاک کردن سبد", "error");
  }
};

// Payment flow
window.proceedToPayment = function () {
  if (currentBasketStatus !== "open") {
    showNotification("سبد در حالت فعال نیست", "warning");
    return;
  }

  const itemCount = basketService.getBasketItemCount(currentBasket);
  if (itemCount === 0) {
    showNotification("سبد خالی است", "warning");
    return;
  }

  showPaymentModal();
};

function showPaymentModal() {
  // Populate payment summary
  const basketInfo = basketService.formatBasketForDisplay(currentBasket);
  let summaryHtml = "";
  let total = 0;

  basketInfo.items.forEach(({ productId, quantity }) => {
    const product = allProducts.find((p) => p._id === productId);
    if (!product) return;

    const itemTotal = product.price * quantity;
    total += itemTotal;

    summaryHtml += `
      <div class="summary-item">
        <span class="item-name">${product.name}</span>
        <span class="item-qty">× ${quantity}</span>
        <span class="item-price">${itemTotal.toLocaleString()} تومان</span>
      </div>
    `;
  });

  document.getElementById("payment-summary-items").innerHTML = summaryHtml;
  document.getElementById(
    "payment-total"
  ).textContent = `${total.toLocaleString()} تومان`;

  paymentModal.classList.remove("hidden");
}

function closePaymentModal() {
  paymentModal.classList.add("hidden");
}

async function confirmPayment() {
  try {
    showNotification("در حال پردازش پرداخت...", "info");

    // First set status to pending
    await basketService.updateBasketStatus("pending");

    // Simulate payment processing
    setTimeout(async () => {
      try {
        // Complete the payment
        await basketService.updateBasketStatus("finished");

        closePaymentModal();
        showNotification("پرداخت موفقیت‌آمیز بود!", "success");

        // Refresh the page to show new state
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } catch (error) {
        console.error("Error completing payment:", error);
        showNotification("خطا در تکمیل پرداخت", "error");
      }
    }, 2000);
  } catch (error) {
    console.error("Error processing payment:", error);
    showNotification("خطا در پردازش پرداخت", "error");
  }
}

window.completePayment = async function () {
  try {
    showNotification("در حال تکمیل پرداخت...", "info");
    await basketService.updateBasketStatus("finished");

    showNotification("پرداخت تکمیل شد!", "success");
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  } catch (error) {
    console.error("Error completing payment:", error);
    showNotification("خطا در تکمیل پرداخت", "error");
  }
};

window.cancelPayment = async function () {
  if (!confirm("آیا از لغو پرداخت اطمینان دارید؟")) return;

  try {
    await basketService.updateBasketStatus("open");
    showNotification("پرداخت لغو شد", "info");
    await loadBasket();
  } catch (error) {
    console.error("Error cancelling payment:", error);
    showNotification("خطا در لغو پرداخت", "error");
  }
};

// Notification system
function showNotification(message, type = "info") {
  basketService.showNotification(message, type);
}

// Make image error handler globally available
window.handleImageError = imageService.handleImageError;
