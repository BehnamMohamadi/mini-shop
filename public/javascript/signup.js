//signup.js
const errorMessage = document.querySelector(".error-message");
const signupBtn = document.getElementById("signup-submit-btn");

signupBtn.addEventListener("click", async () => {
  try {
    const userData = {
      firstname: document.getElementById("firstname-input").value.trim(),
      lastname: document.getElementById("lastname-input").value.trim(),
      username: document.getElementById("username-input").value.trim(),
      password: document.getElementById("password-input").value,
    };

    const confirmPassword = document.getElementById("confirm-password-input").value;

    errorMessage.style.display = "none";
    errorMessage.textContent = "";

    if (
      !userData.firstname ||
      !userData.lastname ||
      !userData.username ||
      !userData.password ||
      !confirmPassword
    ) {
      displayErrorMessage("please fill all of the fields...", false);
      return;
    }

    if (userData.password !== confirmPassword) {
      displayErrorMessage("password and confirm password is not equal...", false);
      return;
    }

    const response = await fetch("http://127.0.0.1:8000/api/auth/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
      credentials: "include",
    });

    const data = await response.json();
    console.log(response);
    if (!response.ok) {
      const errorMsg = data.message || `1signedUp failed with status: ${response.status}`;
      console.log(errorMsg);
      throw new Error(errorMsg);
    }

    if (!data.token) {
      displayErrorMessage("2signedUp failed!...", false);

      setTimeout(async () => {
        location.href = "http://127.0.0.1:8000/signup";
      }, 1000);
    }

    displayErrorMessage("signedUp successful! Redirecting...", true);
    setTimeout(async () => {
      location.href = "http://127.0.0.1:8000/shop";
    }, 1000);
  } catch (error) {
    displayErrorMessage(error.message, false);
  }
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
