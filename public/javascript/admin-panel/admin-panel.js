// admin-panel.js - Complete Fixed Version with Pagination
console.log("Admin Panel Starting - Complete Fixed Version...");

// Global state object with pagination support
const AdminPanel = {
  currentUser: null,
  allCategories: [],
  allSubCategories: [],
  allProducts: [],
  allUsers: [],
  allOrders: [],
  currentTab: "dashboard",

  // Pagination state for each section
  pagination: {
    products: {
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
      itemsPerPage: 10,
      data: [],
    },
    users: {
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
      itemsPerPage: 10,
      data: [],
    },
    orders: {
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
      itemsPerPage: 10,
      data: [],
      statusFilter: "all",
    },
    categories: {
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
      itemsPerPage: 10,
      data: [],
    },
  },
};

// API helper function with proper error handling
async function makeApiCall(url, options = {}) {
  try {
    const response = await fetch(`/api${url}`, {
      credentials: "include",
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("API Error:", error);
    showMessage(error.message || "خطا در اتصال به سرور", "error");
    throw error;
  }
}

// Enhanced API call for file uploads
async function makeApiCallWithFile(url, formData, options = {}) {
  try {
    const response = await fetch(`/api${url}`, {
      method: "POST",
      credentials: "include",
      body: formData,
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("API Error:", error);
    showMessage(error.message || "خطا در آپلود فایل", "error");
    throw error;
  }
}

// Enhanced notification function
function showMessage(message, type = "info") {
  // Remove existing notifications
  const existingNotifications = document.querySelectorAll(".admin-notification");
  existingNotifications.forEach((n) => n.remove());

  const notification = document.createElement("div");
  notification.className = "admin-notification";

  const bgColor =
    {
      success: "#10b981",
      error: "#ef4444",
      warning: "#f59e0b",
      info: "#3b82f6",
    }[type] || "#3b82f6";

  notification.style.cssText = `
    position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
    padding: 15px 25px; border-radius: 8px; z-index: 10000;
    color: white; font-weight: 600; min-width: 300px; text-align: center;
    background: ${bgColor}; box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    opacity: 0; transition: opacity 0.3s ease;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);

  // Animate in
  setTimeout(() => (notification.style.opacity = "1"), 100);

  // Remove after delay
  setTimeout(() => {
    notification.style.opacity = "0";
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 4000);
}

// Generic pagination component
function createPaginationHTML(section) {
  const paginationData = AdminPanel.pagination[section];
  if (!paginationData || paginationData.totalPages <= 1) return "";

  const { currentPage, totalPages, totalItems, itemsPerPage } = paginationData;

  let html = `<div class="pagination-container">`;

  // Info
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);
  html += `<div class="pagination-info">نمایش ${startItem} تا ${endItem} از ${totalItems} مورد</div>`;

  // Pagination buttons
  html += `<div class="pagination-buttons">`;

  // Previous button
  if (currentPage > 1) {
    html += `<button class="pagination-btn" onclick="goToPage('${section}', ${
      currentPage - 1
    })">قبلی</button>`;
  }

  // Page numbers
  const startPage = Math.max(1, currentPage - 2);
  const endPage = Math.min(totalPages, currentPage + 2);

  if (startPage > 1) {
    html += `<button class="pagination-btn" onclick="goToPage('${section}', 1)">1</button>`;
    if (startPage > 2) {
      html += `<span class="pagination-dots">...</span>`;
    }
  }

  for (let i = startPage; i <= endPage; i++) {
    const activeClass = i === currentPage ? "active" : "";
    html += `<button class="pagination-btn ${activeClass}" onclick="goToPage('${section}', ${i})">${i}</button>`;
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      html += `<span class="pagination-dots">...</span>`;
    }
    html += `<button class="pagination-btn" onclick="goToPage('${section}', ${totalPages})">${totalPages}</button>`;
  }

  // Next button
  if (currentPage < totalPages) {
    html += `<button class="pagination-btn" onclick="goToPage('${section}', ${
      currentPage + 1
    })">بعدی</button>`;
  }

  html += `</div></div>`;
  return html;
}

// Generic page navigation function
async function goToPage(section, page) {
  AdminPanel.pagination[section].currentPage = page;

  switch (section) {
    case "products":
      await loadProducts();
      break;
    case "users":
      await loadUsers();
      break;
    case "orders":
      await loadOrders();
      break;
    case "categories":
      await loadCategories();
      break;
  }
}

// Tab management
function switchToTab(tabName) {
  AdminPanel.currentTab = tabName;

  // Update UI
  document.querySelectorAll(".tab-btn").forEach((btn) => btn.classList.remove("active"));
  document.querySelector(`[onclick*="${tabName}"]`)?.classList.add("active");

  document
    .querySelectorAll(".tab-panel")
    .forEach((panel) => panel.classList.remove("active"));
  document.getElementById(`${tabName}-panel`)?.classList.add("active");

  // Reset pagination when switching tabs
  if (AdminPanel.pagination[tabName]) {
    AdminPanel.pagination[tabName].currentPage = 1;
  }

  // Load data
  loadTabContent(tabName);
}

async function loadTabContent(tabName) {
  try {
    switch (tabName) {
      case "dashboard":
        await loadDashboard();
        break;
      case "products":
        await loadProducts();
        break;
      case "categories":
        await loadCategories();
        break;
      case "users":
        await loadUsers();
        break;
      case "orders":
        await loadOrders();
        break;
    }
  } catch (error) {
    console.error(`Error loading ${tabName}:`, error);
  }
}

