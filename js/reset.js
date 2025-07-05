// Firebase Configuration
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getAuth, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyCS32LRH2OgNV4VqGc7qJyGWiP1F2vaACo",
    authDomain: "taskmate-6f349.firebaseapp.com",
    projectId: "taskmate-6f349",
    storageBucket: "taskmate-6f349.firebasestorage.app",
    messagingSenderId: "362485876114",
    appId: "1:362485876114:web:b640119b938691c978ad4b",
    measurementId: "G-H2KKFSX3QF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// DOM Content Loaded
document.addEventListener("DOMContentLoaded", () => {
    const resetForm = document.querySelector("#reset-form");

    // Reset Form Submission
    resetForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        // Get Input Values
        const email = document.querySelector("#email").value.trim();
        const newPassword = document.querySelector("#new-password").value.trim();
        const confirmNewPassword = document.querySelector("#confirm-password").value.trim();

        // Validate Input
        if (!email || !newPassword || !confirmNewPassword) {
            Swal.fire("Validation Error", "All fields are required.", "error");
            return;
        }

        // Password Strength Validation
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(newPassword)) {
            Swal.fire("Weak Password", "Password must have at least 8 characters, 1 uppercase, 1 lowercase, 1 number, and 1 special character.", "error");
            return;
        }

        // Check Password Match
        if (newPassword !== confirmNewPassword) {
            Swal.fire("Validation Error", "Passwords do not match.", "error");
            return;
        }

        try {
            // Send Password Reset Email
            await sendPasswordResetEmail(auth, email);
            Swal.fire("Success", "Password reset email sent. Check your inbox.", "success").then(() => {
                window.location.href = "login.html";
            });
        } catch (error) {
            Swal.fire("Error", error.message, "error");
        }
    });

    // Password Visibility Toggle
    document.querySelectorAll(".toggle-password").forEach((btn) => {
        btn.addEventListener("click", function () {
            const input = this.previousElementSibling;
            const icon = this.querySelector("i");

            if (input.type === "password") {
                input.type = "text";
                icon.classList.remove("bi-eye-slash");
                icon.classList.add("bi-eye");
            } else {
                input.type = "password";
                icon.classList.remove("bi-eye");
                icon.classList.add("bi-eye-slash");
            }
        });
    });
});
