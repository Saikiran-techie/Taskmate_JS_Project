// Import Firebase modules
import { auth, db } from "./firebase-config.js";
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

// DOM Ready
document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.querySelector("#loginForm");
  const googleLoginBtn = document.querySelector("#googleLoginBtn");

  // Password visibility toggle
  document.querySelectorAll(".toggle-password").forEach((btn) => {
    btn.addEventListener("click", function () {
      const input = this.previousElementSibling;
      const icon = this.querySelector("i");
      input.type = input.type === "password" ? "text" : "password";
      icon.classList.toggle("bi-eye");
      icon.classList.toggle("bi-eye-slash");
    });
  });

  // Handle email/password login
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.querySelector("#email").value.trim();
    const password = document.querySelector("#password").value.trim();
    const rememberMe = document.querySelector("#rememberMe").checked;

    try {
      await setPersistence(auth, browserLocalPersistence);

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      Swal.fire("Success", "Login successful!", "success").then(() => {
        window.location.href = "dashboard.html";
      });
    } catch (error) {
      Swal.fire("Login Failed", error.message, "error");
    }
  });

  // Google Sign-In
  googleLoginBtn.addEventListener("click", async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        await setDoc(userRef, { name: user.displayName, email: user.email });
      }

      Swal.fire("Success", "Login successful!", "success").then(() => {
        window.location.href = "dashboard.html";
      });
    } catch (error) {
      Swal.fire("Error", error.message, "error");
    }
  });

  // 🔒 Stay logged in on dashboard if already authenticated
  onAuthStateChanged(auth, (user) => {
    if (user && window.location.pathname.includes("dashboard.html")) {
      console.log("User is logged in:", user.email);
    } else if (!user && window.location.pathname.includes("dashboard.html")) {
      // Not logged in → redirect to login
      window.location.href = "login.html";
    }
  });
});
