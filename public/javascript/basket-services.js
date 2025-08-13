// shop-services.js - API service functions for shop

// API Base URL
const API_BASE_URL = "/api";

// Get all products from server
export async function getProducts() {
  try {
    const response = await fetch(`${API_BASE_URL}/products`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.status === "success" && data.data && data.data.products) {
      return data.data.products;
    } else {
      console.error("Invalid response format:", data);
      return [];
    }
  } catch (error) {
    console.error("Error fetching products:", error);
    throw error;
  }
}

// Group products by category and subcategory
export function groupProducts(products) {
  const grouped = {};

  if (!Array.isArray(products)) {
    console.warn("groupProducts: products is not an array:", products);
    return grouped;
  }

  products.forEach((product) => {
    try {
      // Handle both populated and unpopulated references
      const categoryName =
        typeof product.category === "object" ? product.category.name : product.category;

      const subCategoryName =
        typeof product.subCategory === "object"
          ? product.subCategory.name
          : product.subCategory;

      const categoryIcon =
        typeof product.category === "object"
          ? product.category.icon
          : "default-category-icon.jpeg";

      const subCategoryIcon =
        typeof product.subCategory === "object"
          ? product.subCategory.icon
          : "default-sub-icon.jpeg";

      if (!categoryName || !subCategoryName) {
        console.warn("Product missing category or subcategory:", product);
        return;
      }

      // Initialize category if it doesn't exist
      if (!grouped[categoryName]) {
        grouped[categoryName] = {
          name: categoryName,
          icon: categoryIcon,
          subCategories: {},
        };
      }

      // Initialize subcategory if it doesn't exist
      if (!grouped[categoryName].subCategories[subCategoryName]) {
        grouped[categoryName].subCategories[subCategoryName] = {
          name: subCategoryName,
          icon: subCategoryIcon,
          products: [],
        };
      }

      // Add product to the appropriate subcategory
      grouped[categoryName].subCategories[subCategoryName].products.push(product);
    } catch (error) {
      console.error("Error processing product:", product, error);
    }
  });

  return grouped;
}

// Get product by ID
export async function getProductById(productId) {
  try {
    const response = await fetch(`${API_BASE_URL}/products/${productId}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.status === "success" && data.data) {
      return data.data;
    } else {
      throw new Error("Product not found");
    }
  } catch (error) {
    console.error("Error fetching product:", error);
    throw error;
  }
}

// Get categories
export async function getCategories() {
  try {
    const response = await fetch(`${API_BASE_URL}/categories`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.status === "success" && data.data && data.data.categories) {
      return data.data.categories;
    } else {
      return [];
    }
  } catch (error) {
    console.error("Error fetching categories:", error);
    throw error;
  }
}

// Get subcategories
export async function getSubCategories() {
  try {
    const response = await fetch(`${API_BASE_URL}/sub-categories`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.status === "success" && data.data && data.data.subCategories) {
      return data.data.subCategories;
    } else {
      return [];
    }
  } catch (error) {
    console.error("Error fetching subcategories:", error);
    throw error;
  }
}

// Search products
export async function searchProducts(query) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/products?search=${encodeURIComponent(query)}`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.status === "success" && data.data && data.data.products) {
      return data.data.products;
    } else {
      return [];
    }
  } catch (error) {
    console.error("Error searching products:", error);
    throw error;
  }
}

// Filter products by category
export async function getProductsByCategory(categoryId) {
  try {
    const response = await fetch(`${API_BASE_URL}/products?category=${categoryId}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.status === "success" && data.data && data.data.products) {
      return data.data.products;
    } else {
      return [];
    }
  } catch (error) {
    console.error("Error fetching products by category:", error);
    throw error;
  }
}

// Filter products by subcategory
export async function getProductsBySubCategory(subCategoryId) {
  try {
    const response = await fetch(`${API_BASE_URL}/products?subCategory=${subCategoryId}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.status === "success" && data.data && data.data.products) {
      return data.data.products;
    } else {
      return [];
    }
  } catch (error) {
    console.error("Error fetching products by subcategory:", error);
    throw error;
  }
}

// Logout function
export async function logOut() {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      // Clear localStorage basket on logout
      localStorage.removeItem("userBasket");

      // Redirect to login page
      window.location.href = "/login";
    } else {
      console.error("Logout failed");
      // Force redirect anyway
      window.location.href = "/login";
    }
  } catch (error) {
    console.error("Error during logout:", error);
    // Force redirect on error
    window.location.href = "/login";
  }
}

// Helper function to handle API errors
export function handleApiError(error) {
  console.error("API Error:", error);

  if (error.message.includes("401")) {
    // Unauthorized - redirect to login
    window.location.href = "/login";
  } else if (error.message.includes("403")) {
    // Forbidden
    showNotification("شما دسترسی لازم را ندارید", "error");
  } else if (error.message.includes("404")) {
    // Not found
    showNotification("محتوای درخواستی یافت نشد", "error");
  } else if (error.message.includes("500")) {
    // Server error
    showNotification("خطای سرور، لطفا دوباره تلاش کنید", "error");
  } else {
    // Generic error
    showNotification("خطا در ارتباط با سرور", "error");
  }
}

// Helper function to show notifications (if not defined elsewhere)
function showNotification(message, type = "info") {
  // Check if global showNotification exists
  if (typeof window.showNotification === "function") {
    window.showNotification(message, type);
    return;
  }

  // Fallback notification
  const notification = document.createElement("div");
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    border-radius: 8px;
    color: white;
    font-weight: 600;
    z-index: 10000;
    background: ${
      type === "error" ? "#f44336" : type === "warning" ? "#ff9800" : "#2196F3"
    };
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  `;
  notification.textContent = message;

  document.body.appendChild(notification);

  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 3000);
}

// Cache for products to avoid repeated API calls
let productsCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Get products with caching
export async function getProductsWithCache() {
  const now = Date.now();

  // Check if cache is valid
  if (productsCache && cacheTimestamp && now - cacheTimestamp < CACHE_DURATION) {
    return productsCache;
  }

  try {
    const products = await getProducts();

    // Update cache
    productsCache = products;
    cacheTimestamp = now;

    return products;
  } catch (error) {
    // If API fails and we have cached data, return it
    if (productsCache) {
      console.warn("API failed, using cached data");
      return productsCache;
    }
    throw error;
  }
}

// Clear products cache
export function clearProductsCache() {
  productsCache = null;
  cacheTimestamp = null;
}

export function formatPrice(price) {
  if (typeof price !== "number") {
    return "0 تومان";
  }
  return price.toLocaleString("fa-IR") + " تومان";
}

export function formatProductName(name, maxLength = 50) {
  if (!name) return "";

  if (name.length <= maxLength) {
    return name;
  }

  return name.substring(0, maxLength) + "...";
}

export function getProductImageUrl(thumbnail) {
  const baseUrl = "/images/models-images/product-images/";

  if (!thumbnail) {
    return baseUrl + "default-thumbnail.jpeg";
  }

  return baseUrl + thumbnail;
}

// Debug function to log API responses
export function enableApiDebug() {
  window.apiDebug = true;
}

export function disableApiDebug() {
  window.apiDebug = false;
}
