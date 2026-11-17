import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app-check.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAGElJN8jMywqUn9OAjzmaShuADoeBDq70",
  authDomain: "shivaay-library.firebaseapp.com",
  projectId: "shivaay-library",
  storageBucket: "shivaay-library.firebasestorage.app",
  messagingSenderId: "8215970377",
  appId: "1:8215970377:web:c323f0f260e7f0b0487598"
};

const app = initializeApp(firebaseConfig);

initializeAppCheck(app, {
  provider: new ReCaptchaEnterpriseProvider('6LfPsCQuAAAAALmcX7NdMy175uQHKHB1QamwYioH'),
  isTokenAutoRefreshEnabled: true
});

const db = getFirestore(app);

document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. Sticky Navbar & Active State ---
    const navbar = document.querySelector('.navbar');
    const navLinks = document.querySelectorAll('.nav-links a');

    // Sticky Navbar
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // Active Link Highlighting (Multi-page)
    const currentPath = window.location.pathname;
    const filename = currentPath.substring(currentPath.lastIndexOf('/') + 1);

    navLinks.forEach(link => {
        link.classList.remove('active');
        const href = link.getAttribute('href');
        
        // If we are on root or index.html
        if ((filename === '' || filename === 'index.html') && href === 'index.html') {
            link.classList.add('active');
        } else if (filename !== '' && href.includes(filename)) {
            link.classList.add('active');
        }
    });

    // --- 2. Mobile Menu Toggle ---
    const mobileMenuBtn = document.querySelector('.mobile-menu-toggle');
    const navLinksContainer = document.querySelector('.nav-links');

    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            navLinksContainer.classList.toggle('active');
            // Change icon based on state
            const icon = mobileMenuBtn.querySelector('i');
            if (navLinksContainer.classList.contains('active')) {
                icon.classList.replace('ph-list', 'ph-x');
            } else {
                icon.classList.replace('ph-x', 'ph-list');
            }
        });

        // Close mobile menu when clicking a link
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                navLinksContainer.classList.remove('active');
                const icon = mobileMenuBtn.querySelector('i');
                icon.classList.replace('ph-x', 'ph-list');
            });
        });
    }

    // --- 3. Scroll Reveal Animation ---
    const revealElements = document.querySelectorAll('.reveal');

    const revealCallback = function(entries, observer) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target); // Stop observing once revealed
            }
        });
    };

    const revealOptions = {
        threshold: 0.15, // Trigger when 15% of element is visible
        rootMargin: "0px 0px -50px 0px"
    };

    const revealObserver = new IntersectionObserver(revealCallback, revealOptions);

    revealElements.forEach(el => {
        revealObserver.observe(el);
    });

    // Trigger reveal immediately for elements already in viewport on load
    setTimeout(() => {
        revealElements.forEach(el => {
            const rect = el.getBoundingClientRect();
            if (rect.top < window.innerHeight && rect.bottom > 0) {
                el.classList.add('active');
            }
        });
    }, 100);


    // --- 4. FAQ Accordion ---
    const faqItems = document.querySelectorAll('.faq-item');

    faqItems.forEach(item => {
        const questionBtn = item.querySelector('.faq-question');
        const answer = item.querySelector('.faq-answer');

        if(questionBtn) {
            questionBtn.addEventListener('click', () => {
                const isActive = item.classList.contains('active');
                
                // Close all other accordions
                faqItems.forEach(otherItem => {
                    otherItem.classList.remove('active');
                    otherItem.querySelector('.faq-answer').style.maxHeight = null;
                });

                // Toggle current accordion
                if (!isActive) {
                    item.classList.add('active');
                    answer.style.maxHeight = answer.scrollHeight + "px";
                }
            });
        }
    });

    // --- 5. Form Submission (Redirect to WhatsApp) ---
    const contactForm = document.querySelector('.contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Get form values
            const name = document.getElementById('name').value;
            const phone = document.getElementById('phone').value;
            const email = document.getElementById('email') ? document.getElementById('email').value : '';
            const exam = document.getElementById('exam').value;
            
            // Save to Firebase Firestore
            try {
                await addDoc(collection(db, "inquiries"), {
                    name,
                    phone,
                    email,
                    exam,
                    date: new Date().toLocaleString(),
                    timestamp: new Date().getTime() // for sorting
                });
            } catch (error) {
                console.error("Error saving inquiry to cloud: ", error);
            }
            
            // Format message for WhatsApp
            let message = `Hello Shivaay Library! I am interested in joining.%0A%0A*Name:* ${name}%0A*Phone:* ${phone}`;
            if (exam) {
                message += `%0A*Exam Prep:* ${exam}`;
            }
            
            // Redirect to primary WhatsApp number
            const whatsappUrl = `https://wa.me/919993165583?text=${message}`;
            window.open(whatsappUrl, '_blank');
            
            // Reset form
            contactForm.reset();
        });
    }
});