// Dashboard
async function loadDashboard() {
  const container = document.getElementById("dashboard-content");
  container.innerHTML = '<div class="loading">در حال بارگذاری...</div>';

  try {
    const [products, categories, users, orders] = await Promise.allSettled([
      makeApiCall("/products?limit=1"),
      makeApiCall("/categories?limit=1"),
      makeApiCall("/users?limit=1"),
      makeApiCall("/basket/get-all-baskets?limit=1"),
    ]);

    const stats = {
      products: products.status === "fulfilled" ? products.value.total || 0 : 0,
      categories: categories.status === "fulfilled" ? categories.value.total || 0 : 0,
      users: users.status === "fulfilled" ? users.value.total || 0 : 0,
      orders: orders.status === "fulfilled" ? orders.value.total || 0 : 0,
    };

    container.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card"><h3>محصولات</h3><div class="stat-number">${stats.products}</div></div>
        <div class="stat-card"><h3>دسته‌بندی‌ها</h3><div class="stat-number">${stats.categories}</div></div>
        <div class="stat-card"><h3>کاربران</h3><div class="stat-number">${stats.users}</div></div>
        <div class="stat-card"><h3>سفارشات</h3><div class="stat-number">${stats.orders}</div></div>
      </div>
      <div class="dashboard-actions">
        <button class="btn-primary" onclick="switchToTab('products')">مدیریت محصولات</button>
        <button class="btn-primary" onclick="switchToTab('categories')">مدیریت دسته‌بندی‌ها</button>
        <button class="btn-primary" onclick="switchToTab('users')">مدیریت کاربران</button>
        <button class="btn-primary" onclick="switchToTab('orders')">مدیریت سفارشات</button>
      </div>
    `;
  } catch (error) {
    container.innerHTML = '<div class="error">خطا در بارگذاری آمار</div>';
  }
}

// Products management with client-side pagination
async function loadProducts() {
  const container = document.getElementById("products-table-container");
  container.innerHTML = '<div class="loading">در حال بارگذاری محصولات...</div>';

  const pagination = AdminPanel.pagination.products;

  try {
    // Load all products from API (your API doesn't seem to support server-side pagination)
    const response = await makeApiCall(`/products?limit=1000`);

    // Store all products
    const allProducts = response.data.products || [];

    // Calculate pagination on client side
    pagination.totalItems = allProducts.length;
    pagination.totalPages = Math.ceil(pagination.totalItems / pagination.itemsPerPage);

    // Get products for current page
    const startIndex = (pagination.currentPage - 1) * pagination.itemsPerPage;
    const endIndex = startIndex + pagination.itemsPerPage;
    pagination.data = allProducts.slice(startIndex, endIndex);

    console.log(
      `Showing products ${startIndex + 1} to ${Math.min(
        endIndex,
        pagination.totalItems
      )} of ${pagination.totalItems}`
    );

    if (allProducts.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>محصولی یافت نشد</p>
          <button class="btn-primary" onclick="openProductModal()">افزودن محصول جدید</button>
        </div>
      `;
      return;
    }

    // Store all products for reference
    AdminPanel.allProducts = allProducts;

    renderProductsTable();
  } catch (error) {
    container.innerHTML = '<div class="error">خطا در بارگذاری محصولات</div>';
  }
}

function renderProductsTable() {
  const container = document.getElementById("products-table-container");
  const pagination = AdminPanel.pagination.products;
  const products = pagination.data;

  let html = `
    <div class="table-header">
      <h3>محصولات (${pagination.totalItems})</h3>
      <button class="btn-primary" onclick="openProductModal()">افزودن محصول</button>
    </div>
    <table class="data-table">
      <thead>
        <tr><th>تصویر</th><th>نام</th><th>برند</th><th>دسته‌بندی</th><th>قیمت</th><th>موجودی</th><th>عملیات</th></tr>
      </thead>
      <tbody>
  `;

  products.forEach((product) => {
    const imagePath = `/images/models-images/product-images/${
      product.thumbnail || "default-thumbnail.jpeg"
    }`;
    const categoryName = product.category?.name || "نامشخص";
    const subCategoryName = product.subCategory?.name || "";

    html += `
      <tr>
        <td><img src="${imagePath}" class="product-thumb" onerror="this.src='/images/models-images/product-images/default-thumbnail.jpeg'"></td>
        <td><strong>${product.name}</strong><br><small>${(
      product.description || ""
    ).slice(0, 50)}...</small></td>
        <td>${product.brand}</td>
        <td>${categoryName}${subCategoryName ? ` / ${subCategoryName}` : ""}</td>
        <td>${product.price.toLocaleString("fa-IR")} تومان</td>
        <td>${product.quantity}</td>
        <td>
          <button class="btn btn-edit" onclick="editProductItem('${
            product._id
          }')">ویرایش</button>
          <button class="btn btn-delete" onclick="deleteProductItem('${
            product._id
          }')">حذف</button>
        </td>
      </tr>
    `;
  });

  html += "</tbody></table>";
  html += createPaginationHTML("products");
  container.innerHTML = html;
}

// Users management with client-side pagination
async function loadUsers() {
  const container = document.getElementById("users-table-container");
  container.innerHTML = '<div class="loading">در حال بارگذاری کاربران...</div>';

  const pagination = AdminPanel.pagination.users;

  try {
    // Load all users from API
    const response = await makeApiCall(`/users?limit=1000`);

    // Store all users
    const allUsers = response.data.users || [];

    // Calculate pagination on client side
    pagination.totalItems = allUsers.length;
    pagination.totalPages = Math.ceil(pagination.totalItems / pagination.itemsPerPage);

    // Get users for current page
    const startIndex = (pagination.currentPage - 1) * pagination.itemsPerPage;
    const endIndex = startIndex + pagination.itemsPerPage;
    pagination.data = allUsers.slice(startIndex, endIndex);

    console.log(
      `Showing users ${startIndex + 1} to ${Math.min(
        endIndex,
        pagination.totalItems
      )} of ${pagination.totalItems}`
    );

    if (allUsers.length === 0) {
      container.innerHTML = '<div class="empty-state">کاربری یافت نشد</div>';
      return;
    }

    // Store all users for reference
    AdminPanel.allUsers = allUsers;

    renderUsersTable();
  } catch (error) {
    container.innerHTML = '<div class="error">خطا در بارگذاری کاربران</div>';
  }
}

