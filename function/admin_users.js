document.addEventListener("DOMContentLoaded", () => {
    const tableBody = document.querySelector("#usersTable tbody");
    const searchInput = document.getElementById("user-search");
    const roleFilter = document.getElementById("role-filter");

    let usersCache = []; // original array of users
    let userMap = new Map(); // Hash table for fast lookup
    let roleTree = {}; // Tree structure by role

    // ===================== LOAD USERS =====================
    function loadUsers() {
        fetch("/api/users")
            .then(res => res.json())
            .then(users => {
                usersCache = users;

                // Build hash table
                userMap.clear();
                users.forEach(user => userMap.set(user.id, user));

                // Build role tree
                // Build roleTree
                roleTree = {};
                users.forEach(user => {
                    const roleKey = user.role.toLowerCase(); // normalize
                    if (!roleTree[roleKey]) roleTree[roleKey] = [];
                    roleTree[roleKey].push(user);
                });


                displayUsers(users); // show all users initially

                // Debug: check tree
                console.log("Role Tree:", roleTree);
            })
            .catch(err => console.error("Error loading users:", err));
    }

    // ===================== DISPLAY USERS =====================
    function displayUsers(users) {
        tableBody.innerHTML = "";

        users.forEach(user => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${user.id}</td>
                <td>${user.email}</td>
                <td>${user.password}</td>
                <td>${user.role}</td>
                <td>${user.registered_on}</td>
                <td>
                    ${user.role.toLowerCase() !== 'admin' ? `<button class="delete-btn" data-id="${user.id}">Delete</button>` : ''}
                </td>
            `;
            tableBody.appendChild(row);
        });

        // Attach delete buttons
        document.querySelectorAll(".delete-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const userId = parseInt(btn.getAttribute("data-id"));
                if (!confirm("Are you sure you want to permanently delete this user?")) return;

                const user = userMap.get(userId);
                if (!user) return alert("User not found.");

                fetch(`/api/delete-user/${userId}`, { method: "DELETE" })
                    .then(res => res.json())
                    .then(data => {
                        alert(data.message);

                        // Remove from hash table
                        userMap.delete(userId);

                        // Remove from tree
                        const roleKey = user.role.toLowerCase();
                        if (roleTree[roleKey]) {
                            const index = roleTree[roleKey].findIndex(u => u.id === userId);
                            if (index !== -1) roleTree[roleKey].splice(index, 1);
                        }

                        // Remove from array
                        usersCache = usersCache.filter(u => u.id !== userId);

                        displayUsers(usersCache); // refresh table
                    });
            });
        });
    }

    // ===================== ROLE FILTER =====================
    roleFilter.addEventListener("change", () => {
        const selectedRole = roleFilter.value.toLowerCase(); // lowercase to match keys

        if (selectedRole === "all") {
            displayUsers(usersCache); // show all users
        } else if (roleTree[selectedRole]) {
            displayUsers(roleTree[selectedRole]); // show only this role
        } else {
            displayUsers([]); // fallback
        }
    });


    // ===================== SEARCH =====================
    searchInput.addEventListener("input", () => {
        const searchText = searchInput.value.toLowerCase();
        const selectedRole = roleFilter.value.toLowerCase();

        let filteredUsers = usersCache;

        // Apply role filter first
        if (selectedRole !== "all" && roleTree[selectedRole]) {
            filteredUsers = roleTree[selectedRole];
        }

        // Apply search filter
        filteredUsers = filteredUsers.filter(user =>
            user.email.toLowerCase().includes(searchText)
        );

        displayUsers(filteredUsers);
    });


    loadUsers();
});
