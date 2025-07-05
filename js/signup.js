import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

// Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyCS32LRH2OgNV4VqGc7qJyGWiP1F2vaACo",
    authDomain: "taskmate-6f349.firebaseapp.com",
    projectId: "taskmate-6f349",
    storageBucket: "taskmate-6f349.appspot.com",
    messagingSenderId: "362485876114",
    appId: "1:362485876114:web:b640119b938691c978ad4b",
    measurementId: "G-H2KKFSX3QF"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

document.addEventListener("DOMContentLoaded", () => {
    const signupForm = document.querySelector("#signupForm");

    signupForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const name = document.querySelector("#name").value.trim();
        const email = document.querySelector("#email").value.trim();
        const password = document.querySelector("#password").value.trim();
        const confirmPassword = document.querySelector("#confirmPassword").value.trim();

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

        if (!name || !email || !password || !confirmPassword) {
            Swal.fire("Validation Error", "All fields are required.", "error");
            return;
        }

        if (!passwordRegex.test(password)) {
            Swal.fire("Weak Password", "Password must be at least 8 characters, with 1 uppercase, 1 lowercase, 1 number, and 1 special character.", "error");
            return;
        }

        if (password !== confirmPassword) {
            Swal.fire("Validation Error", "Passwords do not match.", "error");
            return;
        }

        Swal.fire({
            title: "Creating account...",
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            await setDoc(doc(db, "users", user.uid), {
                name: name,
                email: email,
                uid: user.uid,
                createdAt: new Date()
            });

            Swal.fire("Signup Successful", "Click OK to go to the Home page.", "success")
                .then(() => {
                    window.location = "index.html";
                });

        } catch (error) {
            Swal.close();
            if (error.code === "auth/email-already-in-use") {
                Swal.fire("Signup Failed", "Email already registered. Please login.", "error");
            } else {
                Swal.fire("Signup Failed", error.message, "error");
            }
        }
    });

    const googleSignupBtn = document.querySelector("#googleSignupBtn");
    googleSignupBtn.addEventListener("click", async () => {
        const provider = new GoogleAuthProvider();
        Swal.fire({
            title: "Signing up with Google...",
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            await setDoc(doc(db, "users", user.uid), {
                name: user.displayName,
                email: user.email,
                uid: user.uid,
                createdAt: new Date()
            });

            Swal.fire("Signup Successful", "Click OK to go to the Home page.", "success")
                .then(() => {
                    window.location = "index.html";
                });
        } catch (error) {
            Swal.close();
            Swal.fire("Error", error.message, "error");
        }
    });

    // Password Visibility Toggle
    const toggleButtons = document.querySelectorAll(".toggle-password");

    toggleButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
            const input = btn.parentElement.querySelector("input");
            const icon = btn.querySelector("i");

            if (input.type === "password") {
                input.type = "text";
                icon.classList.replace("bi-eye-slash", "bi-eye");
            } else {
                input.type = "password";
                icon.classList.replace("bi-eye", "bi-eye-slash");
            }
        });
    });

});