function renderUsersTable() {
  const container = document.getElementById("users-table-container");
  const pagination = AdminPanel.pagination.users;
  const users = pagination.data;

  let html = `
    <div class="table-header"><h3>کاربران (${pagination.totalItems})</h3></div>
    <table class="data-table">
      <thead>
        <tr><th>تصویر</th><th>نام</th><th>ایمیل</th><th>تلفن</th><th>نقش</th><th>تاریخ عضویت</th><th>عملیات</th></tr>
      </thead>
      <tbody>
  `;

  users.forEach((user) => {
    const profilePath = `/images/profiles/${
      user.profile || "users-default-profile.jpeg"
    }`;
    const fullName = `${user.firstname} ${user.lastname}`;
    const joinDate = new Date(user.createdAt).toLocaleDateString("fa-IR");

    html += `
      <tr>
        <td><img src="${profilePath}" class="user-avatar" onerror="this.src='/images/profiles/users-default-profile.jpeg'"></td>
        <td><strong>${fullName}</strong><br><small>${
      user.address || "آدرس نامشخص"
    }</small></td>
        <td>${user.username}</td>
        <td>${user.phonenumber || "نامشخص"}</td>
        <td><span class="status-badge status-${user.role}">${
      user.role === "admin" ? "مدیر" : "مشتری"
    }</span></td>
        <td>${joinDate}</td>
        <td>
          <button class="btn btn-edit" onclick="editUserRole('${
            user._id
          }')">تغییر نقش</button>
          <button class="btn btn-delete" onclick="deleteUserItem('${
            user._id
          }')">حذف</button>
        </td>
      </tr>
    `;
  });

  html += "</tbody></table>";
  html += createPaginationHTML("users");
  container.innerHTML = html;
}

// Orders management with client-side pagination
async function loadOrders() {
  const container = document.getElementById("orders-table-container");
  container.innerHTML = '<div class="loading">در حال بارگذاری سفارشات...</div>';

  const pagination = AdminPanel.pagination.orders;

  try {
    // Load all orders from API
    const response = await makeApiCall(`/basket/get-all-baskets?limit=1000`);

    // Store all orders
    let allOrders = response.data.baskets || [];

    // Filter by status if needed
    if (pagination.statusFilter !== "all") {
      allOrders = allOrders.filter((order) => order.status === pagination.statusFilter);
    }

    // Calculate pagination on client side
    pagination.totalItems = allOrders.length;
    pagination.totalPages = Math.ceil(pagination.totalItems / pagination.itemsPerPage);

    // Get orders for current page
    const startIndex = (pagination.currentPage - 1) * pagination.itemsPerPage;
    const endIndex = startIndex + pagination.itemsPerPage;
    pagination.data = allOrders.slice(startIndex, endIndex);

    console.log(
      `Showing orders ${startIndex + 1} to ${Math.min(
        endIndex,
        pagination.totalItems
      )} of ${pagination.totalItems}`
    );

    if (allOrders.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="table-header">
            <h3>سفارشات</h3>
            <div class="filter-buttons">
              <button class="filter-btn ${
                pagination.statusFilter === "all" ? "active" : ""
              }" onclick="filterOrdersByStatus('all')">همه</button>
              <button class="filter-btn ${
                pagination.statusFilter === "open" ? "active" : ""
              }" onclick="filterOrdersByStatus('open')">فعال</button>
              <button class="filter-btn ${
                pagination.statusFilter === "pending" ? "active" : ""
              }" onclick="filterOrdersByStatus('pending')">در انتظار</button>
              <button class="filter-btn ${
                pagination.statusFilter === "finished" ? "active" : ""
              }" onclick="filterOrdersByStatus('finished')">تکمیل شده</button>
            </div>
          </div>
          <p>سفارشی یافت نشد</p>
        </div>
      `;
      return;
    }

    // Store all orders for reference
    AdminPanel.allOrders = response.data.baskets || [];

    renderOrdersTable();
  } catch (error) {
    container.innerHTML = '<div class="error">خطا در بارگذاری سفارشات</div>';
  }
}

function renderOrdersTable() {
  const container = document.getElementById("orders-table-container");
  const pagination = AdminPanel.pagination.orders;
  const orders = pagination.data;

  let html = `
    <div class="table-header">
      <h3>سفارشات (${pagination.totalItems})</h3>
      <div class="filter-buttons">
        <button class="filter-btn ${
          pagination.statusFilter === "all" ? "active" : ""
        }" onclick="filterOrdersByStatus('all')">همه</button>
        <button class="filter-btn ${
          pagination.statusFilter === "open" ? "active" : ""
        }" onclick="filterOrdersByStatus('open')">فعال</button>
        <button class="filter-btn ${
          pagination.statusFilter === "pending" ? "active" : ""
        }" onclick="filterOrdersByStatus('pending')">در انتظار</button>
        <button class="filter-btn ${
          pagination.statusFilter === "finished" ? "active" : ""
        }" onclick="filterOrdersByStatus('finished')">تکمیل شده</button>
      </div>
    </div>
    <table class="data-table">
      <thead>
        <tr><th>مشتری</th><th>تعداد اقلام</th><th>مبلغ</th><th>وضعیت</th><th>تاریخ</th><th>عملیات</th></tr>
      </thead>
      <tbody>
  `;

  orders.forEach((order) => {
    const userName = order.user
      ? `${order.user.firstname} ${order.user.lastname}`
      : "نامشخص";
    const orderDate = new Date(order.createdAt).toLocaleDateString("fa-IR");
    const statusText = getOrderStatusText(order.status);

    html += `
      <tr class="order-row-${order.status}">
        <td><strong>${userName}</strong><br><small>${
      order.user?.username || "نامشخص"
    }</small></td>
        <td>${order.totalItems || 0}</td>
        <td>${(order.totalPrice || 0).toLocaleString("fa-IR")} تومان</td>
        <td><span class="status-badge status-${order.status}">${statusText}</span></td>
        <td>${orderDate}</td>
        <td><button class="btn btn-view" onclick="viewOrderDetails('${
          order._id
        }')">جزئیات</button></td>
      </tr>
    `;
  });

  html += "</tbody></table>";
  html += createPaginationHTML("orders");
  container.innerHTML = html;
}

function getOrderStatusText(status) {
  switch (status) {
    case "open":
      return "فعال";
    case "pending":
      return "در انتظار";
    case "finished":
      return "تکمیل شده";
    default:
      return status;
  }
}

async function filterOrdersByStatus(status) {
  AdminPanel.pagination.orders.statusFilter = status;
  AdminPanel.pagination.orders.currentPage = 1; // Reset to first page when filtering
  await loadOrders();
}

// Categories management with client-side pagination
async function loadCategories() {
  const container = document.getElementById("categories-table-container");
  container.innerHTML = '<div class="loading">در حال بارگذاری دسته‌بندی‌ها...</div>';

  const pagination = AdminPanel.pagination.categories;

  try {
    const [categoriesRes, subcategoriesRes] = await Promise.all([
      makeApiCall("/categories?limit=1000"),
      makeApiCall("/sub-categories?limit=1000"), // Load all subcategories for reference
    ]);

    AdminPanel.allSubCategories = subcategoriesRes.data.subcategories || [];

    // Store all categories
    const allCategories = categoriesRes.data.categories || [];

    // Calculate pagination on client side
    pagination.totalItems = allCategories.length;
    pagination.totalPages = Math.ceil(pagination.totalItems / pagination.itemsPerPage);

    // Get categories for current page
    const startIndex = (pagination.currentPage - 1) * pagination.itemsPerPage;
    const endIndex = startIndex + pagination.itemsPerPage;
    pagination.data = allCategories.slice(startIndex, endIndex);

    console.log(
      `Showing categories ${startIndex + 1} to ${Math.min(
        endIndex,
        pagination.totalItems
      )} of ${pagination.totalItems}`
    );

    if (allCategories.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>دسته‌بندی یافت نشد</p>
          <button class="btn-primary" onclick="openModalDialog('addCategoryModal')">افزودن دسته‌بندی</button>
        </div>
      `;
      return;
    }

    // Store all categories for reference
    AdminPanel.allCategories = allCategories;

    renderCategoriesTable();
  } catch (error) {
    container.innerHTML = '<div class="error">خطا در بارگذاری دسته‌بندی‌ها</div>';
  }
}

