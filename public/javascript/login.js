//login.js
const loginSubmitBtn = document.getElementById("login-submit-btn");
const signupBtn = document.getElementById("signup-btn");
const forgotpassword = document.getElementById("forgotpassword-page");

loginSubmitBtn.addEventListener("click", async (e) => {
  e.preventDefault();
  try {
    const username = document.getElementById("username-input").value;
    const password = document.getElementById("password-input").value;

    const response = await fetch("http://127.0.0.1:8000/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username,
        password,
      }),
      credentials: "include",
    });

    const data = await response.json();
    console.log(response);
    if (!response.ok) {
      const errorMsg = data.message || `Login failed with status: ${response.status}`;
      console.log(errorMsg);
      throw new Error(errorMsg);
    }

    if (!data.token) {
      displayErrorMessage("Login failed!...", false);

      setTimeout(async () => {
        location.href = "http://127.0.0.1:8000/login";
      }, 1000);
    }

    displayErrorMessage("Login successful! Redirecting...", true);

    setTimeout(async () => {
      location.href = "http://127.0.0.1:8000/shop";
    }, 1000);
  } catch (error) {
    displayErrorMessage(error.message, false);
  }
});

signupBtn.addEventListener("click", (e) => {
  e.preventDefault();

  window.location.href = "http://127.0.0.1:8000/signup";
});

forgotpassword.addEventListener("click", (e) => {
  e.preventDefault();

  window.location("##forgotpassword-page");
});

function displayErrorMessage(message, isSuccess) {
  const errorMessageElement = document.querySelector(".error-message");
  errorMessageElement.style.display = "block";
  errorMessageElement.textContent = message;

  errorMessageElement.style.color = isSuccess ? "green" : "red";
  setTimeout(() => {
    errorMessageElement.style.display = "none";
  }, 5000);
}
