// 📦 Fully refactored dashboard.js — complete with real-time task, project, note, chat, and notification management

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getAuth, onAuthStateChanged, updateProfile, signOut } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import { getFirestore, collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, getDoc } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyCS32LRH2OgNV4VqGc7qJyGWiP1F2vaACo",
    authDomain: "taskmate-6f349.firebaseapp.com",
    projectId: "taskmate-6f349",
    storageBucket: "taskmate-6f349.firebasestorage.app",
    messagingSenderId: "362485876114",
    appId: "1:362485876114:web:b640119b938691c978ad4b",
    measurementId: "G-H2KKFSX3QF"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

let currentUser = null;
let currentEditingNoteId = null;

// Profile Elements
const profileUserName = document.getElementById('profileUserName');
const profileUserEmail = document.getElementById('profileUserEmail');
const profileImageInput = document.getElementById('profileImageInput');
const profileModalAvatar = document.getElementById('profileModalAvatar');
const navProfileAvatarWrapper = document.getElementById('navProfileAvatarWrapper');

const loader = document.getElementById('loader');
const showLoader = () => loader.style.display = 'flex';
const hideLoader = () => loader.style.display = 'none';

const todoTasks = document.getElementById('kanbanTodoTasks');
const inProgressTasks = document.getElementById('kanbanInProgressTasks');
const completedTasks = document.getElementById('kanbanCompletedTasks');
const totalTasksCount = document.getElementById('totalTasks');
const completedTasksCount = document.getElementById('completedTasks');
const pendingTasksCount = document.getElementById('pendingTasks');

function formatDate(date) {
    if (!date) return '';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString();
}
function getPriorityColor(priority) {
    switch (priority.toLowerCase()) {
        case 'high': return 'danger';
        case 'medium': return 'warning';
        case 'low': return 'success';
        default: return 'secondary';
    }
}

function onAppReady() {
    onAuthStateChanged(auth, user => {
        if (user) {
            currentUser = user;
            profileUserName.textContent = user.displayName;
            profileUserEmail.textContent = user.email;

            // Set the dashboard welcome name
            const dashboardUserName = document.getElementById('dashboardUserName');
            if (dashboardUserName) dashboardUserName.textContent = user.displayName;
            if (user.photoURL) {
                profileModalAvatar.src = user.photoURL;
                navProfileAvatarWrapper.innerHTML = `<img src="${user.photoURL}" class="rounded-circle" width="32" height="32">`;
            }

            // Now safely DOM is loaded — these elements exist.
            loadTasks();
            setupNotifications();
            setupTaskForm(user.uid);
            setupProjects();
            setupTeamBoards();
            if (!window.boardFormSetupDone) {
                setupBoardForm();
                window.boardFormSetupDone = true;
            }
            setupNoteForm(user.uid);
            loadNotes();
            initializeChat();
            setupSettings();
            document.getElementById('profileBtn').addEventListener('click', openProfileModal);
            document.getElementById('themeBtn').addEventListener('click', openThemeModal);
            document.getElementById('securityBtn').addEventListener('click', openSecurityModal);
            

            setupSidebarNavigation();
        } else {
            window.location.href = 'login.html';
        }
    });
}

// Wait for DOM ready, then start app
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onAppReady);
} else {
    onAppReady();
}