function renderCategoriesTable() {
  const container = document.getElementById("categories-table-container");
  const pagination = AdminPanel.pagination.categories;
  const categories = pagination.data;

  let html = `
    <div class="table-header">
      <h3>دسته‌بندی‌ها و زیردسته‌ها (${pagination.totalItems})</h3>
      <div>
        <button class="btn-primary" onclick="openModalDialog('addCategoryModal')">دسته‌بندی جدید</button>
        <button class="btn-secondary" onclick="openSubCategoryModal()">زیردسته جدید</button>
      </div>
    </div>
    <div class="categories-container">
  `;

  categories.forEach((category) => {
    const subcategories = AdminPanel.allSubCategories.filter(
      (sub) => sub.category && sub.category._id === category._id
    );
    html += `
      <div class="category-card">
        <div class="category-header">
          <img src="/images/models-images/category-images/${
            category.icon || "default-icon.jpeg"
          }" 
               class="category-image" 
               onerror="this.src='/images/models-images/category-images/default-icon.jpeg'">
          <div class="category-info">
            <h4>${category.name}</h4>
            <span>${subcategories.length} زیردسته</span>
          </div>
          <div class="category-actions">
            <button class="btn btn-edit" onclick="editCategoryItem('${
              category._id
            }')">ویرایش</button>
            <button class="btn btn-delete" onclick="deleteCategoryItem('${
              category._id
            }')">حذف</button>
          </div>
        </div>
        <div class="subcategories-list">
    `;

    subcategories.forEach((sub) => {
      html += `
        <div class="subcategory-item">
          <img src="/images/models-images/subCategory-images/${
            sub.icon || "default-sub-icon.jpeg"
          }" 
               class="subcategory-image"
               onerror="this.src='/images/models-images/subCategory-images/default-sub-icon.jpeg'">
          <span>${sub.name}</span>
          <div class="subcategory-actions">
            <button class="btn-small btn-edit" onclick="editSubCategoryItem('${
              sub._id
            }')">ویرایش</button>
            <button class="btn-small btn-delete" onclick="deleteSubCategoryItem('${
              sub._id
            }')">حذف</button>
          </div>
        </div>
      `;
    });

    html += "</div></div>";
  });

  html += "</div>";
  html += createPaginationHTML("categories");
  container.innerHTML = html;
}

// Product modal and management functions
async function openProductModal(productId = null) {
  await loadCategoryOptions();

  if (productId) {
    // Find product in all products, not just current page data
    const product = AdminPanel.allProducts.find((p) => p._id === productId);
    if (product) {
      document.getElementById("editProductName").value = product.name;
      document.getElementById("editProductBrand").value = product.brand;
      document.getElementById("editProductPrice").value = product.price;
      document.getElementById("editProductQuantity").value = product.quantity;
      document.getElementById("editProductDescription").value = product.description || "";

      // Set category
      document.getElementById("editProductCategory").value = product.category?._id || "";
      updateSubcategoryOptions(product.category?._id, "editProductSubCategory");

      // Set subcategory after a delay
      setTimeout(() => {
        document.getElementById("editProductSubCategory").value =
          product.subCategory?._id || "";
      }, 200);

      // Show current thumbnail
      const thumbnailPreview = document.getElementById("editThumbnailPreview");
      if (thumbnailPreview) {
        thumbnailPreview.src = `/images/models-images/product-images/${product.thumbnail}`;
        thumbnailPreview.style.display = "block";
      }

      document
        .getElementById("editProductModal")
        .setAttribute("data-product-id", productId);
      openModalDialog("editProductModal");
    }
  } else {
    // Add mode
    resetProductForm("add");
    openModalDialog("addProductModal");
  }
}

