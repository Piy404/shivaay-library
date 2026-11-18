import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app-check.js";
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js";

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
  provider: new ReCaptchaEnterpriseProvider('6Lf7viYuAAAAADjXVih5HP74x8RNrQ2jLxhgxIG8'),
  isTokenAutoRefreshEnabled: true
});

const db = getFirestore(app);
const auth = getAuth(app);

document.addEventListener('DOMContentLoaded', () => {
    // 1. Data Initialization
    let students = []; // Live from Firebase

    async function fetchStudents() {
        try {
            const querySnapshot = await getDocs(collection(db, "students"));
            students = [];
            querySnapshot.forEach((doc) => {
                students.push({ id: parseInt(doc.id), ...doc.data() });
            });
            renderTable();
        } catch (e) {
            console.error("Error fetching students: ", e);
            
            // TEMPORARY FALLBACK to help recover data
            // Look for common keys where the old data might be stored
            const possibleKeys = ['shivaay_students', 'students', 'shivaay_library_students'];
            let recoveredData = null;
            for (let key of possibleKeys) {
                const data = localStorage.getItem(key);
                if (data) {
                    recoveredData = JSON.parse(data);
                    console.log("Recovered data from localStorage key:", key);
                    break;
                }
            }

            if (recoveredData && recoveredData.length > 0) {
                students = recoveredData;
                alert("Cloud Database error. However, we successfully found your old data in Local Storage! Please fix Firestore rules and click 'Save Details' on each student to migrate them to the cloud.");
                renderTable();
            } else {
                document.getElementById('student-table-body').innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--danger)">Error loading data from Cloud Database. Make sure Firestore is initialized in your Firebase Console and Security Rules allow read/write.</td></tr>';
            }
        }
    }

    // 2. DOM Elements used    // Search and Filter
    const searchInput = document.getElementById('search-input');
    const filterStatus = document.getElementById('filter-status');
    const alertBanner = document.getElementById('expiry-alert-banner');
    
    document.getElementById('close-alert-btn').addEventListener('click', () => {
        alertBanner.style.display = 'none';
    });

    searchInput.addEventListener('input', renderTable);
    filterStatus.addEventListener('change', renderTable);

    // Membership Calculation
    function calculateMembershipStatus(admissionDate, durationMonths = 1) {
        if (!admissionDate || admissionDate === '-') return { status: 'Unknown', expiryDate: '-' };
        const admission = new Date(admissionDate);
        if (isNaN(admission.getTime())) return { status: 'Unknown', expiryDate: '-' };
        
        // Add durationMonths to admission date
        const expiry = new Date(admission);
        expiry.setMonth(expiry.getMonth() + parseInt(durationMonths));
        
        const today = new Date();
        today.setHours(0,0,0,0);
        expiry.setHours(0,0,0,0);
        
        const diffTime = expiry - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        let status = 'Active';
        if (diffDays <= 0) {
            status = 'Expired';
        } else if (diffDays <= 3) {
            status = 'Expiring'; // Soon
        }
        
        return { 
            status, 
            expiryDate: expiry.toLocaleDateString('en-GB') 
        };
    }

    // 3. Check if logged in via Firebase Auth
   
    const ADMIN_EMAIL = "kamitpatel99@gmail.com";

onAuthStateChanged(auth, async (user) => {
  if (user && user.email === ADMIN_EMAIL) {
    showDashboard();
        } else {
            if (user) {
                console.warn(`Unauthorized login attempt by: ${user.email}`);
                const errorMsg = document.getElementById('login-error');
                if (errorMsg) {
                    errorMsg.innerText = "Access denied: Unauthorized admin account.";
                    errorMsg.style.display = 'block';
                }
                try {
                    await signOut(auth);
                } catch (err) {
                    console.error("Sign out error:", err);
                }
            }
            document.getElementById('login-overlay').style.display = 'flex';
            document.getElementById('admin-dashboard').style.display = 'none';
        }
    });
    // Password Toggle
    const togglePasswordBtn = document.getElementById('toggle-password');
    const passcodeField = document.getElementById('admin-passcode');
    if (togglePasswordBtn && passcodeField) {
        togglePasswordBtn.addEventListener('click', () => {
            const type = passcodeField.getAttribute('type') === 'password' ? 'text' : 'password';
            passcodeField.setAttribute('type', type);
            
            // Toggle icon
            const icon = togglePasswordBtn.querySelector('i');
            if (type === 'text') {
                icon.classList.replace('ph-eye', 'ph-eye-slash');
            } else {
                icon.classList.replace('ph-eye-slash', 'ph-eye');
            }
        });
    }

    // Login Handle
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('admin-email').value;
        const passcode = document.getElementById('admin-passcode').value;
        const btn = e.target.querySelector('button[type="submit"]');
        const errorMsg = document.getElementById('login-error');
        
        btn.innerText = 'Verifying...';
        btn.disabled = true;
        errorMsg.style.display = 'none';

        try {
            await signInWithEmailAndPassword(auth, email, passcode);
            // onAuthStateChanged will handle showing the dashboard
        } catch (error) {
            errorMsg.innerText = "Incorrect email or password.";
            errorMsg.style.display = 'block';
            console.error("Login Error: ", error);
        } finally {
            btn.innerText = 'Secure Login';
            btn.disabled = false;
        }
    });

    // Logout Handle
    document.getElementById('logout-btn').addEventListener('click', async (e) => {
        e.preventDefault();
        try {
            await signOut(auth);
            localStorage.removeItem('shivaay_admin_logged_in');
            document.getElementById('admin-passcode').value = '';
        } catch (error) {
            console.error("Logout Error: ", error);
        }
    });

    function showDashboard() {
        document.getElementById('login-overlay').style.display = 'none';
        document.getElementById('admin-dashboard').style.display = 'grid';
        fetchStudents();
    }

    // Navigation
    const navStudents = document.getElementById('nav-students');
    const navInquiries = document.getElementById('nav-inquiries');
    const studentsView = document.getElementById('students-view');
    const inquiriesView = document.getElementById('inquiries-view');
    const studentsActions = document.getElementById('students-actions');
    const pageTitle = document.getElementById('page-title');
    const pageDesc = document.getElementById('page-desc');

    navStudents.addEventListener('click', (e) => {
        e.preventDefault();
        navStudents.classList.add('active');
        navInquiries.classList.remove('active');
        studentsView.style.display = 'block';
        inquiriesView.style.display = 'none';
        studentsActions.style.display = 'flex';
        pageTitle.innerText = 'Seat Management';
        pageDesc.innerText = 'Manage student details and seat reservations';
    });

    navInquiries.addEventListener('click', (e) => {
        e.preventDefault();
        navInquiries.classList.add('active');
        navStudents.classList.remove('active');
        inquiriesView.style.display = 'block';
        studentsView.style.display = 'none';
        studentsActions.style.display = 'none';
        pageTitle.innerText = 'Inquiries';
        pageDesc.innerText = 'View website form submissions';
        renderInquiries();
    });

    // LocalStorage fallback for compatibility is removed. Data is now solely Firebase.

    searchInput.addEventListener('input', renderTable);
    filterStatus.addEventListener('change', renderTable);

    // Render Table
    function renderTable() {
        const tbody = document.getElementById('student-table-body');
        tbody.innerHTML = '';
        
        const searchTerm = searchInput.value.toLowerCase();
        const filterVal = filterStatus.value;
        
        let globalExpiring = 0;
        let globalExpired = 0;
        let activeMembers = 0;

        // Enhance students with membership status
        const enhancedStudents = students.map(student => {
            const memInfo = calculateMembershipStatus(student.admissionDate, student.durationMonths || 1);
            if (memInfo.status === 'Expiring') globalExpiring++;
            if (memInfo.status === 'Expired') globalExpired++;
            if (memInfo.status === 'Active') activeMembers++;
            return {
                ...student,
                membershipStatus: memInfo.status,
                expiryDateString: memInfo.expiryDate
            };
        });

        // Update Stats Dashboard
        document.getElementById('active-count').innerText = activeMembers;
        document.getElementById('expiring-count').innerText = globalExpiring;
        document.getElementById('expired-count').innerText = globalExpired;

        // Update Alert Banner
        if (globalExpiring > 0 || globalExpired > 0) {
            document.getElementById('alert-text').innerHTML = `You have <strong>${globalExpiring}</strong> students expiring soon and <strong>${globalExpired}</strong> expired memberships.`;
            alertBanner.style.display = 'flex';
        } else {
            alertBanner.style.display = 'none';
        }

        let filteredStudents = enhancedStudents.filter(student => {
            const sStatus = student.seatStatus || student.status || 'Reserved';
            const mStatus = student.membershipStatus;
            
            const matchesSearch = student.name.toLowerCase().includes(searchTerm) || student.seat.toString().includes(searchTerm);
            
            let matchesFilter = true;
            if (filterVal !== 'All') {
                if (['Reserved', 'Available'].includes(filterVal)) {
                    matchesFilter = sStatus === filterVal;
                } else if (['Active', 'Expiring', 'Expired'].includes(filterVal)) {
                    matchesFilter = mStatus === filterVal;
                } else if (['Paid', 'Partial', 'Unpaid'].includes(filterVal)) {
                    const pStatus = student.paymentStatus || 'Unpaid';
                    matchesFilter = pStatus === filterVal;
                }
            }
            return matchesSearch && matchesFilter;
        });

        filteredStudents.sort((a, b) => a.seat - b.seat).forEach(student => {
            const tr = document.createElement('tr');
            
            // Determine row and name classes based on membership status
            let rowClass = 'row-active';
            let nameClass = 'name-active';
            let memBadgeClass = 'active'; // green badge default
            
            if (student.membershipStatus === 'Expired') {
                rowClass = 'row-expired';
                nameClass = 'name-expired';
                memBadgeClass = 'expired';
            } else if (student.membershipStatus === 'Expiring') {
                rowClass = 'row-expiring';
                nameClass = 'name-expiring';
                memBadgeClass = 'expiring';
            }
            tr.className = rowClass;
            
            // Handle missing fields from older data versions gracefully
            const sStatus = student.seatStatus || student.status || 'Reserved';
            const pStatus = student.paymentStatus || student.feesStatus || 'Unpaid';
            const aDate = student.admissionDate ? new Date(student.admissionDate).toLocaleDateString('en-GB') : '-';
            
            const pBadge = pStatus.toLowerCase();

            // WhatsApp Message Generator
            let waLink = '';
            if (student.phone) {
                waLink = `https://wa.me/91${student.phone}`;
                if (['Expiring', 'Expired'].includes(student.membershipStatus)) {
                    const message = `Your Shivaay Library membership ${student.membershipStatus === 'Expired' ? 'has expired' : 'is about to expire'}. Please renew your seat to continue using library services.`;
                    waLink += `?text=${encodeURIComponent(message)}`;
                }
            }

            tr.innerHTML = `
                <td><strong>#${student.seat}</strong></td>
                <td><span class="${nameClass}">${student.name}</span></td>
                <td>${aDate}</td>
                <td>${student.durationMonths || 1}</td>
                <td>₹${student.monthlyFee || 0}</td>
                <td>₹${student.totalFees || 0}</td>
                <td>₹${student.amountPaid || 0}</td>
                <td>₹${student.remainingAmount || 0}</td>
                <td style="white-space: nowrap;">${student.expiryDateString} <span class="status-badge ${memBadgeClass}" style="margin-left: 0.5rem; font-size: 0.7rem;">${student.membershipStatus}</span></td>
                <td><span class="status-badge ${pBadge}">${pStatus}</span></td>
                <td>
                    <div class="action-btns">
                        ${waLink ? `<a href="${waLink}" target="_blank" class="action-btn whatsapp" title="Send WhatsApp Reminder"><i class="ph-fill ph-whatsapp-logo"></i></a>` : ''}
                        <button class="action-btn edit-btn" data-id="${student.id}" title="Edit"><i class="ph ph-pencil-simple"></i></button>
                        <button class="action-btn delete delete-btn" data-id="${student.id}" title="Delete"><i class="ph ph-trash"></i></button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Add event listeners to dynamically created buttons
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', () => editStudent(parseInt(btn.dataset.id)));
        });
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', () => deleteStudent(parseInt(btn.dataset.id)));
        });
    }

    // Modal Handle
    const modal = document.getElementById('student-modal');
    
    const monthlyFeeInput = document.getElementById('monthly-fee');
    const monthsPaidInput = document.getElementById('months-paid');
    const totalFeesInput = document.getElementById('total-fees');
    const amountPaidInput = document.getElementById('amount-paid');
    const remainingAmountInput = document.getElementById('remaining-amount');
    const paymentStatusInput = document.getElementById('payment-status');

    function calculateFees() {
        const mFee = parseFloat(monthlyFeeInput.value) || 0;
        const mPaid = parseInt(monthsPaidInput.value) || 0;
        const total = mFee * mPaid;
        totalFeesInput.value = total;

        const aPaid = parseFloat(amountPaidInput.value) || 0;
        const remaining = Math.max(0, total - aPaid);
        remainingAmountInput.value = remaining;

        if (total === 0) {
            paymentStatusInput.value = 'Unpaid';
        } else if (aPaid >= total) {
            paymentStatusInput.value = 'Paid';
        } else if (aPaid > 0) {
            paymentStatusInput.value = 'Partial';
        } else {
            paymentStatusInput.value = 'Unpaid';
        }
    }

    monthlyFeeInput.addEventListener('input', calculateFees);
    monthsPaidInput.addEventListener('input', calculateFees);
    amountPaidInput.addEventListener('input', calculateFees);

    document.getElementById('add-student-btn').addEventListener('click', () => {
        document.getElementById('student-form').reset();
        document.getElementById('edit-id').value = '';
        document.getElementById('months-paid').value = '1';
        calculateFees();
        document.getElementById('modal-title').innerText = 'Assign New Seat';
        modal.classList.add('active');
    });

    document.querySelector('.close-modal').addEventListener('click', () => {
        modal.classList.remove('active');
    });

    // Form Submit (Add/Edit)
    document.getElementById('student-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const idStr = document.getElementById('edit-id').value;
        const seat = parseInt(document.getElementById('seat-number').value);
        const name = document.getElementById('student-name').value;
        const phone = document.getElementById('student-phone').value;
        const admissionDate = document.getElementById('admission-date').value;
        const seatStatus = document.getElementById('seat-status').value;
        
        const monthlyFee = parseFloat(document.getElementById('monthly-fee').value) || 0;
        const durationMonths = parseInt(document.getElementById('months-paid').value) || 1;
        const totalFees = parseFloat(document.getElementById('total-fees').value) || 0;
        const amountPaid = parseFloat(document.getElementById('amount-paid').value) || 0;
        const remainingAmount = parseFloat(document.getElementById('remaining-amount').value) || 0;
        const paymentStatus = document.getElementById('payment-status').value || 'Unpaid';

        if (amountPaid > totalFees) {
            alert('Amount Paid cannot exceed Total Fees.');
            return;
        }

        // Validation for existing seat
        const existingSeat = students.find(s => s.seat === seat && s.id !== parseInt(idStr || '0'));
        if(existingSeat) {
            alert(`Seat #${seat} is already assigned to ${existingSeat.name}!`);
            return;
        }

        const btn = e.target.querySelector('button[type="submit"]');
        btn.innerText = 'Saving to Cloud...';
        btn.disabled = true;

        try {
            let docId;
            let studentData = { 
                name, phone, seat, admissionDate, durationMonths, seatStatus, 
                monthlyFee, totalFees, amountPaid, remainingAmount, paymentStatus 
            };
            
            if (idStr) {
                // Edit existing
                docId = idStr;
            } else {
                // Add new
                const newId = students.length > 0 ? Math.max(...students.map(s => s.id)) + 1 : 1;
                docId = newId.toString();
            }
            
            await setDoc(doc(db, "students", docId), studentData);
            await fetchStudents();
            modal.classList.remove('active');

            // Automatic WhatsApp Notification
            if (phone) {
                const memInfo = calculateMembershipStatus(admissionDate, durationMonths);
                const aDateObj = new Date(admissionDate);
                const formattedAdmissionDate = isNaN(aDateObj.getTime()) ? '-' : aDateObj.toLocaleDateString('en-GB');
                
                let message = '';
                if (idStr) {
                    message = `Hi ${name},\n\nYour Shivaay Library membership details have been updated.\n\nUpdated Details:\n📅 Joining Date: ${formattedAdmissionDate}\n📅 Expiry Date: ${memInfo.expiryDate}\n📦 Membership Plan: ${durationMonths} Month${durationMonths > 1 ? 's' : ''}\n\nThank you.`;
                } else {
                    message = `Hi ${name},\n\nWelcome to Shivaay Library.\n\nYour membership details:\n\n📅 Joining Date: ${formattedAdmissionDate}\n📅 Expiry Date: ${memInfo.expiryDate}\n📦 Membership Plan: ${durationMonths} Month${durationMonths > 1 ? 's' : ''}\n\nThank you for joining Shivaay Library.\nHave a great study experience.`;
                }
                
                const waLink = `https://wa.me/91${phone}?text=${encodeURIComponent(message)}`;
                window.open(waLink, '_blank');
            }
        } catch(err) {
            alert("Error saving data to Cloud Firebase.");
            console.error(err);
        } finally {
            btn.innerText = 'Save Details';
            btn.disabled = false;
        }
    });

    // Edit Function
    function editStudent(id) {
        const student = students.find(s => s.id === id);
        if(student) {
            document.getElementById('edit-id').value = student.id;
            document.getElementById('seat-number').value = student.seat;
            document.getElementById('student-name').value = student.name;
            document.getElementById('student-phone').value = student.phone || '';
            document.getElementById('admission-date').value = student.admissionDate || '';
            
            document.getElementById('monthly-fee').value = student.monthlyFee || 0;
            document.getElementById('months-paid').value = student.durationMonths || 1;
            document.getElementById('amount-paid').value = student.amountPaid || 0;
            document.getElementById('seat-status').value = student.seatStatus || 'Reserved';
            
            calculateFees(); // auto calculate total, remaining and status based on inputs
            
            document.getElementById('modal-title').innerText = 'Edit Seat Assignment';
            modal.classList.add('active');
        }
    }

    // Delete Function
    async function deleteStudent(id) {
        const student = students.find(s => s.id === id);
        if(confirm(`Are you sure you want to remove ${student.name} from Seat #${student.seat}?`)) {
            try {
                await deleteDoc(doc(db, "students", id.toString()));
                await fetchStudents();
            } catch(e) {
                alert("Error deleting student from Cloud.");
                console.error(e);
            }
        }
    }

    // Render Inquiries
    async function renderInquiries() {
        const tbody = document.getElementById('inquiries-table-body');
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem; color: var(--text-muted);">Loading live inquiries from Cloud...</td></tr>';
        
        let inquiries = [];
        try {
            const querySnapshot = await getDocs(collection(db, "inquiries"));
            querySnapshot.forEach((doc) => {
                inquiries.push({ id: doc.id, ...doc.data() });
            });
        } catch(e) {
            console.error("Error fetching inquiries:", e);
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem; color: var(--danger);">Failed to load inquiries from database.</td></tr>';
            return;
        }
        
        // Render in reverse chronological order
        inquiries.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        
        tbody.innerHTML = '';
        inquiries.forEach(inq => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${inq.date || '-'}</td>
                <td>${inq.name}</td>
                <td><a href="tel:+91${inq.phone}">${inq.phone}</a></td>
                <td>${inq.email ? `<a href="mailto:${inq.email}">${inq.email}</a>` : '-'}</td>
                <td>${inq.exam || '-'}</td>
            `;
            tbody.appendChild(tr);
        });
        if(inquiries.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem; color: var(--text-muted);">No inquiries found.</td></tr>';
        }
    }
});