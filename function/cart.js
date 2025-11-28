document.addEventListener("DOMContentLoaded", () => {
  let cart = JSON.parse(localStorage.getItem("cart") || "[]");
  const cartItemsDiv = document.getElementById("cartItems");
  const cartTotalEl = document.getElementById("cartTotal");
  const checkoutBtn = document.getElementById("checkoutBtn");
  const backBtn = document.getElementById("backBtn");

  function updateCartUI() {
    cartItemsDiv.innerHTML = "";

    let total = 0;

    // Generate HTML using MAP
    cartItemsDiv.innerHTML = cart
      .map(item => {
        const subtotal = item.price * item.quantity;
        total += subtotal;

        return `
          <div class="cart-item">
            <span>${item.name} 
              <small style="color:#555">(Stock left: ${item.stock - item.quantity})</small>
            </span>

            <div class="cart-controls">
              <button class="decrease" data-id="${item.id}">-</button>
              <span>${item.quantity}</span>

              <button class="increase" data-id="${item.id}" 
                ${item.quantity >= item.stock ? "disabled" : ""}>+</button>

              <span>₱${subtotal.toFixed(2)}</span>

              <button class="remove" data-id="${item.id}">❌</button>
            </div>
          </div>
        `;
      })
      .join("");

    cartTotalEl.textContent = `Total: ₱${total.toFixed(2)}`;

    localStorage.setItem("cart", JSON.stringify(cart));

    // Attach events after rendering
    attachEvents();
  }

  function attachEvents() {
    // INCREASE
    document.querySelectorAll(".increase").forEach(btn => {
      btn.onclick = () => {
        const item = cart.find(i => i.id === parseInt(btn.dataset.id));
        if (item.quantity < item.stock) {
          item.quantity++;
          updateCartUI();
        } else {
          alert(`Maximum stock reached (${item.stock})!`);
        }
      };
    });

    // DECREASE
    document.querySelectorAll(".decrease").forEach(btn => {
      btn.onclick = () => {
        const item = cart.find(i => i.id === parseInt(btn.dataset.id));
        if (item.quantity > 1) {
          item.quantity--;
        } else {
          cart = cart.filter(i => i.id !== item.id);
        }
        updateCartUI();
      };
    });

    // REMOVE
    document.querySelectorAll(".remove").forEach(btn => {
      btn.onclick = () => {
        cart = cart.filter(i => i.id !== parseInt(btn.dataset.id));
        updateCartUI();
      };
    });
  }

  // INITIAL LOAD
  updateCartUI();

  // CHECKOUT
  checkoutBtn.addEventListener("click", async () => {
    if (cart.length === 0) return alert("Your cart is empty!");

    if (!confirm("Proceed to checkout?")) return;

    const res = await fetch("/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cart),
    });

    const data = await res.json();

    if (res.ok) {
      alert("Order placed successfully!");

      cart = [];
      localStorage.removeItem("cart");

      if (confirm("View purchase history?")) {
        window.location.href = "/history";
      } else {
        window.location.href = "/dashboard";
      }
    } else {
      alert(data.error || "Checkout failed!");
    }
  });

  // BACK BUTTON
  backBtn.addEventListener("click", () => {
    window.location.href = "/dashboard";
  });
});
