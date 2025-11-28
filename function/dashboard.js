document.addEventListener("DOMContentLoaded", () => {
  const products = JSON.parse(document.getElementById("product-data").textContent);
  const productsContainer = document.querySelector(".products-container");
  const brandContainer = document.getElementById("brandContainer");
  const categoryContainer = document.getElementById("categoryContainer"); // only once

  const openCartBtn = document.getElementById("openCartBtn");
  const logoutModal = document.getElementById("logoutModal");
  const logoutBtn = document.getElementById("logoutBtn");
  const stayBtn = document.getElementById("stayBtn");
  const switchBtn = document.getElementById("switchBtn");
  const historyBtn = document.getElementById("historyBtn");

  const productModal = document.getElementById("productModal");
  const modalCloseBtn = document.getElementById("closeProductModal");
  const modalAddToCartBtn = document.getElementById("modalAddToCartBtn");
  const modalBuyBtn = document.getElementById("modalBuyBtn");

  // Cart as a list
  let cart = JSON.parse(localStorage.getItem("cart") || "[]");
  let currentCategory = "All";
  let selectedBrands = [];
  let currentModalProduct = null;

  // Queue for orders
  class OrderQueue {
    constructor() { this.queue = []; }
    enqueue(order) { this.queue.push(order); }
    dequeue() { return this.queue.shift(); }
    peek() { return this.queue[0]; }
    isEmpty() { return this.queue.length === 0; }
  }
  const orderQueue = new OrderQueue();

  // ================== HELPER: GET BRAND ==================
  function getBrandFromProduct(product) {
    if (product.brand) return product.brand.toLowerCase();
    const name = product.name.toLowerCase();
    if (name.includes("iphone") || name.includes("ipad") || name.includes("macbook")) return "apple";
    if (name.includes("samsung") || name.includes("galaxy")) return "samsung";
    if (name.includes("xiaomi") || name.includes("redmi")) return "xiaomi";
    if (name.includes("realme")) return "realme";
    if (name.includes("google") || name.includes("pixel")) return "google";
    if (name.includes("asus")) return "asus";
    if (name.includes("acer")) return "acer";
    if (name.includes("dell")) return "dell";
    if (name.includes("hp")) return "hp";
    if (name.includes("lenovo")) return "lenovo";
    if (name.includes("huawei")) return "huawei";
    return "unknown";
  }

  // ================== FORMAT SPECIFICATIONS ==================
  function formatSpecs(desc) {
    if (!desc) return "<p>No specifications available.</p>";
    const specKeys = ["Processor", "RAM", "Storage", "Display", "Battery", "OS", "Other Features"];
    const lines = desc.split(/\r?\n/).map(l => l.trim()).filter(l => l);
    const specs = {};
    specKeys.forEach(key => {
      const regex = new RegExp(`^${key}[:]?\\s*(.+)$`, "i");
      const match = lines.find(line => regex.test(line));
      specs[key] = match ? regex.exec(match)[1].trim() : "N/A";
    });
    let html = "<div class='spec-grid'>";
    for (const [key, value] of Object.entries(specs)) {
      html += `<div class="spec-row"><div class="spec-label">${key}</div><div class="spec-value">${value}</div></div>`;
    }
    html += "</div>";
    return html;
  }

  // ================== TRIE IMPLEMENTATION ==================
  class TrieNode {
    constructor() { this.children = {}; this.isEndOfWord = false; this.products = []; }
  }

  class Trie {
    constructor() { this.root = new TrieNode(); }
    insert(product) {
      let node = this.root;
      const name = product.name.toLowerCase();
      for (const char of name) {
        if (!node.children[char]) node.children[char] = new TrieNode();
        node = node.children[char];
        node.products.push(product);
      }
      node.isEndOfWord = true;
    }
    search(prefix) {
      let node = this.root;
      prefix = prefix.toLowerCase();
      for (const char of prefix) {
        if (!node.children[char]) return [];
        node = node.children[char];
      }
      return node.products;
    }
  }
  const productTrie = new Trie();
  products.forEach(p => productTrie.insert(p));

// ================== CATEGORY TREE ==================
 class CategoryNode {
    constructor(name) {
      this.name = name;
      this.subcategories = {};
      this.products = [];
    }
    addProduct(categoryPath, product) {
      if (!categoryPath.length) {
        this.products.push(product);
        return;
      }
      const [head, ...tail] = categoryPath;
      if (!this.subcategories[head]) this.subcategories[head] = new CategoryNode(head);
      this.subcategories[head].addProduct(tail, product);
    }
    getProducts() { return this.products; }
  }
  const categoryTree = new CategoryNode("All");
  products.forEach(p => categoryTree.addProduct([p.category], p));



  // ================== CATEGORY BUTTONS ==================
  function renderCategoryButtons() {
    if (!categoryContainer) return; // safety check
    categoryContainer.innerHTML = "";
    categoryContainer.appendChild(createCategoryButton("All"));
    Object.keys(categoryTree.subcategories).sort().forEach(cat => {
      categoryContainer.appendChild(createCategoryButton(cat));
    });
  }
  function createCategoryButton(catName) {
    const btn = document.createElement("button");
    btn.textContent = catName;
    btn.addEventListener("click", () => filterByCategory(catName));
    return btn;
  }


// call it only if container exists
renderCategoryButtons();


  // ================== RENDER PRODUCTS ==================
  function renderProducts(filteredProducts) {
    productsContainer.innerHTML = filteredProducts.map(product => {
      let imageFile = product.image || 'default.png';
      if (imageFile.startsWith("images/")) imageFile = imageFile.split("/").pop();
      return `
        <div class="product-card">
          <img src="/static/images/${imageFile}" class="product-img" alt="${product.name}">
          <h3>${product.name}</h3>
          <p>Category: ${product.category}</p>
          <p>Price: ₱${product.price}</p>
          <p>Stock: ${product.stock}</p>
          <div class="button-group">
            <button class="view-btn"
                data-id="${product.id}"
                data-name="${product.name}"
                data-category="${product.category}"
                data-price="${product.price}"
                data-stock="${product.stock}"
                data-description="${product.description || ''}"
                data-image="${product.image || 'default.png'}">View</button>
            <button class="add-to-cart" data-id="${product.id}">Add to Cart</button>
            <button class="buy-btn" data-id="${product.id}">Buy</button>
          </div>
        </div>`;
    }).join('');
    attachProductButtons();
  }

  // ================== ATTACH PRODUCT BUTTONS ==================
  function attachProductButtons() {
    document.querySelectorAll(".view-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const name = btn.dataset.name;
        const category = btn.dataset.category;
        const price = btn.dataset.price;
        const description = btn.dataset.description;
        let image = btn.dataset.image || "default.png";
        if (image.startsWith("images/")) image = image.split("/").pop();

        document.getElementById("modalProductName").textContent = name;
        document.getElementById("modalProductCategory").textContent = category;
        document.getElementById("modalProductPrice").textContent = price;
        document.getElementById("modalProductImage").src = `/static/images/${image}`;
        document.getElementById("modalSpecsFormatted").innerHTML = formatSpecs(description);

        productModal.classList.remove("hidden");
        currentModalProduct = products.find(p => p.name === name);
      });
    });

    document.querySelectorAll(".add-to-cart").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = parseInt(btn.dataset.id);
        const product = products.find(p => p.id === id);
        if (!product) return;
        const existing = cart.find(item => item.id === id);
        if (existing) existing.quantity++;
        else cart.push({ ...product, quantity: 1 });
        localStorage.setItem("cart", JSON.stringify(cart));
        alert(`${product.name} added to cart!`);
      });
    });

    document.querySelectorAll(".buy-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = parseInt(btn.dataset.id);
        const product = products.find(p => p.id === id);
        if (!product) return;
        if (!confirm(`Buy ${product.name} for ₱${product.price}?`)) return;
        try {
          const res = await fetch("/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify([{ ...product, quantity: 1 }]),
          });
          const data = await res.json();
          if (res.status === 200 && !data.error) {
            alert("Purchase successful!");
            if (confirm("Do you want to view your purchase history?")) window.location.href = "/history";
          } else alert(data.error || "Purchase failed!");
        } catch (err) { console.error(err); alert("An error occurred during purchase."); }
      });
    });
  }

  // ================== MODAL BUTTONS ==================
  modalCloseBtn.addEventListener("click", () => productModal.classList.add("hidden"));
  modalAddToCartBtn.addEventListener("click", () => {
    if (!currentModalProduct) return;
    const existing = cart.find(item => item.id === currentModalProduct.id);
    if (existing) existing.quantity++;
    else cart.push({ ...currentModalProduct, quantity: 1 });
    localStorage.setItem("cart", JSON.stringify(cart));
    alert(`${currentModalProduct.name} added to cart!`);
  });
  modalBuyBtn.addEventListener("click", async () => {
    if (!currentModalProduct) return;
    if (!confirm(`Buy ${currentModalProduct.name} for ₱${currentModalProduct.price}?`)) return;
    try {
      const res = await fetch("/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([{ ...currentModalProduct, quantity: 1 }]),
      });
      const data = await res.json();
      if (res.status === 200 && !data.error) {
        alert("Purchase successful!");
        if (confirm("Do you want to view your purchase history?")) window.location.href = "/history";
      } else alert(data.error || "Purchase failed!");
    } catch (err) { console.error(err); alert("An error occurred during purchase."); }
  });

  // ================== BRAND FILTER ==================
  function renderBrandFilters(category) {
    brandContainer.innerHTML = "";
    const brandsSet = new Set();
    products.forEach(p => {
      const prodCategory = p.category.toLowerCase();
      const prodBrand = getBrandFromProduct(p);
      if (category === "All" || prodCategory === category.toLowerCase()) brandsSet.add(prodBrand);
    });
    Array.from(brandsSet).sort().forEach(brand => {
      const label = document.createElement("label");
      label.innerHTML = `<input type="checkbox" class="brand-filter" value="${brand}"> ${brand.charAt(0).toUpperCase() + brand.slice(1)}`;
      brandContainer.appendChild(label);
    });

    brandContainer.querySelectorAll(".brand-filter").forEach(cb => {
      cb.addEventListener("change", () => {
        selectedBrands = Array.from(brandContainer.querySelectorAll(".brand-filter:checked")).map(cb => cb.value.toLowerCase());
        filterProducts();
      });
    });
  }

  // ================== FILTER PRODUCTS ==================
  function filterByCategory(category) {
    currentCategory = category;
    selectedBrands = [];
    renderBrandFilters(category);

    let filtered = [];
    if (category === "All") filtered = [...products];
    else {
      const node = categoryTree.subcategories[category] || null;
      filtered = node ? node.getProducts() : [];
    }

    if (selectedBrands.length) filtered = filtered.filter(p => selectedBrands.includes(getBrandFromProduct(p)));

    renderProducts(filtered);
  }

  function filterProducts() {
    const searchTerm = document.getElementById("searchInput").value.toLowerCase().trim();
    let filtered = searchTerm ? productTrie.search(searchTerm) : [...products];

    filtered = filtered.filter(p => {
      const productCategory = p.category.toLowerCase();
      const productBrand = getBrandFromProduct(p);
      if (currentCategory !== "All" && productCategory !== currentCategory.toLowerCase()) return false;
      if (selectedBrands.length && !selectedBrands.includes(productBrand)) return false;
      return true;
    });

    renderProducts(filtered);
  }

  function handleSearchButtonClick() {
  const searchInput = document.getElementById("searchInput");
  const searchTerm = searchInput.value.toLowerCase().trim();

  let filtered = [];

  if (searchTerm) {
    // Search in the Trie
    filtered = productTrie.search(searchTerm);
  } else {
    // No search term: show all products
    filtered = [...products];
  }

  // Apply current category filter
  filtered = filtered.filter(p => {
    const productCategory = p.category.toLowerCase();
    const productBrand = getBrandFromProduct(p);

    if (currentCategory !== "All" && productCategory !== currentCategory.toLowerCase()) return false;
    if (selectedBrands.length && !selectedBrands.includes(productBrand)) return false;
    return true;
  });

  // Render filtered products
  renderProducts(filtered);
}

  // ================== BUTTON EVENTS ==================
  document.getElementById("searchBtn").addEventListener("click", e => { e.preventDefault(); filterProducts(); });
  document.getElementById("clearSearchBtn").addEventListener("click", e => { e.preventDefault(); document.getElementById("searchInput").value = ""; filterProducts(); });
  document.getElementById("clearFiltersBtn").addEventListener("click", () => {
    currentCategory = "All"; selectedBrands = [];
    document.getElementById("searchInput").value = "";
    renderBrandFilters("All");
    renderProducts(products);
  });

  openCartBtn.addEventListener("click", () => window.location.href = "/cart");
  historyBtn.addEventListener("click", () => window.location.href = "/history");
  window.showLogoutPopup = () => logoutModal.classList.remove("hidden");
  logoutBtn.addEventListener("click", () => fetch("/logout").then(() => window.location.href = "/login"));
  stayBtn.addEventListener("click", () => logoutModal.classList.add("hidden"));
  switchBtn.addEventListener("click", () => fetch("/logout").then(() => window.location.href = "/login"));

  // ================== INITIAL LOAD ==================
  renderCategoryButtons();
  renderProducts(products);
  renderBrandFilters("All");
});
