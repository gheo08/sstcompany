console.log("✅ login.js loaded");

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("loginForm");
    const messageEl = document.getElementById("message");
    const signupBtn = document.getElementById("signupBtn");

    if (!form) {
        console.error("❌ loginForm not found!");
        return;
    }

    // ✅ Handle login
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value.trim();

        if (!email || !password) {
            showMessage("Please enter both email and password.", "red");
            return;
        }

        try {
            const response = await fetch("/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });

            const result = await response.json();
            console.log("📩 Server Response:", result);

            if (response.ok) {
            showMessage(result.message || "Login successful!", "green");

            // ✅ Redirect to correct page based on user role
            setTimeout(() => {
                window.location.href = result.redirect || "/dashboard";
            }, 1000);
            } else {
                showMessage(result.message || "Invalid email or password.", "red");
            }

        } catch (error) {
            console.error("🔥 Error:", error);
            showMessage("Server error. Please try again later.", "red");
        }
    });

 // ✅ Redirect to signup page
 signupBtn.addEventListener("click", () => {
    console.log("➡️ Redirecting to signup page...");
    window.location.href = "/signup"; // <-- this goes to signup.html
});

    // ✅ Helper
    function showMessage(text, color) {
        messageEl.textContent = text;
        messageEl.style.color = color;
        messageEl.style.fontWeight = "bold";
    }

const togglePassword = document.getElementById("togglePassword");
const passwordField = document.getElementById("password");

togglePassword.addEventListener("click", () => {
  const type = passwordField.type === "password" ? "text" : "password";
  passwordField.type = type;

  // Change SVG icon
  if (type === "password") {
    togglePassword.innerHTML = `
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" 
            fill="none" stroke="white" stroke-width="2"/>
      <circle cx="12" cy="12" r="3" fill="white"/>
    `;
  } else {
    togglePassword.innerHTML = `
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" 
            fill="none" stroke="white" stroke-width="2"/>
      <line x1="4" y1="4" x2="20" y2="20" 
            stroke="white" stroke-width="2"/>
    `;
  }
});
});