function resetProductForm(mode) {
  const form = document.getElementById(`${mode}ProductForm`);
  if (form) form.reset();

  const preview = document.getElementById(`${mode}ThumbnailPreview`);
  if (preview) {
    preview.style.display = "none";
    preview.src = "";
  }
}

async function loadCategoryOptions() {
  try {
    const [categoriesRes, subcategoriesRes] = await Promise.all([
      makeApiCall("/categories?limit=100"),
      makeApiCall("/sub-categories?limit=100"),
    ]);

    AdminPanel.allCategories = categoriesRes.data.categories || [];
    AdminPanel.allSubCategories = subcategoriesRes.data.subcategories || [];

    console.log("DEBUG - Loaded categories:", AdminPanel.allCategories);
    console.log("DEBUG - Loaded subcategories:", AdminPanel.allSubCategories);

    // Fill dropdowns
    ["addProductCategory", "editProductCategory"].forEach((selectId) => {
      const select = document.getElementById(selectId);
      if (select) {
        select.innerHTML = '<option value="">انتخاب دسته‌بندی</option>';
        AdminPanel.allCategories.forEach((cat) => {
          select.innerHTML += `<option value="${cat._id}">${cat.name}</option>`;
        });

        select.onchange = function () {
          updateSubcategoryOptions(
            this.value,
            selectId.replace("Category", "SubCategory")
          );
        };
      }
    });
  } catch (error) {
    showMessage("خطا در بارگذاری دسته‌بندی‌ها", "error");
  }
}

