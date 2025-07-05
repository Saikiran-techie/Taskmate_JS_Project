const hamburger = document.querySelector(".hamburger");
const navMenu = document.querySelector(".nav-menu");
const closeBtn = document.querySelector(".close-btn");

// Open menu
hamburger.addEventListener("click", () => {
    navMenu.style.right = "0";
});

// Close menu
closeBtn.addEventListener("click", () => {
    navMenu.style.right = "-100%";
});

// Smooth Scroll for Features and About Section
document.querySelectorAll("a.nav-link").forEach((link) => {
    link.addEventListener("click", (event) => {
        const targetId = event.target.getAttribute("href").slice(1);
        const targetElement = document.getElementById(targetId);

        if (targetElement) {
            event.preventDefault();
            navMenu.style.right = "-100%"; // Close menu on click
            targetElement.scrollIntoView({ behavior: "smooth" });
        }
    });
});
