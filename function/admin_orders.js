document.addEventListener("DOMContentLoaded", () => {
    loadOrders();
});

let ordersByDate = {}; // JSON from backend

function loadOrders() {
    fetch("/api/orders")
        .then(res => res.json())
        .then(data => {
            ordersByDate = data;
            displayOrders();
        })
        .catch(err => console.error("Error loading orders:", err));
}

function displayOrders(filterEmail = "", startDate = "", endDate = "") {
    const container = document.getElementById("orders-container");
    container.innerHTML = "";

    let hasOrders = false;

    Object.keys(ordersByDate).forEach(date => {
        // Filter date
        if ((startDate && date < startDate) || (endDate && date > endDate)) return;

        const users = {};
        ordersByDate[date].orders.forEach(o => {
            if (!users[o.user_email]) users[o.user_email] = [];
            users[o.user_email].push(o);
        });

        // Filter by email
        const filteredUsers = Object.entries(users).filter(([email, _]) =>
            email.toLowerCase().includes(filterEmail.toLowerCase())
        );

        if (filteredUsers.length === 0) return;

        hasOrders = true;

        const section = document.createElement("div");
        section.classList.add("order-date-section");

        const headerContainer = document.createElement("div");
        headerContainer.classList.add("status-container");

        const header = document.createElement("h3");
        header.textContent = `Order Date: ${date}`;
        headerContainer.appendChild(header);

        const completeBtn = document.createElement("button");
        completeBtn.textContent = "Complete Orders for this Date";
        completeBtn.classList.add("complete-btn");
        completeBtn.addEventListener("click", () => completeOrders(date, section));
        headerContainer.appendChild(completeBtn);

        section.appendChild(headerContainer);

        // Table
        const table = document.createElement("table");
        table.classList.add("admin-table");

        const thead = document.createElement("thead");
        thead.innerHTML = `
            <tr>
                <th>User Email</th>
                <th>Product Name</th>
                <th>Quantity</th>
                <th>Total Price</th>
            </tr>
        `;
        table.appendChild(thead);

        const tbody = document.createElement("tbody");

        filteredUsers.forEach(([email, products]) => {
            products.forEach((p, i) => {
                const tr = document.createElement("tr");
                if (i === 0) {
                    tr.innerHTML = `
                        <td rowspan="${products.length}">${email}</td>
                        <td>${p.product_name}</td>
                        <td>${p.quantity}</td>
                        <td>${p.total_price}</td>
                    `;
                } else {
                    tr.innerHTML = `
                        <td>${p.product_name}</td>
                        <td>${p.quantity}</td>
                        <td>${p.total_price}</td>
                    `;
                }
                tbody.appendChild(tr);
            });
        });

        table.appendChild(tbody);
        section.appendChild(table);
        container.appendChild(section);
    });

    if (!hasOrders) container.innerHTML = "<p>No pending orders found.</p>";
}

function completeOrders(date, sectionElement) {
    fetch("/api/orders/complete_group", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_date: date })
    })
    .then(res => res.json())
    .then(data => {
        console.log("BACKEND RESPONSE:", data);

        if (
            data.success ||
            data.status === "ok" ||
            data.message === "completed" ||
            data.message === "Orders completed" ||
            data.message === "Order group completed!"
        ) {
            delete ordersByDate[date];
            sectionElement.remove();
            showNotification("Orders completed successfully!");
        } else {
            alert("Failed to complete orders.");
        }
    })
    .catch(err => console.error(err));
    return jsonify(success=True)

}



// Search & filter
document.getElementById("order-search").addEventListener("input", function () {
    const startDate = document.getElementById("start-date").value;
    const endDate = document.getElementById("end-date").value;
    displayOrders(this.value, startDate, endDate);
});

document.getElementById("filter-date-btn").addEventListener("click", () => {
    const searchText = document.getElementById("order-search").value;
    const startDate = document.getElementById("start-date").value;
    const endDate = document.getElementById("end-date").value;
    displayOrders(searchText, startDate, endDate);
});

// CLEAR FILTER BUTTON
document.getElementById("clear-filter").addEventListener("click", () => {
    // Reset all inputs
    document.getElementById("order-search").value = "";
    document.getElementById("start-date").value = "";
    document.getElementById("end-date").value = "";

    // Reload ALL orders with no filters
    displayOrders("", "", "");
});

// Notification
function showNotification(msg) {
    const notif = document.createElement("div");
    notif.className = "order-notification";
    notif.textContent = msg;
    document.body.appendChild(notif);
    setTimeout(() => { notif.classList.add("hide"); setTimeout(() => notif.remove(), 500); }, 3000);
}
