const { Schema, model } = require("mongoose");
const { isEmail, isMobilePhone } = require("validator");
const bcrypt = require("bcrypt");

const UserSchema = new Schema(
  {
    firstname: {
      type: String,
      minlength: [3, "firstname must be atleast 3 charector"],
      maxlength: [30, "firstname must be maximum 30 charector"],
      required: [true, "firstname is required"],
      trim: true,
    },
    lastname: {
      type: String,
      minlength: [3, "lastname must be atleast 3 charector"],
      maxlength: [30, "lastname must be maximum 30 charector"],
      required: [true, "lastname is required"],
      trim: true,
    },
    username: {
      type: String,
      unique: true,
      validate: { validator: (value) => isEmail(value) },
      required: [true, "email is required"],
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      minlength: [8, "password must be at least 8 charector"],
      validate: {
        validator: (pass) => /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(pass),
        message: "password must be have atleast one char or one number",
      },
      required: [true, "password is required"],
      trim: true,
    },
    role: {
      type: String,
      enum: {
        values: ["customer", "admin"],
        message: "role is eather customer or admin",
      },
      default: "customer",
      trim: true,
      lowercase: true,
    },

    phonenumber: {
      type: String,
      default: "",

      validate: {
        validator: (value) => {
          if (value === "") return true;
          return isMobilePhone(value, "fa-IR");
        },
        message: "Provide a valid phone number",
      },
    },

    address: {
      type: String,
      trim: true,
      default: "tehran",
    },

    profile: {
      type: String,
      default: "users-default-profile.jpeg",
    },
  },
  { timestamps: true }
);

UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 12);

  next();
});

UserSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

UserSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  try {
    if (!this.passwordChangedAt) return false;

    const changedTimestamp = Math.floor(this.passwordChangedAt.getTime() / 1000);
    return JWTTimestamp < changedTimestamp;
  } catch (error) {
    console.error("Error in changedPasswordAfter:", error);
    return true;
  }
};

module.exports = model("User", UserSchema);
