console.log("✅ signup.js loaded");

document.addEventListener("DOMContentLoaded", () => {
  const signupBtn = document.getElementById("signupBtn");
  const message = document.getElementById("message");
  const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;

  signupBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    // Check empty
    if (!email || !password) {
      message.textContent = "Please fill in all fields!";
      message.style.color = "red";
      return;
    }

    // Check Gmail format
    if (!gmailRegex.test(email)) {
      message.textContent = "Enter a valid Gmail address (example@gmail.com)";
      message.style.color = "red";
      return;
    }

    try {
      const response = await fetch("/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (response.ok) {
        message.textContent = result.message;
        message.style.color = "green";

        setTimeout(() => {
          window.location.href = "/login";
        }, 1000);
      } else {
        message.textContent = result.message;
        message.style.color = "red";
      }
    } catch (error) {
      console.error("🔥 Error:", error);
      message.textContent = "Server error. Please try again.";
      message.style.color = "red";
    }
  });

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
