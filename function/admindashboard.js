document.addEventListener("DOMContentLoaded", () => {
    const manageProducts = document.getElementById("manage-products");
    if (manageProducts) {
        manageProducts.onclick = () => {
            window.location.href = "/admin/manage-products";
        };
    }

    const manageUsers = document.getElementById("manage-users");
    if (manageUsers) {
        manageUsers.onclick = () => {
            window.location.href = "/admin/manage-users";
        };
    }

    const orders = document.getElementById("orders");
    if (orders) {
        orders.onclick = () => {
            window.location.href = "/admin/orders";
        };
    }

        // Optional: confirmation for logout
    const logoutBtn = document.querySelector(".logout-btn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", (e) => {
            const confirmLogout = confirm("Are you sure you want to logout?");
            if (!confirmLogout) e.preventDefault();
        });
    }
});

