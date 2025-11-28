window.addEventListener("load", () => {
  document.body.classList.add("loaded");

  const backBtn = document.getElementById("backBtn");
  const printBtn = document.getElementById("printBtn");

  // Back button confirmation
  if (backBtn) {
    backBtn.addEventListener("click", (event) => {
      const confirmBack = confirm("Are you sure you want to go back to the Purchase History?");
      if (!confirmBack) {
        event.preventDefault();
      } else {
        window.history.back();
      }
    });
  }

  // Print button
  if (printBtn) {
    printBtn.addEventListener("click", () => {
      window.print(); // Buttons automatically hidden via CSS
    });
  }
});
