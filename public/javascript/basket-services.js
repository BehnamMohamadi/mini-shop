// public/javascript/basket-service-fixed.js - Fixed synchronization

// API Base URL
const API_BASE_URL = "/api";
const LOCAL_STORAGE_KEY = "tempBasket";

// Check if user is authenticated
async function isAuthenticated() {
  try {
    const response = await fetch("/api/account", {
      method: "GET",
      credentials: "include",
    });
    return response.ok;
  } catch (error) {
    console.error("Error checking authentication:", error);
    return false;
  }
}

// Transform server basket to match frontend format
function transformServerBasket(serverBasket) {
  const localBasket = {};

  if (serverBasket && serverBasket.items && Array.isArray(serverBasket.items)) {
    serverBasket.items.forEach((item) => {
      if (item.product && item.product._id) {
        localBasket[item.product._id] = item.quantity;
      }
    });
  }

  return localBasket;
}

// LocalStorage helper functions
function getLocalBasket() {
  try {
    const basket = localStorage.getItem(LOCAL_STORAGE_KEY);
    return basket ? JSON.parse(basket) : {};
  } catch (error) {
    console.error("Error reading local basket:", error);
    return {};
  }
}

function setLocalBasket(basket) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(basket));
  } catch (error) {
    console.error("Error saving local basket:", error);
  }
}

// Clear server basket completely
async function clearServerBasket() {
  try {
    const response = await fetch(`${API_BASE_URL}/basket`, {
      method: "DELETE",
      credentials: "include",
    });

    if (response.ok) {
      console.log("Server basket cleared successfully");
      return true;
    } else {
      console.warn("Failed to clear server basket");
      return false;
    }
  } catch (error) {
    console.error("Error clearing server basket:", error);
    return false;
  }
}

