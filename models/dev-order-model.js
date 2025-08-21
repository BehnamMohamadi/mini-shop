const { Schema, Model } = require("mongoose");

const orderSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },

    products: [
      {
        product: {
          type: Schema.Types.ObjectId,
          ref: "Product",
          required: [true, "Product ID is required"],
        },
        count: { type: Number, required: [true, "product count is required"] },
      },
    ],

    totalPrice: { type: Number, default: 0, min: [0, "Total amount cannot be negative"] },
  },
  {
    timestamps: true,
  }
);

// {
//   user:"2222ew232222222",
//   products:[{product:"e2321we22",count:3},...],-->[{product:{price:"555"},count:3}]
//   totalPrice:0
// }

order.pre("save", async function (next) {
  let total = 0;

  const { products } = await this.populate("products.product", { price: 1 });

  for (const { product, count } of products) {
    total += product.price * count;
  }

  this.totalPrice = total;

  next;
});
