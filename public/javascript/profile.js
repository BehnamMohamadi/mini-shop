//profile.js
const editTableBtn = document.getElementById("edit-table-btn");
editTableBtn.addEventListener("click", renderUpdateUser);

async function renderUpdateUser() {
  try {
    const response = await fetch(`http://127.0.0.1:8000/api/account`);

    if (!response.ok) {
      throw new Error("user api can't reachable:");
    }

    const responseAsJson = await response.json();
    const user = responseAsJson.data.user;
    console.log(Object.keys(user));
    modalBody.innerHTML = Object.keys(user)
      .map((property) => {
        if (property !== "_id" && property !== "profile" && property !== "role") {
          return `
          <div class="row-data">
            <label class="label-edit-form">${property}:</label>
            <input type="text" id="${property}" class="update-inputs" value="${user[property]}" placeholder="${property}" />
          </div>
          `;
        }
      })
      .join("");

    modalFooter.innerHTML = `
      <button class="button" onclick="updateUser()">Save</button>
      <button class="button" onclick="closeModal()">Cancel</button>
    `;

    openModal();
  } catch (error) {
    console.error("error in profile>renderUpdateUser", error);
  }
}

async function updateUser() {
  const updateInputs = Array.from(document.querySelectorAll(".update-inputs"));

  const data = {};
  updateInputs.forEach((input) => {
    data[input.id] = input.value;
  });
  console.log("data", data);

  try {
    const response = await fetch(`http://127.0.0.1:8000/api/account`, {
      method: "PATCH",
      body: JSON.stringify(data),
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    closeModal();

    window.location.reload();
  } catch (error) {
    console.error("error in profile>updateUser", error);
  }
}

async function renderUpdateProfileImage() {
  try {
    const userProfile = document.body.dataset.profile;

    modalBody.innerHTML = `
      <div class="row-data">
        <div class="profile">
          <img id="profile-image" src="/images/profiles/${userProfile}" alt="Profile Image" />
          <input type="file" id="profile-img" />
        </div> 
      </div>
    `;

    modalFooter.innerHTML = `
      <button class="button" onclick="updateImage()">Save</button>
      <button class="button" onclick="closeModal()">Cancel</button>
    `;

    openModal();
  } catch (error) {
    console.error("error in profile>renderUpdateProfileImage", error);
  }
}

async function updateImage() {
  const input = document.getElementById("profile-img");
  const file = input.files[0];

  if (!file) return alert("No file selected!");

  const formData = new FormData();
  formData.append("profile", file);
  console.log(formData);

  const response = await fetch("http://127.0.0.1:8000/api/account/change-profile-image", {
    method: "PATCH",
    body: formData,
    headers: {
      authorization: { token: localStorage.getItem("authToken") },
    },
  });

  const responseAsJSon = await response.json();

  console.log(responseAsJSon);
}
