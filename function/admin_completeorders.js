document.addEventListener("DOMContentLoaded", () => {
    loadCompletedOrders();
});

let completedCache = {}; // store completed orders for search

function loadCompletedOrders() {
    fetch("/api/completed_orders")
        .then(res => res.json())
        .then(data => {
            completedCache = data; // store for searching
            displayCompletedOrders(data);
        })
        .catch(err => console.error("Error loading completed orders:", err));
}

function displayCompletedOrders(data) {
    const container = document.getElementById("orders-container");
    container.innerHTML = "";

    if (Object.keys(data).length === 0) {
        container.innerHTML = "<p>No completed orders yet.</p>";
        return;
    }

    Object.keys(data).forEach(date => {
        const group = data[date];

        const section = document.createElement("div");
        section.classList.add("order-date-section");

        const header = document.createElement("h3");
        header.textContent = `Order Date: ${date}`;
        section.appendChild(header);

        // Table
        const table = document.createElement("table");
        table.classList.add("admin-table");

        const thead = document.createElement("thead");
        thead.innerHTML = `
            <tr>
                <th>Order ID</th>
                <th>User Email</th>
                <th>Product Name</th>
                <th>Quantity</th>
                <th>Total Price</th>
                <th>Overall Price</th>
            </tr>
        `;
        table.appendChild(thead);

        const tbody = document.createElement("tbody");

        group.orders.forEach((item, index) => {
            const tr = document.createElement("tr");

            if (index === 0) {
                tr.innerHTML = `
                    <td rowspan="${group.orders.length}">${item.order_id}</td>
                    <td rowspan="${group.orders.length}">${item.user_email}</td>
                    <td>${item.product_name}</td>
                    <td>${item.quantity}</td>
                    <td>${item.total_price}</td>
                    <td rowspan="${group.orders.length}"><strong>${group.overall_price}</strong></td>
                `;
            } else {
                tr.innerHTML = `
                    <td>${item.product_name}</td>
                    <td>${item.quantity}</td>
                    <td>${item.total_price}</td>
                `;
            }

            tbody.appendChild(tr);
        });

        table.appendChild(tbody);
        section.appendChild(table);
        container.appendChild(section);
    });
}

// ===========================
// DATE RANGE FILTERING
// ===========================

document.getElementById("apply-filter").addEventListener("click", function () {
    const start = document.getElementById("filter-start").value;
    const end = document.getElementById("filter-end").value;

    applyFilters(start, end);
});

document.getElementById("clear-filter").addEventListener("click", function () {
    document.getElementById("filter-start").value = "";
    document.getElementById("filter-end").value = "";
    document.getElementById("complete-search").value = "";

    displayCompletedOrders(completedCache);
});

function applyFilters(startDate, endDate) {
    const searchText = document.getElementById("complete-search").value.toLowerCase();
    const filteredData = {};

    Object.keys(completedCache).forEach(date => {
        const orderDate = new Date(date);
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;

        // Date filtering
        if (start && orderDate < start) return;
        if (end && orderDate > end) return;

        // Email filtering
        const group = completedCache[date];
        const filteredItems = group.orders.filter(order =>
            order.user_email.toLowerCase().includes(searchText)
        );

        if (filteredItems.length > 0) {
            filteredData[date] = {
                orders: filteredItems,
                overall_price: group.overall_price
            };
        }
    });

    displayCompletedOrders(filteredData);
}

// ===========================
// SEARCH BY EMAIL ONLY
// ===========================

document.getElementById("complete-search").addEventListener("input", function () {
    const searchText = this.value.toLowerCase();

    const filteredData = {};

    Object.keys(completedCache).forEach(date => {
        const group = completedCache[date];

        const filteredItems = group.orders.filter(order =>
            order.user_email.toLowerCase().includes(searchText)
        );

        if (filteredItems.length > 0) {
            filteredData[date] = {
                orders: filteredItems,
                overall_price: group.overall_price
            };
        }
    });

    displayCompletedOrders(filteredData);
});
