// shop-services.js - Complete rewritten file

console.log("DEBUG: Shop services loaded - Backend integration with fixes");

// API Base URL
const API_BASE = "http://127.0.0.1:8000/api";

// Product Services
export const getProducts = async () => {
  try {
    console.log("DEBUG: Fetching products from:", `${API_BASE}/products`);
    const response = await fetch(`${API_BASE}/products`);
    console.log("DEBUG: Products response status:", response.status);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log("DEBUG: Products data received:", data.data.products.length, "products");
    return data.data.products;
  } catch (error) {
    console.error("DEBUG: Error fetching products:", error);
    throw error;
  }
};

export const getProductById = async (productId) => {
  try {
    console.log("DEBUG: Fetching product:", productId);
    const response = await fetch(`${API_BASE}/products/${productId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log("DEBUG: Product fetched:", data.data.name);
    return data.data;
  } catch (error) {
    console.error("DEBUG: Error fetching product:", error);
    throw error;
  }
};

export const groupProducts = (products) => {
  console.log("DEBUG: Grouping", products.length, "products");
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

  console.log("DEBUG: Products grouped into", Object.keys(result).length, "categories");
  return result;
};

// Complete Basket Services with fixes
export const basketService = {
  // Get basket from database
  async getBasket() {
    try {
      console.log("DEBUG: Getting basket from:", `${API_BASE}/basket`);

      const response = await fetch(`${API_BASE}/basket`, {
        method: "GET",
        credentials: "include",
      });

      console.log("DEBUG: Basket response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("DEBUG: Raw basket data from server:", data);

        const basket = data.data.basket;
        const transformedBasket = this.transformServerBasket(basket);
        console.log("DEBUG: Transformed basket:", transformedBasket);

        return transformedBasket;
      } else if (response.status === 401) {
        console.warn("DEBUG: User not authenticated");
        return {};
      } else {
        console.warn("DEBUG: Failed to get basket:", response.status);
        return {};
      }
    } catch (error) {
      console.error("DEBUG: Error getting basket:", error);
      return {};
    }
  },

  // Get basket summary
  async getBasketSummary() {
    try {
      console.log("DEBUG: Getting basket summary");

      const response = await fetch(`${API_BASE}/basket/summary`, {
        method: "GET",
        credentials: "include",
      });

      console.log("DEBUG: Basket summary response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("DEBUG: Basket summary data:", data);

        return data.data;
      } else {
        console.log("DEBUG: Basket summary failed, returning defaults");
        return { totalItems: 0, totalPrice: 0, itemCount: 0, basketStatus: "open" };
      }
    } catch (error) {
      console.error("DEBUG: Error getting basket summary:", error);
      return { totalItems: 0, totalPrice: 0, itemCount: 0, basketStatus: "open" };
    }
  },

  // Add to basket in database
  async addToBasket(productId, count = 1) {
    try {
      console.log("DEBUG: Adding to basket:", { productId, count });

      const response = await fetch(`${API_BASE}/basket`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ productId, count }),
      });

      console.log("DEBUG: Add to basket response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("DEBUG: Add to basket success data:", data);
        this.showNotification(data.message || "محصول اضافه شد", "success");
        return this.transformServerBasket(data.data.basket);
      } else {
        const errorText = await response.text();
        console.error("DEBUG: Add to basket failed:", response.status, errorText);

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
      console.error("DEBUG: Error adding to basket:", error);
      this.showNotification("خطا در افزودن محصول", "error");
      throw error;
    }
  },

  // Update count in database
  async updateQuantity(productId, count) {
    try {
      console.log("DEBUG: updateQuantity called with:", { productId, count });

      if (count <= 0) {
        console.log("DEBUG: Count is 0 or less, removing from basket");
        return await this.removeFromBasket(productId);
      }

      console.log("DEBUG: Making PUT request to update quantity");

      const response = await fetch(`${API_BASE}/basket/item/${productId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ count }),
      });

      console.log("DEBUG: Update quantity response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("DEBUG: Update quantity success data:", data);

        const transformedBasket = this.transformServerBasket(data.data.basket);
        console.log("DEBUG: Transformed basket:", transformedBasket);

        return transformedBasket;
      } else {
        const errorText = await response.text();
        console.error("DEBUG: Update quantity failed:", response.status, errorText);

        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (parseError) {
          console.error("DEBUG: Could not parse error response:", parseError);
          throw new Error(`Server error: ${response.status} - ${errorText}`);
        }

        console.error("DEBUG: Parsed error data:", errorData);
        throw new Error(errorData.message || `خطا در به‌روزرسانی: ${response.status}`);
      }
    } catch (error) {
      console.error("DEBUG: Exception in updateQuantity:", error);
      throw error;
    }
  },

  // Remove from basket in database
  async removeFromBasket(productId) {
    try {
      console.log("DEBUG: Removing from basket:", productId);

      const response = await fetch(`${API_BASE}/basket/item/${productId}`, {
        method: "DELETE",
        credentials: "include",
      });

      console.log("DEBUG: Remove from basket response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("DEBUG: Remove from basket success:", data);
        this.showNotification(data.message || "محصول حذف شد", "success");
        return this.transformServerBasket(data.data.basket);
      } else {
        const errorText = await response.text();
        console.error("DEBUG: Remove from basket failed:", response.status, errorText);

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
      console.error("DEBUG: Error removing from basket:", error);
      this.showNotification("خطا در حذف محصول", "error");
      throw error;
    }
  },

  // Clear entire basket in database
  async clearBasket() {
    try {
      console.log("DEBUG: Clearing basket");

      const response = await fetch(`${API_BASE}/basket`, {
        method: "DELETE",
        credentials: "include",
      });

      console.log("DEBUG: Clear basket response status:", response.status);

      if (response.ok) {
        console.log("DEBUG: Clear basket success");
        this.showNotification("سبد پاک شد", "success");
        return {};
      } else {
        const errorText = await response.text();
        console.error("DEBUG: Clear basket failed:", response.status, errorText);

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
      console.error("DEBUG: Error clearing basket:", error);
      this.showNotification("خطا در پاک کردن سبد", "error");
      throw error;
    }
  },

  // Update basket status
  async updateBasketStatus(status) {
    try {
      console.log("DEBUG: Updating basket status to:", status);

      const response = await fetch(`${API_BASE}/basket/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ status }),
      });

      console.log("DEBUG: Update status response:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("DEBUG: Status update success:", data);
        this.showNotification(data.message || "وضعیت سبد به‌روزرسانی شد", "success");

        if (status === "finished") {
          console.log("DEBUG: Order completed successfully");
          return {};
        }

        return this.transformServerBasket(data.data.basket);
      } else {
        const errorText = await response.text();
        console.error("DEBUG: Status update failed:", response.status, errorText);

        try {
          const errorData = JSON.parse(errorText);
          this.showNotification(errorData.message || "خطا در به‌روزرسانی وضعیت", "error");
          throw new Error(errorData.message);
        } catch (parseError) {
          this.showNotification("خطا در به‌روزرسانی وضعیت سبد", "error");
          throw new Error(`Server error: ${response.status}`);
        }
      }
    } catch (error) {
      console.error("DEBUG: Error updating basket status:", error);
      this.showNotification("خطا در به‌روزرسانی وضعیت سبد", "error");
      throw error;
    }
  },

  // Get basket history
  async getBasketHistory() {
    try {
      console.log("DEBUG: Getting basket history");

      const response = await fetch(`${API_BASE}/basket/history`, {
        method: "GET",
        credentials: "include",
      });

      console.log("DEBUG: Basket history response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("DEBUG: Basket history data:", data);
        return data.data.baskets || [];
      } else {
        console.log("DEBUG: Basket history failed");
        return [];
      }
    } catch (error) {
      console.error("DEBUG: Error getting basket history:", error);
      return [];
    }
  },

  // Transform server basket to simple object format for frontend
  transformServerBasket(serverBasket) {
    console.log("DEBUG: Transforming server basket:", serverBasket);

    const basket = {};
    if (serverBasket && serverBasket.products && Array.isArray(serverBasket.products)) {
      console.log(
        "DEBUG: Server basket has",
        serverBasket.products.length,
        "product types"
      );

      serverBasket.products.forEach((item, index) => {
        console.log(`DEBUG: Processing product ${index}:`, {
          productId: item.product?._id,
          count: item.count,
          productName: item.product?.name,
        });

        if (item.product && item.product._id && item.count > 0) {
          basket[item.product._id] = item.count;
          console.log(`DEBUG: Added to basket - ${item.product._id}: ${item.count}`);
        } else {
          console.warn(`DEBUG: Invalid product structure at index ${index}:`, item);
        }
      });
    } else {
      console.log("DEBUG: Server basket is empty or invalid:", serverBasket);
    }

    console.log("DEBUG: Final transformed basket:", basket);
    return basket;
  },

  // Helper function to get status text in Persian
  getStatusText(status) {
    const statusTexts = {
      open: "فعال",
      pending: "در انتظار پرداخت",
      finished: "تکمیل شده",
    };
    return statusTexts[status] || status;
  },

  // Utility functions
  getBasketItemCount(basket) {
    const count = Object.values(basket).reduce((sum, qty) => {
      const quantity = parseInt(qty) || 0;
      return sum + quantity;
    }, 0);
    console.log("DEBUG: Basket item count calculation:", {
      basketItems: basket,
      totalCount: count,
    });
    return count;
  },

  getProductQuantity(productId, basket) {
    const quantity = basket[productId] || 0;
    console.log(`DEBUG: Product ${productId} quantity:`, quantity);
    return quantity;
  },

  isProductInBasket(productId, basket) {
    const inBasket = !!(basket[productId] && basket[productId] > 0);
    console.log(`DEBUG: Product ${productId} in basket:`, inBasket);
    return inBasket;
  },

  formatBasketForDisplay(basket) {
    const itemCount = this.getBasketItemCount(basket);
    const items = Object.entries(basket).map(([productId, count]) => ({
      productId,
      quantity: count,
    }));
    const result = { items, itemCount, isEmpty: itemCount === 0 };
    console.log("DEBUG: Formatted basket for display:", result);
    return result;
  },

  async getBasketTotal(basket) {
    try {
      const products = await getProducts();
      let total = 0;
      Object.entries(basket).forEach(([productId, count]) => {
        const product = products.find((p) => p._id === productId);
        if (product) {
          const itemTotal = product.price * count;
          total += itemTotal;
          console.log(
            `DEBUG: ${product.name}: ${count} × ${product.price} = ${itemTotal}`
          );
        }
      });
      console.log("DEBUG: Basket total:", total);
      return total;
    } catch (error) {
      console.error("DEBUG: Error calculating basket total:", error);
      return 0;
    }
  },

  // Enhanced notification system
  showNotification(message, type = "info") {
    console.log(`DEBUG: Showing notification - ${type}: ${message}`);

    const existingNotifications = document.querySelectorAll(".notification");
    existingNotifications.forEach((notification) => notification.remove());

    const notification = document.createElement("div");
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

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
      boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)",
    });

    const colors = {
      success: "#4CAF50",
      error: "#f44336",
      warning: "#ff9800",
      info: "#2196F3",
    };
    notification.style.backgroundColor = colors[type] || colors.info;

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
    }, 3000);
  },
};

// Authentication Service
export const authService = {
  async checkAuth() {
    try {
      console.log("DEBUG: Checking authentication");

      const response = await fetch(`${API_BASE}/basket/summary`, {
        method: "GET",
        credentials: "include",
      });

      const isAuth = response.ok;
      console.log("DEBUG: Authentication status:", isAuth);

      if (!isAuth) {
        const responseText = await response.text();
        console.log("DEBUG: Auth failed response:", responseText);
      }

      return isAuth;
    } catch (error) {
      console.error("DEBUG: Auth check error:", error);
      return false;
    }
  },

  async logOut() {
    try {
      console.log("DEBUG: Logging out");
    } catch (error) {
      console.warn("DEBUG: Could not clear basket on logout:", error);
    }

    window.location.href = "/api/auth/logout";
  },

  async getUserInfo() {
    try {
      console.log("DEBUG: Getting user info");

      const response = await fetch(`${API_BASE}/account`, {
        method: "GET",
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        console.log("DEBUG: User info:", data.data.user);
        return data.data.user;
      } else {
        console.log("DEBUG: Failed to get user info");
        return null;
      }
    } catch (error) {
      console.error("DEBUG: Error getting user info:", error);
      return null;
    }
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
      img.src =
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23e0e0e0'/%3E%3Ctext x='50' y='50' text-anchor='middle' dy='.3em' fill='%23999' font-family='Arial' font-size='12'%3E📦%3C/text%3E%3C/svg%3E";
    }
  },
};
// Add this wishlistService to your shop-services.js file

export const wishlistService = {
  // Toggle product in/out of wishlist
  async toggleWishlist(productId) {
    try {
      console.log("DEBUG: Toggling wishlist for product:", productId);

      const response = await fetch(`${API_BASE}/wishlist/toggle/${productId}`, {
        method: "POST",
        credentials: "include",
      });

      console.log("DEBUG: Toggle wishlist response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("DEBUG: Toggle wishlist success:", data);
        this.showNotification(data.data.message, "success");
        return data.data;
      } else {
        const errorText = await response.text();
        console.error("DEBUG: Toggle wishlist failed:", response.status, errorText);
        throw new Error("خطا در به‌روزرسانی علاقه‌مندی‌ها");
      }
    } catch (error) {
      console.error("DEBUG: Error toggling wishlist:", error);
      this.showNotification("خطا در به‌روزرسانی علاقه‌مندی‌ها", "error");
      throw error;
    }
  },

  // Get user's wishlist
  async getWishlist() {
    try {
      console.log("DEBUG: Getting user wishlist");

      const response = await fetch(`${API_BASE}/wishlist`, {
        method: "GET",
        credentials: "include",
      });

      console.log("DEBUG: Get wishlist response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("DEBUG: Wishlist data:", data);
        return data.data.wishlist || [];
      } else {
        console.log("DEBUG: Get wishlist failed");
        return [];
      }
    } catch (error) {
      console.error("DEBUG: Error getting wishlist:", error);
      return [];
    }
  },

  // Check if product is in wishlist
  async checkWishlistStatus(productId) {
    try {
      const response = await fetch(`${API_BASE}/wishlist/check/${productId}`, {
        method: "GET",
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        return data.data.isInWishlist;
      } else {
        return false;
      }
    } catch (error) {
      console.error("DEBUG: Error checking wishlist status:", error);
      return false;
    }
  },

  // Get wishlist count
  async getWishlistCount() {
    try {
      const response = await fetch(`${API_BASE}/wishlist/count`, {
        method: "GET",
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        return data.data.count || 0;
      } else {
        return 0;
      }
    } catch (error) {
      console.error("DEBUG: Error getting wishlist count:", error);
      return 0;
    }
  },

  // Remove from wishlist
  async removeFromWishlist(productId) {
    try {
      console.log("DEBUG: Removing from wishlist:", productId);

      const response = await fetch(`${API_BASE}/wishlist/${productId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        this.showNotification(data.data.message, "success");
        return true;
      } else {
        throw new Error("خطا در حذف از علاقه‌مندی‌ها");
      }
    } catch (error) {
      console.error("DEBUG: Error removing from wishlist:", error);
      this.showNotification("خطا در حذف از علاقه‌مندی‌ها", "error");
      return false;
    }
  },

  // Clear entire wishlist
  async clearWishlist() {
    try {
      console.log("DEBUG: Clearing wishlist");

      const response = await fetch(`${API_BASE}/wishlist`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        this.showNotification(data.data.message, "success");
        return true;
      } else {
        throw new Error("خطا در پاک کردن علاقه‌مندی‌ها");
      }
    } catch (error) {
      console.error("DEBUG: Error clearing wishlist:", error);
      this.showNotification("خطا در پاک کردن علاقه‌مندی‌ها", "error");
      return false;
    }
  },

  // Show notification (reuse from basketService)
  showNotification(message, type = "info") {
    console.log(`DEBUG: Showing notification - ${type}: ${message}`);

    const existingNotifications = document.querySelectorAll(".notification");
    existingNotifications.forEach((notification) => notification.remove());

    const notification = document.createElement("div");
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

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
      boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)",
    });

    const colors = {
      success: "#4CAF50",
      error: "#f44336",
      warning: "#ff9800",
      info: "#2196F3",
    };
    notification.style.backgroundColor = colors[type] || colors.info;

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
    }, 3000);
  },
};
// Make image handler globally available
window.handleImageError = imageService.handleImageError;

// Export all services as default
export default {
  getProducts,
  getProductById,
  groupProducts,
  basketService,
  authService,
  imageService,
};