function updateSubcategoryOptions(categoryId, subSelectId) {
  const subSelect = document.getElementById(subSelectId);
  if (!subSelect) return;

  subSelect.innerHTML = '<option value="">انتخاب زیردسته</option>';

  console.log("DEBUG - Updating subcategories for category:", categoryId);
  console.log("DEBUG - Available subcategories:", AdminPanel.allSubCategories);

  if (categoryId) {
    const filteredSubs = AdminPanel.allSubCategories.filter(
      (sub) => sub.category && sub.category._id === categoryId
    );

    console.log("DEBUG - Filtered subcategories:", filteredSubs);

    filteredSubs.forEach((sub) => {
      console.log("DEBUG - Adding subcategory option:", sub._id, sub.name);
      subSelect.innerHTML += `<option value="${sub._id}">${sub.name}</option>`;
    });
  }
}
async function saveProduct(isEdit = false) {
  const prefix = isEdit ? "edit" : "add";

  // Get form values (keep existing code)
  const name = document.getElementById(`${prefix}ProductName`).value.trim();
  const brand = document.getElementById(`${prefix}ProductBrand`).value.trim();
  const category = document.getElementById(`${prefix}ProductCategory`).value;
  const subCategory = document.getElementById(`${prefix}ProductSubCategory`).value;
  const price = parseFloat(document.getElementById(`${prefix}ProductPrice`).value);
  const quantity = parseInt(document.getElementById(`${prefix}ProductQuantity`).value);
  const description = document.getElementById(`${prefix}ProductDescription`).value.trim();

  // Get thumbnail file
  const thumbnailInput = document.getElementById(`${prefix}ProductThumbnail`);
  const thumbnailFile = thumbnailInput?.files[0];

  // Validation
  if (!name || !brand || !category || !subCategory || !price || quantity < 0) {
    showMessage("لطفا تمام فیلدهای ضروری را پر کنید", "error");
    return;
  }

  console.log("DEBUG - All values before API call:", {
    name,
    brand,
    category,
    subCategory,
    price,
    quantity,
    description,
  });

  try {
    if (isEdit) {
      // Edit logic (keep existing)
      const productId = document
        .getElementById("editProductModal")
        .getAttribute("data-product-id");

      const productData = {
        name,
        brand,
        category,
        subCategory,
        price,
        quantity,
        description,
      };

      await makeApiCall(`/products/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productData),
      });

      showMessage("محصول به‌روزرسانی شد", "success");
      closeModalDialog("editProductModal");
    } else {
      // ADD NEW PRODUCT - Try JSON first instead of FormData
      const productData = {
        name,
        brand,
        category,
        subCategory,
        price,
        quantity,
        description,
      };

      console.log("DEBUG - Sending product data:", productData);

      const response = await makeApiCall("/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productData),
      });

      showMessage("محصول افزوده شد", "success");
      closeModalDialog("addProductModal");
    }

    await loadProducts();
  } catch (error) {
    console.error("Error saving product:", error);
    showMessage("خطا در ذخیره محصول: " + error.message, "error");
  }
}

async function editProductItem(productId) {
  await openProductModal(productId);
}

async function deleteProductItem(productId) {
  if (!confirm("آیا از حذف این محصول اطمینان دارید؟")) return;

  try {
    await makeApiCall(`/products/${productId}`, { method: "DELETE" });
    showMessage("محصول حذف شد", "success");
    await loadProducts();
  } catch (error) {
    console.error("Error deleting product:", error);
  }
}

// Category management functions
async function saveCategory() {
  const name = document.getElementById("addCategoryName").value.trim();
  const iconFile = document.getElementById("addCategoryIcon")?.files[0];

  if (!name) {
    showMessage("نام دسته‌بندی ضروری است", "error");
    return;
  }

  try {
    const categoryData = { name };
    const response = await makeApiCall("/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(categoryData),
    });

    // If there's an icon file and the category was created successfully
    if (iconFile && response.data?.category?._id) {
      const formData = new FormData();
      formData.append("icon", iconFile);

      try {
        // Upload the icon
        await makeApiCallWithFile(
          `/categories/chahge-icon/${response.data.category._id}`,
          formData,
          {
            method: "PATCH",
          }
        );
      } catch (iconError) {
        console.warn("Icon upload failed:", iconError);
        showMessage("دسته‌بندی افزوده شد اما آپلود آیکون ناموفق بود", "warning");
      }
    }

    showMessage("دسته‌بندی افزوده شد", "success");
    closeModalDialog("addCategoryModal");
    await loadCategories();
  } catch (error) {
    console.error("Error adding category:", error);
  }
}

function editCategoryItem(categoryId) {
  // Find category in all categories, not just current page data
  const category = AdminPanel.allCategories.find((c) => c._id === categoryId);
  if (category) {
    document.getElementById("editCategoryName").value = category.name;

    // Show current icon
    const iconPreview = document.getElementById("editCategoryIconPreview");
    if (iconPreview) {
      iconPreview.src = `/images/models-images/category-images/${category.icon}`;
      iconPreview.style.display = "block";
    }

    document
      .getElementById("editCategoryModal")
      .setAttribute("data-category-id", categoryId);
    openModalDialog("editCategoryModal");
  }
}

async function updateCategory() {
  const categoryId = document
    .getElementById("editCategoryModal")
    .getAttribute("data-category-id");
  const name = document.getElementById("editCategoryName").value.trim();
  const iconFile = document.getElementById("editCategoryIcon")?.files[0];

  if (!name) {
    showMessage("نام دسته‌بندی ضروری است", "error");
    return;
  }

  try {
    // Update category name
    await makeApiCall(`/categories/${categoryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    // If there's a new icon file
    if (iconFile) {
      const formData = new FormData();
      formData.append("icon", iconFile);

      try {
        await makeApiCallWithFile(`/categories/chahge-icon/${categoryId}`, formData, {
          method: "PATCH",
        });
      } catch (iconError) {
        console.warn("Icon upload failed:", iconError);
        showMessage("دسته‌بندی به‌روزرسانی شد اما آپلود آیکون ناموفق بود", "warning");
      }
    }

    showMessage("دسته‌بندی به‌روزرسانی شد", "success");
    closeModalDialog("editCategoryModal");
    await loadCategories();
  } catch (error) {
    console.error("Error updating category:", error);
  }
}

async function deleteCategoryItem(categoryId) {
  if (!confirm("آیا از حذف این دسته‌بندی اطمینان دارید؟")) return;

  try {
    await makeApiCall(`/categories/${categoryId}`, { method: "DELETE" });
    showMessage("دسته‌بندی حذف شد", "success");
    await loadCategories();
  } catch (error) {
    console.error("Error deleting category:", error);
  }
}

function openSubCategoryModal() {
  const select = document.getElementById("addSubCategoryParent");
  if (select) {
    select.innerHTML = '<option value="">انتخاب دسته‌بندی والد</option>';
    AdminPanel.allCategories.forEach((cat) => {
      select.innerHTML += `<option value="${cat._id}">${cat.name}</option>`;
    });
  }
  openModalDialog("addSubCategoryModal");
}

async function saveSubCategory() {
  const name = document.getElementById("addSubCategoryName").value.trim();
  const category = document.getElementById("addSubCategoryParent").value;
  const iconFile = document.getElementById("addSubCategoryIcon")?.files[0];

  if (!name || !category) {
    showMessage("نام زیردسته و دسته‌بندی والد ضروری است", "error");
    return;
  }

  try {
    // First create the subcategory
    const response = await makeApiCall("/sub-categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, category }),
    });

    // If there's an icon file and the subcategory was created successfully
    if (iconFile && response.data?.subcategory?._id) {
      const formData = new FormData();
      formData.append("icon", iconFile);

      try {
        await makeApiCallWithFile(
          `/sub-categories/change-icon/${response.data.subcategory._id}`,
          formData,
          {
            method: "PATCH",
          }
        );
      } catch (iconError) {
        console.warn("Icon upload failed:", iconError);
        showMessage("زیردسته افزوده شد اما آپلود آیکون ناموفق بود", "warning");
      }
    }

    showMessage("زیردسته افزوده شد", "success");
    closeModalDialog("addSubCategoryModal");
    await loadCategories();
  } catch (error) {
    console.error("Error adding subcategory:", error);
  }
}

function editSubCategoryItem(subCategoryId) {
  const subCategory = AdminPanel.allSubCategories.find((s) => s._id === subCategoryId);
  if (subCategory) {
    document.getElementById("editSubCategoryName").value = subCategory.name;

    // Fill parent category dropdown
    const select = document.getElementById("editSubCategoryCategory");
    if (select) {
      select.innerHTML = '<option value="">انتخاب دسته‌بندی</option>';
      AdminPanel.allCategories.forEach((cat) => {
        const selected = cat._id === subCategory.category?._id ? "selected" : "";
        select.innerHTML += `<option value="${cat._id}" ${selected}>${cat.name}</option>`;
      });
    }

    // Show current icon
    const iconPreview = document.getElementById("editSubCategoryIconPreview");
    if (iconPreview) {
      iconPreview.src = `/images/models-images/subCategory-images/${subCategory.icon}`;
      iconPreview.style.display = "block";
    }

    document
      .getElementById("editSubCategoryModal")
      .setAttribute("data-subcategory-id", subCategoryId);
    openModalDialog("editSubCategoryModal");
  }
}

async function updateSubCategory() {
  const subCategoryId = document
    .getElementById("editSubCategoryModal")
    .getAttribute("data-subcategory-id");
  const name = document.getElementById("editSubCategoryName").value.trim();
  const category = document.getElementById("editSubCategoryCategory").value;
  const iconFile = document.getElementById("editSubCategoryIcon")?.files[0];

  if (!name || !category) {
    showMessage("نام زیردسته و دسته‌بندی ضروری است", "error");
    return;
  }

  try {
    // Update subcategory data
    await makeApiCall(`/sub-categories/${subCategoryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, category }),
    });

    // If there's a new icon file
    if (iconFile) {
      const formData = new FormData();
      formData.append("icon", iconFile);

      try {
        await makeApiCallWithFile(
          `/sub-categories/change-icon/${subCategoryId}`,
          formData,
          {
            method: "PATCH",
          }
        );
      } catch (iconError) {
        console.warn("Icon upload failed:", iconError);
        showMessage("زیردسته به‌روزرسانی شد اما آپلود آیکون ناموفق بود", "warning");
      }
    }

    showMessage("زیردسته به‌روزرسانی شد", "success");
    closeModalDialog("editSubCategoryModal");
    await loadCategories();
  } catch (error) {
    console.error("Error updating subcategory:", error);
  }
}

async function deleteSubCategoryItem(subCategoryId) {
  if (!confirm("آیا از حذف این زیردسته اطمینان دارید؟")) return;

  try {
    await makeApiCall(`/sub-categories/${subCategoryId}`, { method: "DELETE" });
    showMessage("زیردسته حذف شد", "success");
    await loadCategories();
  } catch (error) {
    console.error("Error deleting subcategory:", error);
  }
}

// User management functions
function editUserRole(userId) {
  // Find user in all users, not just current page data
  const user = AdminPanel.allUsers.find((u) => u._id === userId);
  if (!user) {
    showMessage("کاربر یافت نشد", "error");
    return;
  }

  // Fill user info in modal
  document.getElementById(
    "editUserFullName"
  ).value = `${user.firstname} ${user.lastname}`;
  document.getElementById("editUserEmail").value = user.username;
  document.getElementById("editUserRole").value = user.role;

  // Set modal data
  document.getElementById("editUserModal").setAttribute("data-user-id", userId);

  openModalDialog("editUserModal");
}

async function updateUserRole() {
  const userId = document.getElementById("editUserModal").getAttribute("data-user-id");
  const newRole = document.getElementById("editUserRole").value;

  if (!newRole) {
    showMessage("لطفا نقش کاربر را انتخاب کنید", "error");
    return;
  }

  // Prevent changing own role if current user is admin
  if (AdminPanel.currentUser._id === userId && newRole !== "admin") {
    showMessage("شما نمی‌توانید نقش خودتان را تغییر دهید", "error");
    return;
  }

  try {
    await makeApiCall(`/users/change-role/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });

    showMessage("نقش کاربر به‌روزرسانی شد", "success");
    closeModalDialog("editUserModal");
    await loadUsers();
  } catch (error) {
    console.error("Error updating user role:", error);
    showMessage("خطا در به‌روزرسانی نقش کاربر", "error");
  }
}

async function deleteUserItem(userId) {
  // Prevent deleting own account
  if (AdminPanel.currentUser._id === userId) {
    showMessage("شما نمی‌توانید حساب کاربری خودتان را حذف کنید", "error");
    return;
  }

  if (!confirm("آیا از حذف این کاربر اطمینان دارید؟")) return;

  try {
    await makeApiCall(`/users/${userId}`, { method: "DELETE" });
    showMessage("کاربر حذف شد", "success");
    await loadUsers();
  } catch (error) {
    console.error("Error deleting user:", error);
  }
}

// Order details view
function viewOrderDetails(orderId) {
  // Look for order in all orders, not just current page
  const order = AdminPanel.allOrders.find((o) => o._id === orderId);
  if (!order) {
    showMessage("سفارش یافت نشد", "error");
    return;
  }

  const userName = order.user
    ? `${order.user.firstname} ${order.user.lastname}`
    : "نامشخص";
  const orderDate = new Date(order.createdAt).toLocaleDateString("fa-IR");
  const orderTime = new Date(order.createdAt).toLocaleTimeString("fa-IR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const statusText = getOrderStatusText(order.status);

  let itemsHtml = "";
  if (order.products && order.products.length > 0) {
    order.products.forEach((item) => {
      const productName = item.product?.name || "محصول نامشخص";
      const productPrice = item.product?.price || 0;
      const itemTotal = productPrice * item.count;
      const productImage = item.product?.thumbnail || "default-thumbnail.jpeg";
      const imagePath = `/images/models-images/product-images/${productImage}`;

      itemsHtml += `
        <tr>
          <td>
            <div style="display: flex; align-items: center; gap: 10px;">
              <img src="${imagePath}" style="width: 30px; height: 30px; object-fit: cover; border-radius: 4px;" 
                   onerror="this.src='/images/models-images/product-images/default-thumbnail.jpeg'">
              <span>${productName}</span>
            </div>
          </td>
          <td>${item.count}</td>
          <td>${productPrice.toLocaleString("fa-IR")} تومان</td>
          <td><strong>${itemTotal.toLocaleString("fa-IR")} تومان</strong></td>
        </tr>
      `;
    });
  } else {
    itemsHtml =
      '<tr><td colspan="4" style="text-align: center;">محصولی در سفارش یافت نشد</td></tr>';
  }

  const content = `
    <div class="order-details">
      <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
        <h4>اطلاعات سفارش</h4>
        <p><strong>مشتری:</strong> ${userName}</p>
        <p><strong>ایمیل:</strong> ${order.user?.username || "نامشخص"}</p>
        <p><strong>تاریخ سفارش:</strong> ${orderDate} - ${orderTime}</p>
        <p><strong>وضعیت:</strong> <span class="status-badge status-${
          order.status
        }">${statusText}</span></p>
        <p><strong>تعداد کل اقلام:</strong> ${order.totalItems || 0} عدد</p>
      </div>
      
      <div>
        <h4>محصولات سفارش</h4>
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
          <thead>
            <tr style="background: #f1f5f9;">
              <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">محصول</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">تعداد</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">قیمت واحد</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">جمع</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
      </div>
      
      <div style="text-align: left; padding: 20px 0; border-top: 2px solid #eee; margin-top: 20px;">
        <strong>مجموع کل: ${(order.totalPrice || 0).toLocaleString(
          "fa-IR"
        )} تومان</strong>
      </div>
    </div>
  `;

  document.getElementById("orderDetailsContent").innerHTML = content;
  openModalDialog("orderDetailsModal");
}

// Modal management
function openModalDialog(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = "block";
    document.body.style.overflow = "hidden";
  }
}

function closeModalDialog(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = "none";
    document.body.style.overflow = "auto";

    // Clear forms
    const forms = modal.querySelectorAll("form");
    forms.forEach((form) => form.reset());

    // Hide image previews
    const previews = modal.querySelectorAll("img[id*='Preview']");
    previews.forEach((preview) => {
      preview.style.display = "none";
      preview.src = "";
    });

    // Remove data attributes
    modal.removeAttribute("data-product-id");
    modal.removeAttribute("data-category-id");
    modal.removeAttribute("data-subcategory-id");
    modal.removeAttribute("data-user-id");
  }
}