profileImageInput.addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    const storageRef = ref(storage, `avatars/${currentUser.uid}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    profileModalAvatar.src = url;
    navProfileAvatarWrapper.innerHTML = `<img src="${url}" class="rounded-circle" width="32" height="32">`;
    await updateProfile(currentUser, { photoURL: url });
});

// Load tasks from Firestore
// This function listens for changes in the 'tasks' collection and updates the UI accordingly
function loadTasks() {
    const q = query(collection(db, 'tasks'), where('userId', '==', currentUser.uid), orderBy('createdAt', 'desc'));

    onSnapshot(q, snapshot => {
        // Get all possible containers
        const dashboardTodo = document.getElementById('dashboardKanbanTodoTasks');
        const dashboardInProgress = document.getElementById('dashboardKanbanInProgressTasks');
        const dashboardCompleted = document.getElementById('dashboardKanbanCompletedTasks');

        const tasksTodo = document.getElementById('kanbanTodoTasks');
        const tasksInProgress = document.getElementById('kanbanInProgressTasks');
        const tasksCompleted = document.getElementById('kanbanCompletedTasks');

        // Clear existing tasks if container exists
        if (dashboardTodo) dashboardTodo.innerHTML = '';
        if (dashboardInProgress) dashboardInProgress.innerHTML = '';
        if (dashboardCompleted) dashboardCompleted.innerHTML = '';

        if (tasksTodo) tasksTodo.innerHTML = '';
        if (tasksInProgress) tasksInProgress.innerHTML = '';
        if (tasksCompleted) tasksCompleted.innerHTML = '';

        let total = 0, completedCount = 0, pendingCount = 0;

        snapshot.forEach(docSnap => {
            const task = docSnap.data();
            const taskId = docSnap.id;

            const card = document.createElement('div');
            card.className = 'card mb-2';
            card.innerHTML = `
                <div class="card-body p-2">
                    <p><strong>Team:</strong> ${task.teamName}</p>
                    <p><strong>Project:</strong> ${task.projectName}</p>
                    <p><strong>Task:</strong> ${task.title}</p>
                    <p><strong>Due:</strong> ${formatDate(task.dueDate)}</p>
                    <span class="badge bg-${getPriorityColor(task.priority)}">${task.priority}</span>
                    <div class="mt-2 d-flex justify-content-end gap-2">
                        <button class="btn btn-sm btn-outline-info" onclick="viewTask('${taskId}')"><i class="bi bi-eye"></i></button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteTask('${taskId}')"><i class="bi bi-trash"></i></button>
                    </div>
                </div>
            `;

            total++;
            if (task.status === 'completed') {
                completedCount++;
                if (dashboardCompleted) dashboardCompleted.appendChild(card.cloneNode(true));
                if (tasksCompleted) tasksCompleted.appendChild(card.cloneNode(true));
            } else if (task.status === 'inprogress') {
                pendingCount++;
                if (dashboardInProgress) dashboardInProgress.appendChild(card.cloneNode(true));
                if (tasksInProgress) tasksInProgress.appendChild(card.cloneNode(true));
            } else {
                pendingCount++;
                if (dashboardTodo) dashboardTodo.appendChild(card.cloneNode(true));
                if (tasksTodo) tasksTodo.appendChild(card.cloneNode(true));
            }
        });

        if (totalTasksCount) totalTasksCount.textContent = total;
        if (completedTasksCount) completedTasksCount.textContent = completedCount;
        if (pendingTasksCount) pendingTasksCount.textContent = pendingCount;

        hideLoader();
    });
}

// View Task Function
// This function opens a modal to view task details and allows marking as completed or in progress
window.viewTask = async (id) => {
    const snap = await getDoc(doc(db, 'tasks', id));
    if (snap.exists()) {
        const t = snap.data();

        // Decide button states based on current status
        let showConfirm = true;
        let showDeny = true;
        let confirmDisabled = false;
        let denyDisabled = false;

        if (t.status === 'completed') {
            showConfirm = true;
            showDeny = true;
            confirmDisabled = true;
            denyDisabled = true;
        } else if (t.status === 'inprogress') {
            showConfirm = true;
            showDeny = true;
            confirmDisabled = false;
            denyDisabled = true;
        }

        Swal.fire({
            title: t.title,
            html: `<p><strong>Team:</strong> ${t.teamName}</p>
               <p><strong>Project:</strong> ${t.projectName}</p>
               <p><strong>Description:</strong> ${t.description}</p>
               <p><strong>Due:</strong> ${formatDate(t.dueDate)}</p>
               <p><strong>Status:</strong> ${t.status}</p>
               <p><strong>Priority:</strong> ${t.priority}</p>`,
            showCancelButton: true,
            showDenyButton: showDeny,
            confirmButtonText: 'Mark Completed',
            denyButtonText: 'Mark In Progress',
            cancelButtonText: 'Close',
            didOpen: () => {
                const confirmBtn = Swal.getConfirmButton();
                const denyBtn = Swal.getDenyButton();

                if (confirmDisabled) confirmBtn.disabled = true;
                if (denyDisabled) denyBtn.disabled = true;
            }
        }).then(result => {
            if (result.isConfirmed && !confirmDisabled) {
                updateDoc(doc(db, 'tasks', id), { status: 'completed' });
            } else if (result.isDenied && !denyDisabled) {
                updateDoc(doc(db, 'tasks', id), { status: 'inprogress' });
            }
        });
    }
}

// Delete Task Function
// This function deletes a task from Firestore and updates the UI accordingly
window.deleteTask = (id) => deleteDoc(doc(db, 'tasks', id));


// Setup Task Form
// This function initializes the task form and handles adding new tasks
function setupTaskForm(uid) {
    const form = document.getElementById('addTaskForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const title = document.getElementById('taskTitle').value.trim();
        const description = document.getElementById('taskDescription').value.trim();
        const dueDate = document.getElementById('dueDate').value;
        const priority = document.getElementById('priority').value;
        const teamName = document.getElementById('teamName').value.trim();
        const projectName = document.getElementById('projectName').value.trim();

        if (!title || !description || !dueDate || !priority || !teamName || !projectName) {
            Swal.fire('Incomplete', 'Please fill all fields', 'warning');
            return;
        }

        try {
            await addDoc(collection(db, 'tasks'), {
                title, description, dueDate: new Date(dueDate), priority,
                teamName, projectName, status: 'todo', userId: uid, createdAt: serverTimestamp()
            });

            form.reset();  // clear form after add
            const modalEl = document.getElementById('addTaskModal');
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();  // close modal

            Swal.fire('Success', 'Task added!', 'success');
        } catch (err) {
            console.error("Error adding task:", err);
            Swal.fire('Error', 'Failed to add task', 'error');
        }
    });
}

function setupProjects() {
    const container = document.getElementById('projectsContainer');
    const totalCount = document.getElementById('totalProjectsCount');
    const inProgressCount = document.getElementById('inProgressProjectsCount');
    const completedCount = document.getElementById('completedProjectsCount');

    const q = query(collection(db, 'projects'), where('userId', '==', currentUser.uid), orderBy('createdAt', 'desc'));

    onSnapshot(q, snapshot => {
        container.innerHTML = '';

        let total = 0, inProgress = 0, completed = 0;

        snapshot.forEach(docSnap => {
            const p = { id: docSnap.id, ...docSnap.data() };
            total++;

            if (p.status === 'In Progress') inProgress++;
            if (p.status === 'Completed') completed++;

            const card = document.createElement('div');
            card.className = 'col-md-4 mb-3';
            card.innerHTML = `
          <div class="card h-100">
            <div class="card-body">
              <h5 class="card-title">${p.title}</h5>
              <hr>
              <p><strong>Owner:</strong> ${p.owner}</p>
              <p><strong>Status:</strong> ${p.status}</p>
              <p class="card-text"><strong>Description:</strong> ${p.description || 'No description provided.'}</p>
              <p><strong>People:</strong> ${p.people}</p>
              <p><strong>Due Date:</strong> ${p.dueDate ? new Date(p.dueDate.toDate()).toLocaleDateString() : 'N/A'}</p>
              <p><strong>Priority:</strong> <span class="badge bg-${getPriorityColor(p.priority)}">${p.priority}</span></p>
              <p class="text-muted small">Created: ${p.createdAt ? p.createdAt.toDate().toLocaleDateString() : 'N/A'}</p>
              <div class="d-flex justify-content-end gap-2 mt-3">
                <button class="btn btn-sm btn-outline-primary" onclick="editProject('${p.id}')">
                  <i class="bi bi-pencil"></i>
                </button>
              </div>
            </div>
          </div>`;
            container.appendChild(card);
        });

        totalCount.textContent = total;
        inProgressCount.textContent = inProgress;
        completedCount.textContent = completed;
    });
}

let currentEditingProjectId = null;

// Add Project Form Submission
// This function handles adding or updating projects in Firestore
document.getElementById('addProjectForm').addEventListener('submit', async e => {
    e.preventDefault();

    const title = document.getElementById('projectTitle').value.trim();
    const owner = document.getElementById('projectOwner').value.trim();
    const people = document.getElementById('projectPeople').value.trim();
    const dueDate = document.getElementById('projectDueDate').value;
    const status = document.getElementById('projectStatus').value;
    const priority = document.getElementById('projectPriority').value;
    const description = document.getElementById('projectDescription').value.trim();

    if (!title || !owner || !status || !priority) {
        Swal.fire('Incomplete', 'Please fill required fields', 'warning');
        return;
    }

    const projectData = {
        title, owner, people, dueDate: dueDate ? new Date(dueDate) : null, status, priority, description,
        userId: currentUser.uid,
        createdAt: serverTimestamp()
    };

    try {
        if (currentEditingProjectId) {
            await updateDoc(doc(db, 'projects', currentEditingProjectId), projectData);
            Swal.fire('Updated!', 'Project updated successfully.', 'success');
        } else {
            await addDoc(collection(db, 'projects'), projectData);
            Swal.fire('Added!', 'New project added successfully.', 'success');
        }

        // Reset
        e.target.reset();
        currentEditingProjectId = null;
        document.querySelector('#addProjectModal .modal-title').textContent = 'Add New Project';
        document.querySelector('#addProjectModal button[type="submit"]').textContent = 'Add Project';
        const modal = bootstrap.Modal.getInstance(document.getElementById('addProjectModal'));
        if (modal) modal.hide();

    } catch (err) {
        console.error(err);
        Swal.fire('Error', 'Failed to save project', 'error');
    }
});
// Edit Project Function
// This function opens the project modal with pre-filled data for editing
window.editProject = async (id) => {
    const snap = await getDoc(doc(db, 'projects', id));
    if (!snap.exists()) {
        Swal.fire('Error', 'Project not found', 'error');
        return;
    }

    const p = snap.data();
    currentEditingProjectId = id;

    document.getElementById('projectTitle').value = p.title;
    document.getElementById('projectOwner').value = p.owner;
    document.getElementById('projectPeople').value = p.people;
    document.getElementById('projectDueDate').value = p.dueDate ? new Date(p.dueDate.toDate()).toISOString().split('T')[0] : '';
    document.getElementById('projectStatus').value = p.status;
    document.getElementById('projectPriority').value = p.priority;
    document.getElementById('projectDescription').value = p.description;

    document.querySelector('#addProjectModal .modal-title').textContent = 'Edit Project';
    document.querySelector('#addProjectModal button[type="submit"]').textContent = 'Update Project';

    const modal = new bootstrap.Modal(document.getElementById('addProjectModal'));
    modal.show();
};

// Setup Team Boards
// This function sets up the team boards by fetching the project data and rendering the boards
function setupTeamBoards() {
    const boardsList = document.getElementById('boardsList');
    const q = query(collection(db, 'boards'), where('userId', '==', currentUser.uid), orderBy('createdAt', 'desc'));

    onSnapshot(q, snapshot => {
        boardsList.innerHTML = '';  // clear UI before rebuilding

        snapshot.forEach(docSnap => {
            const b = { id: docSnap.id, ...docSnap.data() };

            const card = document.createElement('div');
            card.className = 'col-md-4 mb-3';
            card.innerHTML = `
                <div class="card h-100 shadow-sm">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <h5 class="card-title mb-0">${b.name}</h5>
                            <button class="btn btn-sm btn-outline-primary" onclick="editBoard('${b.id}')">
                                <i class="bi bi-pencil"></i>
                            </button>
                        </div>
                        <hr>
                        <p><strong>Owner:</strong> ${b.owner}</p>
                        <p><strong>Status:</strong> ${b.status}</p>
                        <p><strong>Members:</strong> ${b.members}</p>
                        <p class="text-muted small">${b.description || 'No description.'}</p>
                        <p class="text-muted small">Created: ${b.createdAt ? b.createdAt.toDate().toLocaleDateString() : 'N/A'}</p>
                    </div>
                </div>`;
            boardsList.appendChild(card);
        });
    });
}

// Edit Board Function 
window.editBoard = async (id) => {
    const snap = await getDoc(doc(db, 'boards', id));
    if (!snap.exists()) {
        Swal.fire('Error', 'Board not found', 'error');
        return;
    }
    const b = snap.data();

    document.getElementById('boardName').value = b.name;
    document.getElementById('boardOwner').value = b.owner;
    document.getElementById('boardMembers').value = b.members;
    document.getElementById('boardStatus').value = b.status;
    document.getElementById('boardDescription').value = b.description;

    const modalEl = document.getElementById('addBoardModal');
    const modalTitle = modalEl.querySelector('.modal-title');
    const submitBtn = modalEl.querySelector('button[type="submit"]');

    modalTitle.textContent = 'Edit Team Board';
    submitBtn.textContent = 'Update Board';

    currentEditingBoardId = id;
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
};

// Track current board being edited
// let currentEditingBoardId = null;

function setupBoardForm() {
    const form = document.getElementById('addBoardForm');
    if (form.dataset.listenerAttached) return; // already attached
    form.dataset.listenerAttached = true;

    form.addEventListener('submit', async e => {
        e.preventDefault();

        const name = document.getElementById('boardName').value.trim();
        const owner = document.getElementById('boardOwner').value.trim();
        const members = document.getElementById('boardMembers').value.trim();
        const status = document.getElementById('boardStatus').value;
        const description = document.getElementById('boardDescription').value.trim();

        if (!name || !owner || !status) {
            Swal.fire('Incomplete', 'Please fill required fields', 'warning');
            return;
        }

        const boardData = {
            name, owner, members, status, description,
            userId: currentUser.uid,
            createdAt: serverTimestamp()
        };

        try {
            await addDoc(collection(db, 'boards'), boardData);

            Swal.fire('Added!', 'Board added successfully.', 'success');

            form.reset();

            const modal = bootstrap.Modal.getInstance(document.getElementById('addBoardModal'));
            if (modal) modal.hide();

        } catch (err) {
            console.error(err);
            Swal.fire('Error', 'Failed to save board', 'error');
        }
    });
}



function setupNoteForm(uid) {
    const form = document.getElementById('addNoteForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const title = document.getElementById('noteTitle').value.trim();
        const content = document.getElementById('noteContentText').value.trim();
        const projectTitle = document.getElementById('noteProjectTitle').value.trim();

        if (!title || !content || !projectTitle) {
            Swal.fire('Incomplete', 'Please fill all fields', 'warning');
            return;
        }

        const modalEl = document.getElementById('addNoteModal');
        const noteModal = bootstrap.Modal.getInstance(modalEl);

        try {
            if (currentEditingNoteId) {
                // Update existing note
                await updateDoc(doc(db, 'notes', currentEditingNoteId), {
                    title, content, projectTitle
                });
                Swal.fire('Success', 'Note updated!', 'success');
            } else {
                // Add new note
                await addDoc(collection(db, 'notes'), {
                    title, content, projectTitle,
                    userId: uid,
                    createdAt: serverTimestamp()
                });
                Swal.fire('Success', 'Note added!', 'success');
            }

            form.reset();
            if (noteModal) noteModal.hide();

            // Reset edit mode
            currentEditingNoteId = null;

            // Reset modal title and button text
            document.querySelector('#addNoteModal .modal-title').textContent = 'Add New Note';
            document.querySelector('#addNoteModal button[type="submit"]').textContent = 'Add Note';

        } catch (err) {
            console.error("Error saving note:", err);
            Swal.fire('Error', 'Failed to save note', 'error');
        }
    });
}

function loadNotes() {
    const notesList = document.getElementById('notesList');
    if (!notesList) return;

    const q = query(
        collection(db, 'notes'),
        where('userId', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
    );

    onSnapshot(q, snapshot => {
        notesList.innerHTML = ''; // clear existing notes

        snapshot.forEach(docSnap => {
            const note = docSnap.data();
            const noteId = docSnap.id;

            const card = document.createElement('div');
            card.className = 'card mb-3';
            card.innerHTML = `
          <div class="card-body">
            <h5 class="card-title">${note.title}</h5>
            <p><h6 class="card-subtitle mb-2 text-muted">Project: ${note.projectTitle}</h6></p>
            <p class="card-text">${note.content}</p>
            <p class="text-muted small">Created: ${note.createdAt ? note.createdAt.toDate().toLocaleDateString() : 'N/A'}</p>
            <div class="d-flex justify-content-end gap-2">
              <button class="btn btn-sm btn-outline-primary" onclick="editNote('${noteId}')">
                <i class="bi bi-pencil"></i>
              </button>
              <button class="btn btn-sm btn-outline-danger" onclick="deleteNote('${noteId}')">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </div>
        `;

            notesList.appendChild(card);
        });
    });
}


window.editNote = async (noteId) => {
    try {
        const snap = await getDoc(doc(db, 'notes', noteId));
        if (!snap.exists()) {
            Swal.fire('Error', 'Note not found', 'error');
            return;
        }

        const note = snap.data();

        // Set current edit ID
        currentEditingNoteId = noteId;

        // Set form field values
        document.getElementById('noteTitle').value = note.title;
        document.getElementById('noteContentText').value = note.content;
        document.getElementById('noteProjectTitle').value = note.projectTitle;

        // Change modal title and button text
        document.querySelector('#addNoteModal .modal-title').textContent = 'Edit Note';
        document.querySelector('#addNoteModal button[type="submit"]').textContent = 'Update Note';

        // Show modal
        const modalEl = document.getElementById('addNoteModal');
        const noteModal = new bootstrap.Modal(modalEl);
        noteModal.show();

    } catch (err) {
        console.error("Error fetching note:", err);
        Swal.fire('Error', 'Failed to fetch note', 'error');
    }
}


window.deleteNote = async (id) => {
    const result = await Swal.fire({
        title: 'Are you sure?',
        text: "You want to delete this note?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, delete it!',
        cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
        try {
            await deleteDoc(doc(db, 'notes', id));
            Swal.fire('Deleted!', 'Note has been deleted.', 'success');
            // No need to manually remove from UI — onSnapshot() handles real-time sync
        } catch (err) {
            console.error("Error deleting note:", err);
            Swal.fire('Error', 'Failed to delete note', 'error');
        }
    }
}


function setupNotifications() {
    const notifCount = document.getElementById('notificationCount');
    const notifList = document.getElementById('notificationsList');
    const q = query(collection(db, 'notifications'), where('userId', '==', currentUser.uid), orderBy('createdAt', 'desc'));
    onSnapshot(q, snapshot => {
        notifCount.textContent = snapshot.size;
        notifList.innerHTML = '<div class="dropdown-header">Notifications</div>';
        snapshot.forEach(doc => {
            const n = doc.data();
            const div = document.createElement('div');
            div.className = 'dropdown-item';
            div.textContent = n.message;
            notifList.appendChild(div);
        });
    });
}

function initializeChat() {
    const chatChannels = document.getElementById('chatChannels');
    const chatMessages = document.getElementById('chatMessages');
    const messageInput = document.getElementById('messageInput');
    const sendMessage = document.getElementById('sendMessage');
    const chatSearch = document.getElementById('chatSearch');

    let selectedUserId = null;
    let unsubscribeMessages = null;

    function loadUsers() {
        const q = query(collection(db, 'users'), orderBy('displayName'));
        onSnapshot(q, snap => {
            chatChannels.innerHTML = '';
            snap.forEach(docSnap => {
                const user = docSnap.data();
                if (user.uid === currentUser.uid) return; // skip yourself

                const div = document.createElement('div');
                div.className = 'p-2 border-bottom chat-user';
                div.style.cursor = 'pointer';
                div.textContent = user.displayName;
                div.dataset.uid = user.uid;

                div.onclick = () => {
                    selectedUserId = user.uid;
                    document.querySelectorAll('.chat-user').forEach(el => el.classList.remove('bg-light'));
                    div.classList.add('bg-light');
                    loadMessages();
                };
                chatChannels.appendChild(div);
            });
        });
    }

    function loadMessages() {
        if (!selectedUserId) return;
        if (unsubscribeMessages) unsubscribeMessages();

        const q = query(
            collection(db, 'chats'),
            where('participants', 'array-contains', currentUser.uid),
            orderBy('createdAt')
        );

        unsubscribeMessages = onSnapshot(q, snap => {
            chatMessages.innerHTML = '';

            snap.forEach(docSnap => {
                const msg = docSnap.data();
                if (
                    (msg.senderId === currentUser.uid && msg.receiverId === selectedUserId) ||
                    (msg.senderId === selectedUserId && msg.receiverId === currentUser.uid)
                ) {
                    const div = document.createElement('div');
                    div.className = 'mb-2';

                    const timestamp = msg.createdAt ? msg.createdAt.toDate().toLocaleString() : '';

                    if (msg.senderId === currentUser.uid) {
                        div.innerHTML = `
                            <div class="text-end">
                                <div class="d-inline-block bg-primary text-white rounded p-2">
                                    <strong>You:</strong> ${msg.text}
                                    <div class="text-muted small text-end">${timestamp}</div>
                                </div>
                            </div>`;
                    } else {
                        div.innerHTML = `
                            <div>
                                <div class="d-inline-block bg-light rounded p-2">
                                    <strong>${msg.senderName}:</strong> ${msg.text}
                                    <div class="text-muted small">${timestamp}</div>
                                </div>
                            </div>`;
                    }
                    chatMessages.appendChild(div);
                }
            });

            chatMessages.scrollTop = chatMessages.scrollHeight;
        });
    }

    sendMessage.onclick = () => {
        const text = messageInput.value.trim();
        if (!text || !selectedUserId) return;

        addDoc(collection(db, 'chats'), {
            senderId: currentUser.uid,
            receiverId: selectedUserId,
            participants: [currentUser.uid, selectedUserId],
            senderName: currentUser.displayName,
            text,
            createdAt: serverTimestamp()
        });

        messageInput.value = '';
    };

    // Search users
    chatSearch.addEventListener('input', () => {
        const term = chatSearch.value.toLowerCase();
        document.querySelectorAll('.chat-user').forEach(userEl => {
            const visible = userEl.textContent.toLowerCase().includes(term);
            userEl.style.display = visible ? 'block' : 'none';
        });
    });

    loadUsers();
}

function setupSettings() {
    const usernameInput = document.getElementById('settingsUsername');
    const emailInput = document.getElementById('settingsEmail');
    const profileImg = document.getElementById('settingsProfileImage');
    const imageInput = document.getElementById('settingsImageInput');
    const updateBtn = document.getElementById('updateProfileBtn');
    const changePasswordBtn = document.getElementById('changePasswordBtn');
    const newPasswordInput = document.getElementById('newPassword');

    // Load current user info when Profile Modal opens
    document.getElementById('profileModal').addEventListener('show.bs.modal', () => {
        usernameInput.value = currentUser.displayName || '';
        emailInput.value = currentUser.email;
        profileImg.src = currentUser.photoURL || 'https://via.placeholder.com/100';
    });

    // Profile Image Upload
    imageInput.addEventListener('change', async e => {
        const file = e.target.files[0];
        if (!file) return;

        const storageRef = ref(storage, `avatars/${currentUser.uid}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);

        await updateProfile(currentUser, { photoURL: url });
        profileImg.src = url;
        Swal.fire('Success', 'Profile image updated', 'success');
    });

    // Update displayName
    updateBtn.onclick = async () => {
        const newName = usernameInput.value.trim();
        if (!newName) {
            return Swal.fire('Error', 'Username cannot be empty', 'warning');
        }
        await updateProfile(currentUser, { displayName: newName });
        Swal.fire('Success', 'Profile updated', 'success');
    };

    // Password change
    changePasswordBtn.onclick = async () => {
        const newPass = newPasswordInput.value;
        if (newPass.length < 6) {
            Swal.fire('Error', 'Password must be at least 6 characters', 'warning');
            return;
        }
        try {
            await currentUser.updatePassword(newPass);
            Swal.fire('Success', 'Password updated', 'success');
            newPasswordInput.value = '';
        } catch (err) {
            console.error(err);
            Swal.fire('Error', err.message, 'error');
        }
    };

    // Attach Theme button click events
    document.getElementById('lightThemeBtn').addEventListener('click', () => setTheme('light'));
    document.getElementById('darkThemeBtn').addEventListener('click', () => setTheme('dark'));

    // Apply saved theme on load
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
}
  

