document.addEventListener("DOMContentLoaded", () => {
    const tableBody = document.querySelector("#productsBody");
    const searchInput = document.getElementById("searchInput");
    const clearBtn = document.getElementById("clearSearchBtn");
    const categoryContainer = document.getElementById("category-container");

    // ================== Build tree ==================
    // Map<Category, Map<Subcategory, Set<Brand>>>
    const categoryTree = new Map();

    tableBody.querySelectorAll("tr").forEach(row => {
        const cat = row.dataset.category;
        const subcat = row.dataset.subcategory || "General";
        const brand = row.dataset.brand;

        if (!categoryTree.has(cat)) categoryTree.set(cat, new Map());
        const subMap = categoryTree.get(cat);
        if (!subMap.has(subcat)) subMap.set(subcat, new Set());
        subMap.get(subcat).add(brand);
    });

    // ================== Generate sidebar HTML ==================
    categoryTree.forEach((subMap, cat) => {
        const catDiv = document.createElement("div");
        catDiv.className = "category";

        const catLabel = document.createElement("h4");
        catLabel.textContent = cat;
        catDiv.appendChild(catLabel);

        subMap.forEach((brands, subcat) => {
            const subDiv = document.createElement("div");
            subDiv.className = "subcategory";

            const subLabel = document.createElement("h5");
            subLabel.textContent = subcat;
            subDiv.appendChild(subLabel);

            brands.forEach(brand => {
                const brandDiv = document.createElement("div");
                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.value = `${cat}|${subcat}|${brand}`;
                checkbox.className = "brand-checkbox";

                const label = document.createElement("label");
                label.textContent = brand;

                brandDiv.appendChild(checkbox);
                brandDiv.appendChild(label);
                subDiv.appendChild(brandDiv);
            });

            catDiv.appendChild(subDiv);
        });

        categoryContainer.appendChild(catDiv);
    });

    // ================== Filter Function ==================
    const filterRows = () => {
        const filterText = searchInput.value.toLowerCase();
        const checkedBrands = Array.from(document.querySelectorAll(".brand-checkbox:checked")).map(cb => cb.value);

        tableBody.querySelectorAll("tr").forEach(row => {
            const name = row.querySelector(".product-name").textContent.toLowerCase();
            const rowId = `${row.dataset.category}|${row.dataset.subcategory}|${row.dataset.brand}`;
            const matchesBrand = checkedBrands.length === 0 || checkedBrands.includes(rowId);
            row.style.display = (name.includes(filterText) && matchesBrand) ? "" : "none";
        });
    };

    // Event listeners
    searchInput.addEventListener("input", filterRows);
    clearBtn.addEventListener("click", () => {
        searchInput.value = "";
        document.querySelectorAll(".brand-checkbox").forEach(cb => cb.checked = false);
        filterRows();
    });
    document.querySelectorAll(".brand-checkbox").forEach(cb => cb.addEventListener("change", filterRows));

    // ================== Add / Delete Stock ==================
    tableBody.addEventListener("click", e => {
        const row = e.target.closest("tr");
        if (!row) return;

        const productId = row.dataset.id;

        // Add Stock
        if (e.target.classList.contains("add-btn")) {
            const amount = row.querySelector(".add-input").value;
            const stockCell = row.querySelector(".stock");

            fetch("/api/add_stock", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: productId, amount })
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) stockCell.textContent = data.new_stock;
                else alert("Error updating stock");
            });
        }

        // Delete Product
        if (e.target.classList.contains("delete-btn")) {
            if (!confirm("Are you sure you want to delete this product?")) return;

            fetch("/api/delete_product", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: productId })
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) row.remove();
                else alert("Error deleting product");
            });
        }
    });
});
