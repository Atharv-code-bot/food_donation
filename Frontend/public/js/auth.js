async function login(username, password) {
  console.log("login() function called");
  console.log("Sending request to backend...");

  try {
    const response = await fetch("http://localhost:8080/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    console.log("Response received from backend");

    const data = await response.json();
    console.log("Response JSON:", data);

    if (response.ok) {
      console.log("Login successful! Token received:", data.token);
      console.log("User role:", data.role);
      console.log("User id:", data.id);

      // Store token in localStorage for future requests
      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.role);
      localStorage.setItem("id", data.id);

      // Redirect user based on role
      // Check if there's a saved page to go back to
      const redirectPage = localStorage.getItem("redirectAfterLogin");
      if (redirectPage) {
        localStorage.removeItem("redirectAfterLogin"); // Clear after use
        window.location.href = redirectPage;
      } else if (data.role === "ROLE_NGO") {
        console.log("Redirecting to NGO dashboard...");
        window.location.href = "receive-dashboard.html";
      } else if (data.role === "ROLE_DONOR") {
        console.log("Redirecting to Donor dashboard...");
        window.location.href = "donate-dashboard.html";
      } else {
        console.error("Unknown role:", data.role);
        alert("Unknown role. Please contact support.");
      }
    } else {
      console.error("Login failed:", data);
      alert("Login failed: " + (data.message || "Unknown error"));
    }
  } catch (error) {
    document.querySelector(".w-form-fail-pass").style.display = "flex";
  }
}

async function register(
  username,
  email,
  password,
  role,
  fullname,
  phone,
  address
) {
  const response = await fetch("http://localhost:8080/auth/register", {
    // Adjust backend URL if needed
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username,
      email,
      password,
      role,
      fullname,
      phone,
      address,
    }),
  });

  const data = await response.json();
  if (response.ok) {
    handleAuthSuccess(data);
  } else {
    console.error("Registration failed:", data);
  }
}

function handleAuthSuccess(data) {
  localStorage.setItem("token", data.token);
  localStorage.setItem("role", data.role);
  redirectToDashboard(data.role);
}

function redirectToDashboard(role) {
  if (role === "ROLE_NGO") {
    window.location.href = "receive-dashboard.html";
  } else if (role === "ROLE_DONOR") {
    window.location.href = "donate-dashboard.html";
  } else {
    window.location.href = "default_dashboard.html";
  }
}

// Example usage:
// login("testuser", "password123");
// register("newuser", "password123", "ROLE_DONOR");
