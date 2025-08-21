// public/javascript/basket-service.js - Basket Management Module
import { getProducts } from "./shop-services.js";

export class BasketService {
  constructor() {
    this.isInitialized = false;
    this.service = null;
  }

  async initialize() {
    try {
      // Try to import the fixed basket service
      const imported = await import("./basket-service-fixed.js");
      this.service = imported.initBasketService();
      console.log("Fixed basket service loaded successfully");
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.warn("Could not load basket service, using fallback:", error);

      // Fallback basket service
      this.service = {
        async getBasket() {
          try {
            const basket = localStorage.getItem("tempBasket");
            return basket ? JSON.parse(basket) : {};
          } catch {
            return {};
          }
        },

        async addToBasket(productId, quantity = 1) {
          const basket = await this.getBasket();
          basket[productId] = (basket[productId] || 0) + quantity;
          localStorage.setItem("tempBasket", JSON.stringify(basket));
          this.showNotification("محصول اضافه شد", "success");
          return basket;
        },

        async updateQuantity(productId, quantity) {
          const basket = await this.getBasket();
          if (quantity <= 0) {
            delete basket[productId];
          } else {
            basket[productId] = quantity;
          }
          localStorage.setItem("tempBasket", JSON.stringify(basket));
          return basket;
        },

        async removeFromBasket(productId) {
          const basket = await this.getBasket();
          delete basket[productId];
          localStorage.setItem("tempBasket", JSON.stringify(basket));
          this.showNotification("محصول حذف شد", "success");
          return basket;
        },

        async clearBasket() {
          localStorage.setItem("tempBasket", JSON.stringify({}));
          this.showNotification("سبد پاک شد", "success");
          return {};
        },

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
          return { items, itemCount, isEmpty: itemCount === 0 };
        },

        async getBasketTotal(basket) {
          try {
            const products = await getProducts();
            let total = 0;
            Object.entries(basket).forEach(([productId, quantity]) => {
              const product = products.find((p) => p._id === productId);
              if (product) total += product.price * quantity;
            });
            return total;
          } catch {
            return 0;
          }
        },

        showNotification(message, type = "info") {
          if (typeof window.showNotification === "function") {
            window.showNotification(message, type);
          }
        },

        async syncBasket() {
          /* Fallback does nothing */
        },
      };

      this.isInitialized = true;
      return true;
    }
  }

  // Proxy methods to the actual service
  async getBasket() {
    if (!this.isInitialized) await this.initialize();
    return this.service.getBasket();
  }

  async addToBasket(productId, quantity = 1) {
    if (!this.isInitialized) await this.initialize();
    return this.service.addToBasket(productId, quantity);
  }

  async updateQuantity(productId, quantity) {
    if (!this.isInitialized) await this.initialize();
    return this.service.updateQuantity(productId, quantity);
  }

  async removeFromBasket(productId) {
    if (!this.isInitialized) await this.initialize();
    return this.service.removeFromBasket(productId);
  }

  async clearBasket() {
    if (!this.isInitialized) await this.initialize();
    return this.service.clearBasket();
  }

  getBasketItemCount(basket) {
    return this.service?.getBasketItemCount(basket) || 0;
  }

  getProductQuantity(productId, basket) {
    return this.service?.getProductQuantity(productId, basket) || 0;
  }

  isProductInBasket(productId, basket) {
    return this.service?.isProductInBasket(productId, basket) || false;
  }

  formatBasketForDisplay(basket) {
    return (
      this.service?.formatBasketForDisplay(basket) || {
        items: [],
        itemCount: 0,
        isEmpty: true,
      }
    );
  }

  async getBasketTotal(basket) {
    if (!this.isInitialized) await this.initialize();
    return this.service.getBasketTotal(basket);
  }

  showNotification(message, type = "info") {
    if (this.service?.showNotification) {
      this.service.showNotification(message, type);
    }
  }

  async syncBasket() {
    if (!this.isInitialized) await this.initialize();
    return this.service.syncBasket();
  }
}