// Image upload and preview handlers
function handleImageUpload(inputId, previewId) {
  const input = document.getElementById(inputId);
  const preview = document.getElementById(previewId);

  if (!input || !input.files || !input.files[0]) return;

  const file = input.files[0];

  // Validate file type
  if (!file.type.startsWith("image/")) {
    showMessage("لطفا فقط فایل تصویری انتخاب کنید", "error");
    input.value = "";
    return;
  }

  // Validate file size (5MB max)
  if (file.size > 5 * 1024 * 1024) {
    showMessage("حجم فایل نباید بیش از 5 مگابایت باشد", "error");
    input.value = "";
    return;
  }

  // Show preview
  if (preview) {
    const reader = new FileReader();
    reader.onload = function (e) {
      preview.src = e.target.result;
      preview.style.display = "block";
    };
    reader.readAsDataURL(file);
  }
}

// Initialize the admin panel
async function initializeAdminPanel() {
  try {
    console.log("Initializing Admin Panel...");

    // Check authentication
    let userResponse;
    try {
      userResponse = await makeApiCall("/account");
      AdminPanel.currentUser = userResponse.data.user;
    } catch (error) {
      console.error("Authentication failed:", error);
      showMessage("لطفا ابتدا وارد شوید", "error");
      setTimeout(() => (window.location.href = "/login"), 2000);
      return;
    }

    // Check admin role
    if (!AdminPanel.currentUser || AdminPanel.currentUser.role !== "admin") {
      showMessage("شما دسترسی مدیریت ندارید", "error");
      setTimeout(() => (window.location.href = "/shop"), 2000);
      return;
    }

    // Update header with user info
    const userInfo = document.querySelector(".admin-user-info");
    if (userInfo && AdminPanel.currentUser) {
      userInfo.innerHTML = `
        <span>خوش آمدید، ${AdminPanel.currentUser.firstname} ${AdminPanel.currentUser.lastname}</span>
        <small>(${AdminPanel.currentUser.role})</small>
      `;
    }

    // Load dashboard
    await loadDashboard();

    showMessage("پنل مدیریت بارگذاری شد", "success");
  } catch (error) {
    console.error("Error initializing admin panel:", error);
    showMessage("خطا در بارگذاری پنل مدیریت", "error");
  }
}