// Modal open functions
function openProfileModal() {
    const modal = new bootstrap.Modal(document.getElementById('profileModal'));
    modal.show();

    setTimeout(() => {
        document.querySelector('#profileModal .btn-close').blur();
    }, 200);
}
  

function openThemeModal() {
    const modal = new bootstrap.Modal(document.getElementById('themeModal'));
    modal.show();

    setTimeout(() => {
        document.querySelector('#timeModal .btn-close').blur();
    }, 200);
}

function openSecurityModal() {
    const modal = new bootstrap.Modal(document.getElementById('securityModal'));
    modal.show();

    setTimeout(() => {
        document.querySelector('#securityModal .btn-close').blur();
    }, 200);
}

// Set Theme function
function setTheme(theme) {
    if (typeof theme !== 'string' || !['light', 'dark'].includes(theme)) {
        console.warn('Invalid theme value received:', theme);
        return;
    }
    localStorage.setItem('theme', theme);
    document.body.classList.remove('light', 'dark');
    document.body.classList.add(theme);
}
    
  
  

function setupSidebarNavigation() {
    const navLinks = document.querySelectorAll('.sidebar .nav-link');
    const sections = document.querySelectorAll('.view-section');
    function activateView(viewId) {
        navLinks.forEach(link => link.classList.remove('active'));
        navLinks.forEach(link => {
            if (link.getAttribute('data-view') === viewId) link.classList.add('active');
        });
        sections.forEach(section => section.classList.remove('active'));
        const target = document.getElementById(viewId);
        if (target) target.classList.add('active');

        // Call loadTasks() when Dashboard and Tasks views is activated
        if (viewId === 'tasks' || viewId === 'dashboard') loadTasks();
    }
    window.addEventListener('hashchange', () => activateView(location.hash.slice(1)));
    activateView(location.hash.slice(1) || 'dashboard');
}

// Sign out function
window.signOutUser = async () => {
    try {
        await signOut(auth);
        window.location.href = 'login.html';
    } catch (error) {
        console.error("Sign out error:", error);
        Swal.fire('Error', 'Failed to sign out', 'error');
    }
};

// Sidebar Offcanvas Toggle
const sidebar = document.getElementById('sidebar');

document.addEventListener('DOMContentLoaded', () => {
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    if (hamburgerBtn) {
        hamburgerBtn.addEventListener('click', () => sidebar.classList.toggle('active'));
    }

    // 👉 Logout button click listener
    const logoutBtn = document.getElementById('offcanvaslogoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => signOutUser());
    } else {
        console.warn('Logout button not found in DOM');
    }
});

document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => sidebar.classList.remove('active'));
});

