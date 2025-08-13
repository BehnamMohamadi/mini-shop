const groupProducts = (products) => {
  const result = {};

  for (const product of products) {
    const categoryName = product.category.name;
    const subCategoryName = product.subCategory.name;

    if (!result[categoryName]) {
      result[categoryName] = {};
    }

    if (!result[categoryName][subCategoryName]) {
      result[categoryName][subCategoryName] = [];
    }

    result[categoryName][subCategoryName].push(product);
  }

  return result;
};

const getProducts = async () => {
  const res = await fetch("http://127.0.0.1:8000/api/products");
  const data = await res.json();
  return data.data.products;
};

const renderGroupedProducts = (grouped) => {
  const container = document.getElementById("product-container");

  for (const category in grouped) {
    const categoryTitle = document.createElement("h2");
    categoryTitle.className = "category-title";
    categoryTitle.textContent = `کالاهای گروه ${category}`;
    container.appendChild(categoryTitle);

    const subCategories = grouped[category];
    for (const subCategory in subCategories) {
      const subCategoryTitle = document.createElement("h3");
      subCategoryTitle.className = "subcategory-title";
      subCategoryTitle.textContent = `زیرگروه ${subCategory}`;
      container.appendChild(subCategoryTitle);

      const productGrid = document.createElement("div");
      productGrid.className = "product-grid";

      subCategories[subCategory].forEach((product) => {
        const card = document.createElement("div");
        card.className = "product-card";

        card.innerHTML = `
          <img src="${product.imageUrl || "https://via.placeholder.com/300"}" alt="${
          product.name
        }" />
          <div class="product-name">${product.name}</div>
          <div class="product-price">${product.price.toLocaleString()} تومان</div>
        `;

        productGrid.appendChild(card);
      });

      container.appendChild(productGrid);
    }
  }
};

(async () => {
  const products = await getProducts();
  const grouped = groupProducts(products);
  renderGroupedProducts(grouped);
})();
