// public/javascript/ui-manager.js - UI Management Module

export class UIManager {
  constructor() {
    this.defaultImages = {
      product: "/images/models-images/product-images/default-thumbnail.jpeg",
      category: "/images/models-images/category-images/default-category-icon.jpeg",
      subcategory: "/images/models-images/subCategory-images/default-sub-icon.jpeg",
    };
  }

  // Enhanced image error handling
  handleImageError(img, type = "product") {
    if (img.src !== this.defaultImages[type]) {
      img.src = this.defaultImages[type];
    } else {
      img.src =
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23e0e0e0'/%3E%3Ctext x='50' y='50' text-anchor='middle' dy='.3em' fill='%23999' font-family='Arial' font-size='12'%3E📦%3C/text%3E%3C/svg%3E";
    }
  }

  getImagePath(imageName, type = "product") {
    const basePaths = {
      product: "/images/models-images/product-images/",
      category: "/images/models-images/category-images/",
      subcategory: "/images/models-images/subCategory-images/",
    };
    return basePaths[type] + imageName;
  }

  showNotification(message, type = "info") {
    const existingNotifications = document.querySelectorAll(".notification");
    existingNotifications.forEach((notification) => notification.remove());

    const notification = document.createElement("div");
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add("show");
    }, 100);

    setTimeout(() => {
      notification.classList.remove("show");
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 2000);
  }

  // Enhanced product rendering function
  renderGroupedProducts(groupedData, currentBasket, basketService) {
    const productContainer = document.getElementById("product-container");
    if (!productContainer) {
      console.error("Product container not found");
      return;
    }

    productContainer.innerHTML = "";

    try {
      for (const categoryName in groupedData) {
        console.log("Rendering category:", categoryName);

        const categoryTitleElement = document.createElement("h2");
        categoryTitleElement.textContent = categoryName;
        categoryTitleElement.className = "category-title";
        productContainer.appendChild(categoryTitleElement);

        const subCategories = groupedData[categoryName].subCategories;

        for (const subCategoryName in subCategories) {
          console.log("Rendering subcategory:", subCategoryName);

          const subCategoryTitleElement = document.createElement("h3");
          subCategoryTitleElement.textContent = subCategoryName;
          subCategoryTitleElement.className = "subcategory-title";
          productContainer.appendChild(subCategoryTitleElement);

          const productGridElement = document.createElement("div");
          productGridElement.className = "product-grid";

          const products = subCategories[subCategoryName].products;
          console.log(`Products in ${subCategoryName}:`, products.length);

          products.forEach((product) => {
            try {
              const quantity = basketService
                ? basketService.getProductQuantity(product._id, currentBasket)
                : 0;
              const imagePath = this.getImagePath(product.thumbnail, "product");

              const productCard = document.createElement("div");
              productCard.setAttribute("data-product-id", product._id);
              productCard.className = "product-card";

              productCard.innerHTML = `
                <div class="product-image-container">
                  <img 
                    src="${imagePath}" 
                    alt="${product.name}" 
                    onerror="window.uiManager.handleImageError(this, 'product')"
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
                    <button onclick="viewProductDetails('${
                      product._id
                    }')" class="details-btn">مشاهده جزئیات</button>
                    
                    <div class="product-actions">
                      ${
                        quantity > 0
                          ? `
                        <div class="quantity-controls">
                          <button onclick="changeQuantity('${product._id}', ${
                              quantity - 1
                            })" class="quantity-btn">-</button>
                          <span class="quantity-display">${quantity}</span>
                          <button onclick="changeQuantity('${product._id}', ${
                              quantity + 1
                            })" class="quantity-btn">+</button>
                        </div>
                        `
                          : `<button onclick="addToCart('${product._id}')" class="buy-btn">خرید</button>`
                      }
                    </div>
                  </div>
                </div>
              `;

              productGridElement.appendChild(productCard);
            } catch (productError) {
              console.error("Error rendering product:", product, productError);
            }
          });

          productContainer.appendChild(productGridElement);
        }
      }
      console.log("Products rendered successfully");
    } catch (error) {
      console.error("Error in renderGroupedProducts:", error);
      productContainer.innerHTML = `
        <div class="error-container">
          <h2>خطا در نمایش محصولات</h2>
          <p>مشکل: ${error.message}</p>
          <button onclick="window.location.reload()" class="retry-btn">تلاش مجدد</button>
        </div>
      `;
    }
  }

  showSubCategories(category, grouped, showProducts) {
    const productContainer = document.getElementById("product-container");
    if (!productContainer) return;

    productContainer.innerHTML = "";

    if (!grouped[category] || !grouped[category].subCategories) {
      this.showNotification("دسته‌بندی یافت نشد", "error");
      return;
    }

    const subCategories = grouped[category].subCategories;

    for (const sub in subCategories) {
      const imagePath = this.getImagePath(subCategories[sub].icon, "subcategory");

      const btn = document.createElement("div");
      btn.className = "subcategory-card";

      btn.innerHTML = `
        <img src="${imagePath}" 
             alt="${sub}" 
             onerror="window.uiManager.handleImageError(this, 'subcategory')" 
             class="subcategory-image" />
        <div class="subcategory-name">${sub}</div>
      `;

      btn.addEventListener("click", () =>
        showProducts(subCategories[sub].products, category)
      );
      productContainer.appendChild(btn);
    }

    const backBtn = document.createElement("button");
    backBtn.textContent = "⬅ بازگشت به دسته‌بندی‌ها";
    backBtn.className = "back-btn";
    backBtn.addEventListener("click", () => {
      const categoryIcon = document.querySelector(".bx-grid-alt");
      categoryIcon?.click();
    });
    productContainer.appendChild(backBtn);
  }

  showProducts(products, categoryName, currentBasket, basketService, showSubCategories) {
    const productContainer = document.getElementById("product-container");
    if (!productContainer) return;

    productContainer.innerHTML = "";

    if (!products || products.length === 0) {
      productContainer.innerHTML = `
        <div class="no-products">
          <p>محصولی در این دسته یافت نشد</p>
        </div>
      `;
      return;
    }

    products.forEach((product) => {
      const quantity = basketService
        ? basketService.getProductQuantity(product._id, currentBasket)
        : 0;
      const imagePath = this.getImagePath(product.thumbnail, "product");

      const card = document.createElement("div");
      card.setAttribute("data-product-id", product._id);
      card.className = "product-card";

      card.innerHTML = `
        <div class="product-image-container">
          <img 
            src="${imagePath}" 
            alt="${product.name}" 
            onerror="window.uiManager.handleImageError(this, 'product')"
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
            <button onclick="viewProductDetails('${
              product._id
            }')" class="details-btn">مشاهده جزئیات</button>
            
            <div class="product-actions">
              ${
                quantity > 0
                  ? `
                <div class="quantity-controls">
                  <button onclick="changeQuantity('${product._id}', ${
                      quantity - 1
                    })" class="quantity-btn">-</button>
                  <span class="quantity-display">${quantity}</span>
                  <button onclick="changeQuantity('${product._id}', ${
                      quantity + 1
                    })" class="quantity-btn">+</button>
                </div>
                `
                  : `<button onclick="addToCart('${product._id}')" class="buy-btn">خرید</button>`
              }
            </div>
          </div>
        </div>
      `;

      productContainer.appendChild(card);
    });

    const backBtn = document.createElement("button");
    backBtn.textContent = "⬅ بازگشت به زیردسته‌ها";
    backBtn.className = "back-btn";
    backBtn.addEventListener("click", () => {
      showSubCategories(categoryName);
    });
    productContainer.appendChild(backBtn);
  }
}

// Make UI manager available globally for image error handling
window.uiManager = new UIManager();