// Add item to server basket (exact quantity, not cumulative)
async function setServerBasketItem(productId, quantity) {
  try {
    const response = await fetch(`${API_BASE_URL}/basket/item/${productId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ quantity }),
    });

    if (response.ok) {
      const data = await response.json();
      return transformServerBasket(data.data.basket);
    } else {
      // If item doesn't exist, add it
      const addResponse = await fetch(`${API_BASE_URL}/basket`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ productId, quantity }),
      });

      if (addResponse.ok) {
        const data = await addResponse.json();
        return transformServerBasket(data.data.basket);
      } else {
        throw new Error("Failed to set server basket item");
      }
    }
  } catch (error) {
    console.error(`Error setting server basket item ${productId}:`, error);
    throw error;
  }
}

// Enhanced basket service with proper sync
const basketService = {
  // Get basket from server first, fallback to localStorage
  async getBasket() {
    try {
      const isAuth = await isAuthenticated();

      if (isAuth) {
        console.log("User authenticated, getting basket from server...");
        const response = await fetch(`${API_BASE_URL}/basket`, {
          method: "GET",
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          const serverBasket = transformServerBasket(data.data.basket);

          console.log("Server basket:", serverBasket);

          // Always prioritize server data and update localStorage
          setLocalBasket(serverBasket);
          return serverBasket;
        } else {
          console.warn("Failed to get basket from server, using local basket");
        }
      } else {
        console.log("User not authenticated, using localStorage");
      }

      // Fallback to localStorage
      return getLocalBasket();
    } catch (error) {
      console.error("Error getting basket:", error);
      return getLocalBasket();
    }
  },

  // Add item to basket (server first, then localStorage)
  async addToBasket(productId, quantity = 1) {
    try {
      const isAuth = await isAuthenticated();

      if (isAuth) {
        console.log(`Adding ${quantity} of product ${productId} to server basket...`);

        const response = await fetch(`${API_BASE_URL}/basket`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ productId, quantity }),
        });

        if (response.ok) {
          const data = await response.json();
          const updatedBasket = transformServerBasket(data.data.basket);

          console.log("Server basket updated after add:", updatedBasket);

          // Update localStorage to match server
          setLocalBasket(updatedBasket);

          this.showNotification(data.message || "محصول اضافه شد", "success");
          return updatedBasket;
        } else {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to add to server basket");
        }
      } else {
        // Add to localStorage only (guest user)
        const localBasket = getLocalBasket();
        localBasket[productId] = (localBasket[productId] || 0) + quantity;
        setLocalBasket(localBasket);

        this.showNotification("محصول اضافه شد", "success");
        return localBasket;
      }
    } catch (error) {
      console.error("Error adding to basket:", error);
      this.showNotification(error.message || "خطا در اضافه کردن محصول", "error");

      // Fallback to localStorage
      const localBasket = getLocalBasket();
      localBasket[productId] = (localBasket[productId] || 0) + quantity;
      setLocalBasket(localBasket);
      return localBasket;
    }
  },

  // Update item quantity (exact quantity, not cumulative)
  async updateQuantity(productId, quantity) {
    try {
      const isAuth = await isAuthenticated();

      if (isAuth) {
        console.log(
          `Setting product ${productId} quantity to exactly ${quantity} on server...`
        );

        if (quantity <= 0) {
          // Remove item
          const response = await fetch(`${API_BASE_URL}/basket/item/${productId}`, {
            method: "DELETE",
            credentials: "include",
          });

          if (response.ok) {
            const data = await response.json();
            const updatedBasket = transformServerBasket(data.data.basket);

            console.log("Server basket after remove:", updatedBasket);
            setLocalBasket(updatedBasket);
            return updatedBasket;
          }
        } else {
          // Update to exact quantity
          const updatedBasket = await setServerBasketItem(productId, quantity);
          console.log("Server basket after quantity update:", updatedBasket);
          setLocalBasket(updatedBasket);
          return updatedBasket;
        }
      } else {
        // Update localStorage only (guest user)
        const localBasket = getLocalBasket();
        if (quantity <= 0) {
          delete localBasket[productId];
        } else {
          localBasket[productId] = quantity;
        }
        setLocalBasket(localBasket);
        return localBasket;
      }
    } catch (error) {
      console.error("Error updating quantity:", error);
      this.showNotification(error.message || "خطا در تغییر تعداد", "error");

      // Fallback to localStorage
      const localBasket = getLocalBasket();
      if (quantity <= 0) {
        delete localBasket[productId];
      } else {
        localBasket[productId] = quantity;
      }
      setLocalBasket(localBasket);
      return localBasket;
    }
  },

  // Remove item from basket
  async removeFromBasket(productId) {
    return await this.updateQuantity(productId, 0);
  },

  // Clear entire basket
  async clearBasket() {
    try {
      const isAuth = await isAuthenticated();

      if (isAuth) {
        console.log("Clearing server basket...");
        const success = await clearServerBasket();

        if (success) {
          setLocalBasket({});
          this.showNotification("سبد پاک شد", "success");
          return {};
        } else {
          throw new Error("Failed to clear server basket");
        }
      } else {
        // Clear localStorage only (guest user)
        setLocalBasket({});
        this.showNotification("سبد پاک شد", "success");
        return {};
      }
    } catch (error) {
      console.error("Error clearing basket:", error);
      this.showNotification(error.message || "خطا در پاک کردن سبد", "error");

      // Fallback: clear localStorage
      setLocalBasket({});
      return {};
    }
  },

  // FIXED: Complete basket synchronization
  async syncBasket() {
    try {
      const localBasket = getLocalBasket();
      const isAuth = await isAuthenticated();

      if (!isAuth) {
        console.log("User not authenticated, skipping sync");
        return localBasket;
      }

      console.log("Starting complete basket synchronization...");
      console.log("Local basket before sync:", localBasket);

      // Step 1: Get current server basket
      const response = await fetch(`${API_BASE_URL}/basket`, {
        method: "GET",
        credentials: "include",
      });

      let serverBasket = {};
      if (response.ok) {
        const data = await response.json();
        serverBasket = transformServerBasket(data.data.basket);
        console.log("Current server basket:", serverBasket);
      }

      // Step 2: Determine if sync is needed
      const localItems = Object.keys(localBasket);
      const serverItems = Object.keys(serverBasket);

      const needsSync =
        localItems.length !== serverItems.length ||
        localItems.some((id) => localBasket[id] !== serverBasket[id]);

      if (!needsSync) {
        console.log("Baskets are already in sync");
        return localBasket;
      }

      console.log("Baskets differ, performing full sync...");

      // Step 3: Clear server basket completely
      await clearServerBasket();

      // Step 4: Add all local items to server with exact quantities
      if (localItems.length > 0) {
        console.log("Syncing local items to server...");

        for (const [productId, quantity] of Object.entries(localBasket)) {
          if (quantity > 0) {
            try {
              console.log(`Syncing product ${productId} with quantity ${quantity}`);
              await setServerBasketItem(productId, quantity);
            } catch (error) {
              console.warn(`Failed to sync product ${productId}:`, error.message);
            }
          }
        }
      }

      // Step 5: Get final synced basket from server
      const finalResponse = await fetch(`${API_BASE_URL}/basket`, {
        method: "GET",
        credentials: "include",
      });

      if (finalResponse.ok) {
        const finalData = await finalResponse.json();
        const finalBasket = transformServerBasket(finalData.data.basket);

        console.log("Final synchronized basket:", finalBasket);

        // Update localStorage to match server
        setLocalBasket(finalBasket);

        console.log("Basket synchronization completed successfully");
        this.showNotification("سبد همگام‌سازی شد", "success");

        return finalBasket;
      } else {
        console.error("Failed to get final basket after sync");
        return localBasket;
      }
    } catch (error) {
      console.error("Error during basket sync:", error);
      this.showNotification("خطا در همگام‌سازی", "error");
      return getLocalBasket();
    }
  },

  // Helper functions (unchanged)
  getBasketItemCount(basket) {
    return Object.values(basket).reduce((sum, qty) => sum + qty, 0);
  },

  getProductQuantity(productId, basket) {
    return basket[productId] || 0;
  },

  isProductInBasket(productId, basket) {
    return !!(basket[productId] && basket[productId] > 0);
  },

  formatBasketForDisplay(basket) {
    const itemCount = this.getBasketItemCount(basket);
    const items = Object.entries(basket).map(([productId, quantity]) => ({
      productId,
      quantity,
    }));

    return {
      items,
      itemCount,
      isEmpty: itemCount === 0,
    };
  },

  async getBasketTotal(basket) {
    try {
      // Import getProducts from shop-services
      const { getProducts } = await import("./shop-services.js");
      const products = await getProducts();

      let total = 0;
      Object.entries(basket).forEach(([productId, quantity]) => {
        const product = products.find((p) => p._id === productId);
        if (product) {
          total += product.price * quantity;
        }
      });

      return total;
    } catch (error) {
      console.error("Error calculating basket total:", error);
      return 0;
    }
  },

  // Show notification helper
  showNotification(message, type = "info") {
    if (typeof window.showNotification === "function") {
      window.showNotification(message, type);
      return;
    }

    const notification = document.createElement("div");
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 16px;
      border-radius: 6px;
      color: white;
      font-size: 14px;
      font-weight: 600;
      z-index: 10000;
      max-width: 300px;
      background: ${
        type === "success"
          ? "#4CAF50"
          : type === "error"
          ? "#f44336"
          : type === "warning"
          ? "#ff9800"
          : "#2196F3"
      };
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transform: translateX(100%);
      transition: transform 0.3s ease;
    `;
    notification.textContent = message;

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

// Initialize basket service
function initBasketService() {
  console.log("Fixed synchronized basket service initialized");

  return basketService;
}

// Export the service
export {
  basketService,
  initBasketService,
  isAuthenticated,
  transformServerBasket,
  getLocalBasket,
  setLocalBasket,
};
