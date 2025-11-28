document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("updatePassForm");
    const message = document.getElementById("message");
    const backBtn = document.getElementById("backBtn");

    // Popup elements
    const popup = document.getElementById("successPopup");
    const signinAgainBtn = document.getElementById("signinAgainBtn");
    const dashboardBtn = document.getElementById("dashboardBtn");

    // Back button
    backBtn?.addEventListener("click", () => window.location.href = "/dashboard");

    form.addEventListener("submit", (e) => {
        e.preventDefault();

        const currentPassword = document.getElementById("currentPassword").value.trim();
        const newPassword = document.getElementById("newPassword").value.trim();

        if (!currentPassword || !newPassword) {
            message.style.color = "#ff8080";
            message.textContent = "Both password fields are required.";
            return;
        }

        if (newPassword.length < 6) {
            message.style.color = "#ff8080";
            message.textContent = "New password must be at least 6 characters.";
            return;
        }

        // Send update request
        fetch("/updatepass", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ currentPassword, newPassword }),
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                // Show popup
                popup.classList.remove("hidden");

                // Sign in again → log out and go to login
                signinAgainBtn.addEventListener("click", () => {
                    fetch("/logout").then(() => window.location.href = "/login");
                });

                // Go back to dashboard
                dashboardBtn.addEventListener("click", () => {
                    window.location.href = "/dashboard";
                });

            } else {
                message.style.color = "#ff8080";
                message.textContent = data.message || "Error updating password.";
            }
        })
        .catch(err => {
            message.style.color = "#ff8080";
            message.textContent = "Server error. Try again later.";
            console.error(err);
        });
    });

    function setupPasswordToggle(inputId, toggleId) {
        const input = document.getElementById(inputId);
        const toggle = document.getElementById(toggleId);

        toggle.addEventListener("click", () => {
            if (input.type === "password") input.type = "text";
            else input.type = "password";
        });
    }

    // Apply toggles
    setupPasswordToggle("currentPassword", "toggleCurrentPassword");
    setupPasswordToggle("newPassword", "toggleNewPassword");

});