// Set up all global functions for HTML onclick handlers
function setupAllGlobalFunctions() {
  // Main functions
  window.switchTab = switchToTab;
  window.openModal = openModalDialog;
  window.closeModal = closeModalDialog;
  window.goToPage = goToPage;

  // Product functions
  window.openAddProductModal = () => openProductModal();
  window.addProduct = () => saveProduct(false);
  window.updateProduct = () => saveProduct(true);
  window.editProduct = editProductItem;
  window.deleteProduct = deleteProductItem;

  // Category functions
  window.addCategory = saveCategory;
  window.updateCategory = updateCategory;
  window.editCategory = editCategoryItem;
  window.deleteCategory = deleteCategoryItem;

  // SubCategory functions
  window.openAddSubCategoryModal = openSubCategoryModal;
  window.addSubCategory = saveSubCategory;
  window.updateSubCategory = updateSubCategory;
  window.editSubCategory = editSubCategoryItem;
  window.deleteSubCategory = deleteSubCategoryItem;

  // User functions
  window.editUserRole = editUserRole;
  window.updateUserRole = updateUserRole;
  window.deleteUser = deleteUserItem;

  // Order functions
  window.filterOrders = filterOrdersByStatus;
  window.viewOrder = viewOrderDetails;

  // Image functions
  window.handleImageUpload = handleImageUpload;

  // Form submission functions
  window.submitAddProduct = () => saveProduct(false);
  window.submitEditProduct = () => saveProduct(true);
  window.submitAddCategory = saveCategory;
  window.submitEditCategory = updateCategory;
  window.submitAddSubCategory = saveSubCategory;
  window.submitEditSubCategory = updateSubCategory;
  window.submitEditUser = updateUserRole;

  console.log("All global functions set up successfully");
}

// Event listeners
document.addEventListener("DOMContentLoaded", function () {
  console.log("DOM loaded, setting up admin panel...");

  // Set up global functions first
  setupAllGlobalFunctions();

  // Initialize the app
  initializeAdminPanel();

  // Set up image upload event listeners
  const imageInputs = [
    { input: "addProductThumbnail", preview: "addThumbnailPreview" },
    { input: "editProductThumbnail", preview: "editThumbnailPreview" },
    { input: "addCategoryIcon", preview: "addCategoryIconPreview" },
    { input: "editCategoryIcon", preview: "editCategoryIconPreview" },
    { input: "addSubCategoryIcon", preview: "addSubCategoryIconPreview" },
    { input: "editSubCategoryIcon", preview: "editSubCategoryIconPreview" },
  ];

  imageInputs.forEach(({ input, preview }) => {
    const inputElement = document.getElementById(input);
    if (inputElement) {
      inputElement.addEventListener("change", () => handleImageUpload(input, preview));
    }
  });
});

// Modal close handlers
window.onclick = function (event) {
  if (event.target.classList.contains("modal")) {
    closeModalDialog(event.target.id);
  }
};

document.addEventListener("keydown", function (event) {
  if (event.key === "Escape") {
    const openModal = document.querySelector('.modal[style*="block"]');
    if (openModal) {
      closeModalDialog(openModal.id);
    }
  }
});

console.log("Admin Panel script loaded successfully");
