// shop-services.js

export const getProducts = async () => {
  const res = await fetch("http://127.0.0.1:8000/api/products");
  const data = await res.json();
  return data.data.products;
};

export const groupProducts = (products) => {
  const result = {};

  for (const product of products) {
    if (!product.category || !product.subCategory) continue;

    const { name: categoryName, icon: categoryIcon = "default-category-icon" } =
      product.category;
    const { name: subCategoryName, icon: subCategoryIcon = "default-sub-icon" } =
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

export const changeQuantity = (productId, delta) => {
  const cart = JSON.parse(localStorage.getItem("cart") || "{}");

  cart[productId] = (cart[productId] || 0) + delta;

  if (cart[productId] <= 0) {
    delete cart[productId];
  }

  localStorage.setItem("cart", JSON.stringify(cart));
  return cart;
};

export const addToCart = (productId) => {
  const cart = JSON.parse(localStorage.getItem("cart") || "{}");
  cart[productId] = 1;
  localStorage.setItem("cart", JSON.stringify(cart));
  return cart;
};

export const logOut = () => {
  localStorage.removeItem("cart");
  window.location.href = "/logout";
};
