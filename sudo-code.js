//USER-PRODUCT-ORDER-CATEGORY-SUBCATEGORY

const { string } = require("joi");

const USER = {
  id: "USER-ID",
};

const ORDER = {
  id: "ORDER-ID",
  user: USER.id,
  products: [PRODUCT.id, PRODUCT.id, PRODUCT.id],
};

const PRODUCT = {
  id: "PRODUCT-ID",
  category: CATEGORY.id,
  subcategry: SUBCATEGORY.id,
};

const CATEGORY = {
  id: "CATEGORY.ID",
};

const SUBCATEGORY = {
  id: "CATEGORY.ID",
  category: CATEGORY.id,
};
