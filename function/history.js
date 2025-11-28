window.addEventListener("load", () => {
  document.body.classList.add("loaded");

  const backBtn = document.getElementById("backLink");
  if (backBtn) {
    backBtn.addEventListener("click", function(event) {
      const confirmBack = confirm("Are you sure you want to go back to the Dashboard?");
      if (!confirmBack) {
        event.preventDefault();
      } else {
        window.location.href = "/dashboard";
      }
    });
  }
});
