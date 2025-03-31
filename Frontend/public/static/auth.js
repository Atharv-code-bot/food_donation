// auth.js - Handles authentication and role-based redirection

// Function to handle login/register response
function handleAuthResponse(response) {
    if (response.token && response.role) {
        // Store token and role
        localStorage.setItem("authToken", response.token);
        localStorage.setItem("userRole", response.role);

        // Redirect user based on role
        redirectUser(response.role);
    } else {
        console.error("Invalid response from server");
    }
}

// Function to redirect user based on role
function redirectUser(role) {
    switch (role) {
        case "ROLE_ADMIN":
            window.location.href = "/admin-dashboard.html";
            break;
        case "ROLE_NGO":
            window.location.href = "/ngo-dashboard.html";
            break;
        case "ROLE_USER":
            window.location.href = "/user-dashboard.html";
            break;
        default:
            console.error("Unknown role:", role);
            window.location.href = "/login.html";
    }
}

// Function to check authentication on protected pages
function checkAuth() {
    const token = localStorage.getItem("authToken");
    const role = localStorage.getItem("userRole");

    if (!token || !role) {
        // Redirect to login if not authenticated
        window.location.href = "/login.html";
    } else {
        // Ensure user is on the correct dashboard
        redirectUser(role);
    }
}

// Run authentication check on protected pages
document.addEventListener("DOMContentLoaded", () => {
    if (window.location.pathname.includes("dashboard")) {
        checkAuth();
    }
});
