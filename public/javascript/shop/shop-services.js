// shop-services.js - Debug Version with Enhanced Logging
console.log("🔧 DEBUG Shop services loaded - Backend integration");

// API Base URL
const API_BASE = "http://127.0.0.1:8000/api";

// Product Services
export const getProducts = async () => {
  try {
    console.log("🔧 DEBUG: Fetching products from:", `${API_BASE}/products`);
    const response = await fetch(`${API_BASE}/products`);
    console.log("🔧 DEBUG: Products response status:", response.status);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log("🔧 DEBUG: Products data:", data);
    return data.data.products;
  } catch (error) {
    console.error("🔧 DEBUG: Error fetching products:", error);
    throw error;
  }
};

export const getProductById = async (productId) => {
  try {
    console.log("🔧 DEBUG: Fetching product:", productId);
    const response = await fetch(`${API_BASE}/products/${productId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error("🔧 DEBUG: Error fetching product:", error);
    throw error;
  }
};

export const groupProducts = (products) => {
  const result = {};

  for (const product of products) {
    if (!product.category || !product.subCategory) continue;

    const { name: categoryName, icon: categoryIcon = "default-category-icon.jpeg" } =
      product.category;
    const { name: subCategoryName, icon: subCategoryIcon = "default-sub-icon.jpeg" } =
      product.subCategory;

    if (!result[categoryName]) {
      result[categoryName] = { icon: categoryIcon, subCategories: {} };
    }

    if (!result[categoryName].subCategories[subCategoryName]) {
      result[categoryName].subCategories[subCategoryName] = {
        icon: subCategoryIcon,
        products: [],
      };
    }

    result[categoryName].subCategories[subCategoryName].products.push(product);
  }

  return result;
};

// Enhanced Basket Services with Debug Logging
export const basketService = {
  // Get basket from database
  async getBasket() {
    try {
      console.log("🔧 DEBUG: Getting basket from:", `${API_BASE}/basket`);

      const response = await fetch(`${API_BASE}/basket`, {
        method: "GET",
        credentials: "include",
      });

      console.log("🔧 DEBUG: Basket response status:", response.status);
      console.log("🔧 DEBUG: Basket response headers:", [...response.headers.entries()]);

      if (response.ok) {
        const data = await response.json();
        console.log("🔧 DEBUG: Raw basket data from server:", data);

        const transformedBasket = this.transformServerBasket(data.data.basket);
        console.log("🔧 DEBUG: Transformed basket:", transformedBasket);

        return transformedBasket;
      } else if (response.status === 401) {
        console.warn("🔧 DEBUG: User not authenticated");
        const responseText = await response.text();
        console.log("🔧 DEBUG: 401 response body:", responseText);
        return {};
      } else {
        console.warn("🔧 DEBUG: Failed to get basket:", response.status);
        const responseText = await response.text();
        console.log("🔧 DEBUG: Error response body:", responseText);
        return {};
      }
    } catch (error) {
      console.error("🔧 DEBUG: Error getting basket:", error);
      return {};
    }
  },

  // Add to basket in database
  async addToBasket(productId, quantity = 1) {
    try {
      console.log("🔧 DEBUG: Adding to basket:", { productId, quantity });
      console.log("🔧 DEBUG: Request URL:", `${API_BASE}/basket`);

      const requestBody = JSON.stringify({ productId, quantity });
      console.log("🔧 DEBUG: Request body:", requestBody);

      const response = await fetch(`${API_BASE}/basket`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: requestBody,
      });

      console.log("🔧 DEBUG: Add to basket response status:", response.status);
      console.log("🔧 DEBUG: Add to basket response headers:", [
        ...response.headers.entries(),
      ]);

      if (response.ok) {
        const data = await response.json();
        console.log("🔧 DEBUG: Add to basket success data:", data);
        this.showNotification(data.message || "محصول اضافه شد", "success");
        return this.transformServerBasket(data.data.basket);
      } else {
        const errorText = await response.text();
        console.error("🔧 DEBUG: Add to basket failed:", response.status, errorText);

        try {
          const errorData = JSON.parse(errorText);
          this.showNotification(errorData.message || "خطا در افزودن محصول", "error");
          throw new Error(errorData.message);
        } catch (parseError) {
          this.showNotification("خطا در افزودن محصول", "error");
          throw new Error(`Server error: ${response.status}`);
        }
      }
    } catch (error) {
      console.error("🔧 DEBUG: Error adding to basket:", error);
      this.showNotification("خطا در افزودن محصول", "error");
      throw error;
    }
  },

  // Update quantity in database
  async updateQuantity(productId, quantity) {
    try {
      console.log("🔧 DEBUG: Updating quantity:", { productId, quantity });

      if (quantity <= 0) {
        return await this.removeFromBasket(productId);
      }

      const response = await fetch(`${API_BASE}/basket/item/${productId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ quantity }),
      });

      console.log("🔧 DEBUG: Update quantity response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("🔧 DEBUG: Update quantity success:", data);
        this.showNotification(data.message || "تعداد به‌روزرسانی شد", "success");
        return this.transformServerBasket(data.data.basket);
      } else {
        const errorText = await response.text();
        console.error("🔧 DEBUG: Update quantity failed:", response.status, errorText);

        try {
          const errorData = JSON.parse(errorText);
          this.showNotification(errorData.message || "خطا در به‌روزرسانی", "error");
          throw new Error(errorData.message);
        } catch (parseError) {
          this.showNotification("خطا در به‌روزرسانی تعداد", "error");
          throw new Error(`Server error: ${response.status}`);
        }
      }
    } catch (error) {
      console.error("🔧 DEBUG: Error updating quantity:", error);
      this.showNotification("خطا در به‌روزرسانی تعداد", "error");
      throw error;
    }
  },

  // Remove from basket in database
  async removeFromBasket(productId) {
    try {
      console.log("🔧 DEBUG: Removing from basket:", productId);

      const response = await fetch(`${API_BASE}/basket/item/${productId}`, {
        method: "DELETE",
        credentials: "include",
      });

      console.log("🔧 DEBUG: Remove from basket response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("🔧 DEBUG: Remove from basket success:", data);
        this.showNotification(data.message || "محصول حذف شد", "success");
        return this.transformServerBasket(data.data.basket);
      } else {
        const errorText = await response.text();
        console.error("🔧 DEBUG: Remove from basket failed:", response.status, errorText);

        try {
          const errorData = JSON.parse(errorText);
          this.showNotification(errorData.message || "خطا در حذف محصول", "error");
          throw new Error(errorData.message);
        } catch (parseError) {
          this.showNotification("خطا در حذف محصول", "error");
          throw new Error(`Server error: ${response.status}`);
        }
      }
    } catch (error) {
      console.error("🔧 DEBUG: Error removing from basket:", error);
      this.showNotification("خطا در حذف محصول", "error");
      throw error;
    }
  },

  // Clear entire basket in database
  async clearBasket() {
    try {
      console.log("🔧 DEBUG: Clearing basket");

      const response = await fetch(`${API_BASE}/basket`, {
        method: "DELETE",
        credentials: "include",
      });

      console.log("🔧 DEBUG: Clear basket response status:", response.status);

      if (response.ok) {
        console.log("🔧 DEBUG: Clear basket success");
        this.showNotification("سبد پاک شد", "success");
        return {};
      } else {
        const errorText = await response.text();
        console.error("🔧 DEBUG: Clear basket failed:", response.status, errorText);

        try {
          const errorData = JSON.parse(errorText);
          this.showNotification(errorData.message || "خطا در پاک کردن سبد", "error");
          throw new Error(errorData.message);
        } catch (parseError) {
          this.showNotification("خطا در پاک کردن سبد", "error");
          throw new Error(`Server error: ${response.status}`);
        }
      }
    } catch (error) {
      console.error("🔧 DEBUG: Error clearing basket:", error);
      this.showNotification("خطا در پاک کردن سبد", "error");
      throw error;
    }
  },

  // Get basket summary from database
  async getBasketSummary() {
    try {
      console.log("🔧 DEBUG: Getting basket summary");

      const response = await fetch(`${API_BASE}/basket/summary`, {
        method: "GET",
        credentials: "include",
      });

      console.log("🔧 DEBUG: Basket summary response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("🔧 DEBUG: Basket summary data:", data);
        return data.data;
      } else {
        console.log("🔧 DEBUG: Basket summary failed, returning defaults");
        return { totalItems: 0, totalAmount: 0, itemCount: 0 };
      }
    } catch (error) {
      console.error("🔧 DEBUG: Error getting basket summary:", error);
      return { totalItems: 0, totalAmount: 0, itemCount: 0 };
    }
  },

  // Transform server basket to simple object format for frontend
  transformServerBasket(serverBasket) {
    console.log("🔧 DEBUG: Transforming server basket:", serverBasket);

    const basket = {};
    if (serverBasket && serverBasket.items && Array.isArray(serverBasket.items)) {
      console.log("🔧 DEBUG: Server basket has", serverBasket.items.length, "items");

      serverBasket.items.forEach((item, index) => {
        console.log(`🔧 DEBUG: Processing item ${index}:`, item);

        if (item.product && item.product._id) {
          basket[item.product._id] = item.quantity;
          console.log(
            `🔧 DEBUG: Added to basket - ${item.product._id}: ${item.quantity}`
          );
        } else {
          console.warn(`🔧 DEBUG: Invalid item structure at index ${index}:`, item);
        }
      });
    } else {
      console.log("🔧 DEBUG: Server basket is empty or invalid:", serverBasket);
    }

    console.log("🔧 DEBUG: Final transformed basket:", basket);
    return basket;
  },

  // Utility functions
  getBasketItemCount(basket) {
    const count = Object.values(basket).reduce((sum, qty) => sum + qty, 0);
    console.log("🔧 DEBUG: Basket item count:", count);
    return count;
  },

  getProductQuantity(productId, basket) {
    const quantity = basket[productId] || 0;
    console.log(`🔧 DEBUG: Product ${productId} quantity:`, quantity);
    return quantity;
  },

  isProductInBasket(productId, basket) {
    const inBasket = !!(basket[productId] && basket[productId] > 0);
    console.log(`🔧 DEBUG: Product ${productId} in basket:`, inBasket);
    return inBasket;
  },

  formatBasketForDisplay(basket) {
    const itemCount = this.getBasketItemCount(basket);
    const items = Object.entries(basket).map(([productId, quantity]) => ({
      productId,
      quantity,
    }));
    const result = { items, itemCount, isEmpty: itemCount === 0 };
    console.log("🔧 DEBUG: Formatted basket for display:", result);
    return result;
  },

  async getBasketTotal(basket) {
    try {
      const products = await getProducts();
      let total = 0;
      Object.entries(basket).forEach(([productId, quantity]) => {
        const product = products.find((p) => p._id === productId);
        if (product) total += product.price * quantity;
      });
      console.log("🔧 DEBUG: Basket total:", total);
      return total;
    } catch {
      console.log("🔧 DEBUG: Error calculating basket total, returning 0");
      return 0;
    }
  },

  showNotification(message, type = "info") {
    console.log(`🔧 DEBUG: Showing notification - ${type}: ${message}`);

    // Create notification element
    const existingNotifications = document.querySelectorAll(".notification");
    existingNotifications.forEach((notification) => notification.remove());

    const notification = document.createElement("div");
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    // Add styles
    Object.assign(notification.style, {
      position: "fixed",
      top: "20px",
      right: "20px",
      padding: "12px 20px",
      borderRadius: "5px",
      color: "white",
      zIndex: "10000",
      transform: "translateX(100%)",
      transition: "transform 0.3s ease",
      fontFamily: "Arial, sans-serif",
      fontSize: "14px",
      maxWidth: "300px",
      wordWrap: "break-word",
    });

    // Set background color based on type
    const colors = {
      success: "#4CAF50",
      error: "#f44336",
      warning: "#ff9800",
      info: "#2196F3",
    };
    notification.style.backgroundColor = colors[type] || colors.info;

    document.body.appendChild(notification);

    // Show notification
    setTimeout(() => {
      notification.style.transform = "translateX(0)";
    }, 100);

    // Hide notification
    setTimeout(() => {
      notification.style.transform = "translateX(100%)";
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  },
};

// Authentication Service
export const authService = {
  async checkAuth() {
    try {
      console.log("🔧 DEBUG: Checking authentication");

      const response = await fetch(`${API_BASE}/basket/summary`, {
        method: "GET",
        credentials: "include",
      });

      const isAuth = response.ok;
      console.log("🔧 DEBUG: Authentication status:", isAuth);

      if (!isAuth) {
        const responseText = await response.text();
        console.log("🔧 DEBUG: Auth failed response:", responseText);
      }

      return isAuth;
    } catch (error) {
      console.error("🔧 DEBUG: Auth check error:", error);
      return false;
    }
  },

  async logOut() {
    try {
      console.log("🔧 DEBUG: Logging out");
      // Clear basket before logout
      await basketService.clearBasket();
    } catch (error) {
      console.warn("🔧 DEBUG: Could not clear basket on logout:", error);
    }

    window.location.href = "/api/auth/logout";
  },
};

// Image handling utilities
export const imageService = {
  getImagePath(imageName, type = "product") {
    const basePaths = {
      product: "/images/models-images/product-images/",
      category: "/images/models-images/category-images/",
      subcategory: "/images/models-images/subCategory-images/",
    };
    return basePaths[type] + imageName;
  },

  handleImageError(img, type = "product") {
    const defaultImages = {
      product: "/images/models-images/product-images/default-thumbnail.jpeg",
      category: "/images/models-images/category-images/default-category-icon.jpeg",
      subcategory: "/images/models-images/subCategory-images/default-sub-icon.jpeg",
    };

    if (img.src !== defaultImages[type]) {
      img.src = defaultImages[type];
    } else {
      // Use a simple gray placeholder
      img.src =
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23e0e0e0'/%3E%3Ctext x='50' y='50' text-anchor='middle' dy='.3em' fill='%23999' font-family='Arial' font-size='12'%3E📦%3C/text%3E%3C/svg%3E";
    }
  },
};

// Make image handler available globally
window.handleImageError = imageService.handleImageError;

// Debug functions for testing
window.debugBasket = async () => {
  console.log("🔧 === DEBUG BASKET STATE ===");
  try {
    const basket = await basketService.getBasket();
    console.log("🔧 Current basket:", basket);

    const summary = await basketService.getBasketSummary();
    console.log("🔧 Basket summary:", summary);

    const isAuth = await authService.checkAuth();
    console.log("🔧 Is authenticated:", isAuth);
  } catch (error) {
    console.error("🔧 Debug failed:", error);
  }
  console.log("🔧 ========================");
};

window.testAddToBasket = async (productId) => {
  if (!productId) {
    const products = await getProducts();
    productId = products[0]._id;
  }

  console.log("🔧 === TESTING ADD TO BASKET ===");
  console.log("🔧 Using product ID:", productId);

  try {
    const result = await basketService.addToBasket(productId, 1);
    console.log("🔧 Add result:", result);
  } catch (error) {
    console.error("🔧 Add failed:", error);
  }
  console.log("🔧 ===========================");
};

export default {
  getProducts,
  getProductById,
  groupProducts,
  basketService,
  authService,
  imageService,
};
