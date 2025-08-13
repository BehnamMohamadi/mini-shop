//modal.js
const modalHeader = document.querySelector(".modal-header > h2");
const modalBody = document.querySelector(".modal-body");
const modalFooter = document.querySelector(".modal-footer");
const modal = document.getElementById("modal");
const closeButton = document.getElementsByClassName("close")[0];

function openModal() {
  modal.style.display = "block";
}

function closeModal() {
  resetModal();
  modal.style.display = "none";
}

function resetModal() {
  modalHeader.textContent = "DEFAULT";
  modalBody.innerHTML = "";
  modalFooter.innerHTML = "";
}

closeButton.onclick = closeModal;

window.onclick = function (event) {
  if (event.target == modal) {
    closeModal();
  }
};
