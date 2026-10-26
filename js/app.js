// ============================================================================
// Study Sprint — Main Application Orchestrator
// ============================================================================

import { isFirebaseConfigured } from "./firebase-config.js";
import { 
  initAuth, 
  registerStudent, 
  loginStudent, 
  logoutStudent, 
  resetStudentPassword, 
  getFriendlyAuthErrorMessage,
  getCurrentUser 
} from "./auth.js";

import { 
  escapeHtml, 
  showToast, 
  openModal, 
  closeModal, 
  initModals, 
  formatDate, 
  calculateDeadlineStatus, 
  getCategoryBadgeClass, 
  initNavigation 
} from "./ui.js";

import { loadStudentData, saveStudentData } from "./db.js";

// Application State (in-memory, synced with Firestore in Phase D)
const appState = {
  user: null,
  reminders: [],
  tasks: [],
  subjects: [],
  habits: [],
  habitLogs: {}, // key: habitId_YYYY-MM-DD -> boolean
  studySessions: [], // completed sessions
  pomodoro: {
    mode: "focus", // 'focus', 'shortBreak', 'longBreak'
    durations: { focus: 25 * 60, shortBreak: 5 * 60, longBreak: 15 * 60 },
    timeLeft: 25 * 60,
    isRunning: false,
    timerId: null,
    endTime: null,
    selectedSubject: ""
  }
};

// Storage helper for offline / demo mode
const LOCAL_DATA_KEY = "studysprint_local_data_";

async function loadLocalStudentData(userId) {
  try {
    const data = await loadStudentData(userId);
    if (data) {
      appState.reminders = Array.isArray(data.reminders) ? data.reminders : [];
      appState.tasks = Array.isArray(data.tasks) ? data.tasks : [];
      appState.subjects = Array.isArray(data.subjects) ? data.subjects : [];
      appState.habits = Array.isArray(data.habits) ? data.habits : [];
      appState.habitLogs = (data.habitLogs && typeof data.habitLogs === "object") ? data.habitLogs : {};
      appState.studySessions = Array.isArray(data.studySessions) ? data.studySessions : [];
    } else {
      // New registered student starts completely empty
      appState.reminders = [];
      appState.tasks = [];
      appState.subjects = [];
      appState.habits = [];
      appState.habitLogs = {};
      appState.studySessions = [];
    }
    renderAllViews();
  } catch (e) {
    console.error("Error loading student data", e);
  }
}

function saveLocalStudentData(userId, immediate = false) {
  if (!userId) return;
  const data = {
    reminders: appState.reminders,
    tasks: appState.tasks,
    subjects: appState.subjects,
    habits: appState.habits,
    habitLogs: appState.habitLogs,
    studySessions: appState.studySessions
  };
  saveStudentData(userId, data, immediate);
}

/* ============================================================================
   1. AUTHENTICATION UI & VIEW SWITCHING
   ============================================================================ */

function setupAuthForms() {
  const authScreen = document.getElementById("authScreen");
  const appScreen = document.getElementById("appScreen");
  const tabSignIn = document.getElementById("tabSignIn");
  const tabRegister = document.getElementById("tabRegister");
  const formLogin = document.getElementById("formLogin");
  const formRegister = document.getElementById("formRegister");
  const formForgot = document.getElementById("formForgot");
  const linkForgot = document.getElementById("linkForgotPassword");
  const linkBackToLogin = document.getElementById("linkBackToLogin");
  const authAlert = document.getElementById("authAlert");

  // Show Auth Alert helper
  function setAuthAlert(msg, type = "error") {
    if (!msg) {
      authAlert.className = "auth-alert hidden";
      authAlert.textContent = "";
      return;
    }
    authAlert.className = `auth-alert auth-alert-${type}`;
    authAlert.textContent = msg;
    authAlert.classList.remove("hidden");
  }

  // Tab switching
  tabSignIn.addEventListener("click", () => {
    tabSignIn.classList.add("active");
    tabRegister.classList.remove("active");
    formLogin.classList.remove("hidden");
    formRegister.classList.add("hidden");
    formForgot.classList.add("hidden");
    setAuthAlert(null);
  });

  tabRegister.addEventListener("click", () => {
    tabRegister.classList.add("active");
    tabSignIn.classList.remove("active");
    formRegister.classList.remove("hidden");
    formLogin.classList.add("hidden");
    formForgot.classList.add("hidden");
    setAuthAlert(null);
  });

  linkForgot.addEventListener("click", (e) => {
    e.preventDefault();
    formLogin.classList.add("hidden");
    formRegister.classList.add("hidden");
    formForgot.classList.remove("hidden");
    setAuthAlert(null);
  });

  linkBackToLogin.addEventListener("click", (e) => {
    e.preventDefault();
    tabSignIn.click();
  });

  // Password visibility toggles
  document.getElementById("toggleLoginPassword")?.addEventListener("click", () => {
    const passInput = document.getElementById("loginPassword");
    passInput.type = passInput.type === "password" ? "text" : "password";
  });

  document.getElementById("toggleRegPassword")?.addEventListener("click", () => {
    const passInput = document.getElementById("regPassword");
    passInput.type = passInput.type === "password" ? "text" : "password";
  });

  // Handle Login Submit
  formLogin.addEventListener("submit", async (e) => {
    e.preventDefault();
    setAuthAlert(null);
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;
    const submitBtn = document.getElementById("btnLoginSubmit");

    submitBtn.disabled = true;
    submitBtn.querySelector(".btn-text").textContent = "Signing in...";

    try {
      await loginStudent(email, password);
      showToast("Welcome back to Study Sprint!", "success");
    } catch (err) {
      const msg = getFriendlyAuthErrorMessage(err.code || err.message);
      setAuthAlert(msg, "error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.querySelector(".btn-text").textContent = "Sign In to Study Sprint";
    }
  });

  // Handle Registration Submit
  formRegister.addEventListener("submit", async (e) => {
    e.preventDefault();
    setAuthAlert(null);
    const name = document.getElementById("regName").value.trim();
    const email = document.getElementById("regEmail").value.trim();
    const password = document.getElementById("regPassword").value;
    const confirmPassword = document.getElementById("regPasswordConfirm").value;
    const submitBtn = document.getElementById("btnRegisterSubmit");

    submitBtn.disabled = true;
    submitBtn.querySelector(".btn-text").textContent = "Creating Account...";

    try {
      await registerStudent(name, email, password, confirmPassword);
      showToast("Account created successfully! Welcome, " + name, "success");
    } catch (err) {
      const msg = getFriendlyAuthErrorMessage(err.code || err.message);
      setAuthAlert(msg, "error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.querySelector(".btn-text").textContent = "Create Account";
    }
  });

  // Handle Forgot Password Submit
  formForgot.addEventListener("submit", async (e) => {
    e.preventDefault();
    setAuthAlert(null);
    const email = document.getElementById("forgotEmail").value.trim();
    const submitBtn = document.getElementById("btnForgotSubmit");

    submitBtn.disabled = true;
    submitBtn.querySelector(".btn-text").textContent = "Sending...";

    try {
      await resetStudentPassword(email);
      setAuthAlert("Password reset link sent to your email! Please check your inbox.", "success");
      showToast("Reset email sent. Check your inbox.", "info");
    } catch (err) {
      const msg = getFriendlyAuthErrorMessage(err.code || err.message);
      setAuthAlert(msg, "error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.querySelector(".btn-text").textContent = "Send Password Reset Link";
    }
  });

  // Handle Logout
  document.getElementById("btnLogout")?.addEventListener("click", async () => {
    if (confirm("Are you sure you want to sign out?")) {
      await logoutStudent();
      showToast("Signed out successfully.", "info");
    }
  });
}

/**
 * Handle state change when student signs in or out
 */
async function handleAuthStateChange(user) {
  const authScreen = document.getElementById("authScreen");
  const appScreen = document.getElementById("appScreen");

  if (user) {
    appState.user = user;
    authScreen.classList.add("hidden");
    appScreen.classList.remove("hidden");

    // Populate user profile info in sidebar
    const displayName = user.displayName || user.email.split("@")[0] || "Student";
    const initial = displayName.charAt(0).toUpperCase();

    document.getElementById("userDisplayName").textContent = displayName;
    document.getElementById("userEmailDisplay").textContent = user.email || "";
    document.getElementById("userAvatarInitial").textContent = initial;

    // Set greeting based on time of day
    const hour = new Date().getHours();
    let timeGreeting = "Good morning";
    if (hour >= 12 && hour < 17) timeGreeting = "Good afternoon";
    else if (hour >= 17) timeGreeting = "Good evening";

    document.getElementById("headerGreetingText").textContent = `${timeGreeting}, ${displayName}! 👋`;

    // Load data for this authenticated student
    await loadLocalStudentData(user.uid);
    renderAllViews();
  } else {
    appState.user = null;
    appState.reminders = [];
    appState.tasks = [];
    appState.subjects = [];
    appState.habits = [];
    appState.habitLogs = {};
    appState.studySessions = [];
    authScreen.classList.remove("hidden");
    appScreen.classList.add("hidden");
  }
}

/* ============================================================================
   2. REMINDERS & DEADLINES MANAGEMENT
   ============================================================================ */

function setupRemindersModule(navHelper) {
  const formReminder = document.getElementById("formReminder");
  const modalReminder = document.getElementById("modalReminder");
  const searchInput = document.getElementById("remindersSearch");
  const filterCategory = document.getElementById("filterCategory");
  const filterStatus = document.getElementById("filterStatus");
  const sortReminders = document.getElementById("sortReminders");

  // Open modal buttons
  document.getElementById("btnOpenAddReminderModal")?.addEventListener("click", () => {
    formReminder.reset();
    document.getElementById("reminderId").value = "";
    document.getElementById("modalReminderTitle").textContent = "Add Deadline / Reminder";
    // Default date to today
    document.getElementById("reminderDueDate").value = new Date().toISOString().split("T")[0];
    openModal("modalReminder");
  });

  document.getElementById("btnQuickAddReminder")?.addEventListener("click", () => {
    document.getElementById("btnOpenAddReminderModal")?.click();
  });

  document.getElementById("btnEmptyAddReminder")?.addEventListener("click", () => {
    document.getElementById("btnOpenAddReminderModal")?.click();
  });

  document.getElementById("btnCancelReminder")?.addEventListener("click", () => {
    closeModal("modalReminder");
  });

  document.getElementById("btnCloseReminderModal")?.addEventListener("click", () => {
    closeModal("modalReminder");
  });

  // Save Reminder (Create or Edit)
  formReminder.addEventListener("submit", (e) => {
    e.preventDefault();
    const id = document.getElementById("reminderId").value;
    const title = document.getElementById("reminderTitle").value.trim();
    const category = document.getElementById("reminderCategory").value;
    const dueDate = document.getElementById("reminderDueDate").value;
    const dueTime = document.getElementById("reminderDueTime").value || "23:59";
    const priority = document.getElementById("reminderPriority").value;
    const description = document.getElementById("reminderDescription").value.trim();

    if (!title || !dueDate) {
      showToast("Please fill in the title and due date.", "warning");
      return;
    }

    if (id) {
      // Edit existing
      const index = appState.reminders.findIndex(r => r.id === id);
      if (index !== -1) {
        appState.reminders[index] = {
          ...appState.reminders[index],
          title, category, dueDate, dueTime, priority, description,
          updatedAt: new Date().toISOString()
        };
        showToast("Reminder updated successfully.", "success");
      }
    } else {
      // Create new
      const newReminder = {
        id: "rem_" + Date.now(),
        title, category, dueDate, dueTime, priority, description,
        completed: false,
        createdAt: new Date().toISOString()
      };
      appState.reminders.unshift(newReminder);
      showToast("New reminder created!", "success");
    }

    saveLocalStudentData(appState.user?.uid);
    closeModal("modalReminder");
    renderRemindersView();
    renderDashboardOverview();
  });

  // Filter & Search events
  searchInput?.addEventListener("input", renderRemindersView);
  filterCategory?.addEventListener("change", renderRemindersView);
  filterStatus?.addEventListener("change", renderRemindersView);
  sortReminders?.addEventListener("change", renderRemindersView);

  // Jump from dashboard to reminders
  document.getElementById("btnGoToReminders")?.addEventListener("click", () => {
    navHelper.switchView("reminders");
  });
}

function renderRemindersView() {
  const container = document.getElementById("remindersListContainer");
  if (!container) return;

  const searchTerm = (document.getElementById("remindersSearch")?.value || "").toLowerCase();
  const categoryFilter = document.getElementById("filterCategory")?.value || "all";
  const statusFilter = document.getElementById("filterStatus")?.value || "all";
  const sortBy = document.getElementById("sortReminders")?.value || "deadlineAsc";

  let list = [...appState.reminders];

  // Search filter
  if (searchTerm) {
    list = list.filter(r => 
      r.title.toLowerCase().includes(searchTerm) || 
      (r.description && r.description.toLowerCase().includes(searchTerm))
    );
  }

  // Category filter
  if (categoryFilter !== "all") {
    list = list.filter(r => r.category === categoryFilter);
  }

  // Status filter
  if (statusFilter !== "all") {
    if (statusFilter === "completed") list = list.filter(r => r.completed);
    else if (statusFilter === "pending") list = list.filter(r => !r.completed);
    else if (statusFilter === "overdue") {
      list = list.filter(r => !r.completed && calculateDeadlineStatus(r.dueDate, r.dueTime).isOverdue);
    }
  }

  // Sort
  list.sort((a, b) => {
    if (sortBy === "priorityDesc") {
      const pWeights = { High: 3, Medium: 2, Low: 1 };
      return (pWeights[b.priority] || 0) - (pWeights[a.priority] || 0);
    } else if (sortBy === "deadlineDesc") {
      return new Date(`${b.dueDate}T${b.dueTime || "23:59"}`) - new Date(`${a.dueDate}T${a.dueTime || "23:59"}`);
    } else {
      return new Date(`${a.dueDate}T${a.dueTime || "23:59"}`) - new Date(`${b.dueDate}T${b.dueTime || "23:59"}`);
    }
  });

  if (list.length === 0) {
    const isFiltered = Boolean(searchTerm || categoryFilter !== "all" || statusFilter !== "all");
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </div>
        <div class="empty-state-title">${isFiltered ? "No matching reminders found" : "No reminders yet"}</div>
        <p class="empty-state-desc">${isFiltered ? "No reminders match your filter criteria." : "Keep track of college fees, assignments, and examinations. Click below to add your first reminder."}</p>
        ${!isFiltered ? `<button type="button" class="btn btn-primary btn-sm" onclick="document.getElementById('btnOpenAddReminderModal').click()">+ Add First Reminder</button>` : ""}
      </div>
    `;
    return;
  }

  container.innerHTML = list.map(item => {
    const status = calculateDeadlineStatus(item.dueDate, item.dueTime);
    const catClass = getCategoryBadgeClass(item.category);
    const priorityClass = `badge-priority-${item.priority.toLowerCase()}`;

    return `
      <div class="reminder-card ${item.completed ? "completed" : ""}" data-id="${item.id}">
        <div class="custom-checkbox ${item.completed ? "checked" : ""}" onclick="window.toggleReminderDone('${item.id}')" title="Mark as ${item.completed ? "pending" : "completed"}">
          ${item.completed ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>` : ""}
        </div>

        <div class="item-content">
          <div class="item-title-row">
            <span class="item-title">${escapeHtml(item.title)}</span>
            <span class="badge ${catClass}">${escapeHtml(item.category)}</span>
            <span class="badge ${priorityClass}">${escapeHtml(item.priority)}</span>
            <span class="countdown-tag ${status.statusClass}">${escapeHtml(status.label)}</span>
          </div>

          ${item.description ? `<div class="item-desc">${escapeHtml(item.description)}</div>` : ""}

          <div class="item-meta-row">
            <span class="item-meta-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              ${formatDate(item.dueDate)} at ${item.dueTime || "23:59"}
            </span>
          </div>
        </div>

        <div class="item-actions">
          <button type="button" class="btn-icon" onclick="window.editReminder('${item.id}')" title="Edit reminder">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          </button>
          <button type="button" class="btn-icon" onclick="window.deleteReminder('${item.id}')" title="Delete reminder">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
    `;
  }).join("");
}

// Global actions for inline onclick handlers
window.toggleReminderDone = (id) => {
  const item = appState.reminders.find(r => r.id === id);
  if (item) {
    item.completed = !item.completed;
    saveLocalStudentData(appState.user?.uid);
    renderRemindersView();
    renderDashboardOverview();
    showToast(item.completed ? "Marked as completed! Great job! 🎉" : "Marked as pending.", "info");
  }
};

window.editReminder = (id) => {
  const item = appState.reminders.find(r => r.id === id);
  if (!item) return;

  document.getElementById("reminderId").value = item.id;
  document.getElementById("reminderTitle").value = item.title;
  document.getElementById("reminderCategory").value = item.category;
  document.getElementById("reminderDueDate").value = item.dueDate;
  document.getElementById("reminderDueTime").value = item.dueTime || "23:59";
  document.getElementById("reminderPriority").value = item.priority;
  document.getElementById("reminderDescription").value = item.description || "";
  document.getElementById("modalReminderTitle").textContent = "Edit Reminder";

  openModal("modalReminder");
};

window.deleteReminder = (id) => {
  if (confirm("Are you sure you want to delete this reminder?")) {
    appState.reminders = appState.reminders.filter(r => r.id !== id);
    saveLocalStudentData(appState.user?.uid);
    renderRemindersView();
    renderDashboardOverview();
    showToast("Reminder deleted.", "info");
  }
};

/* ============================================================================
   3. STUDY PLANNER & SUBJECTS MANAGEMENT
   ============================================================================ */

function setupPlannerModule(navHelper) {
  // Modal Buttons
  document.getElementById("btnOpenAddTaskModal")?.addEventListener("click", () => {
    document.getElementById("formTask").reset();
    document.getElementById("taskId").value = "";
    document.getElementById("modalTaskTitle").textContent = "Add Study Task";
    document.getElementById("taskDueDate").value = new Date().toISOString().split("T")[0];
    populateSubjectDropdowns();
    openModal("modalTask");
  });

  document.getElementById("btnEmptyAddTask")?.addEventListener("click", () => {
    document.getElementById("btnOpenAddTaskModal")?.click();
  });

  document.getElementById("btnCloseTaskModal")?.addEventListener("click", () => {
    closeModal("modalTask");
  });

  document.getElementById("btnCancelTask")?.addEventListener("click", () => {
    closeModal("modalTask");
  });

  // Add Subject Modal
  document.getElementById("btnOpenAddSubjectModal")?.addEventListener("click", () => {
    document.getElementById("formSubject").reset();
    openModal("modalSubject");
  });

  document.getElementById("btnCloseSubjectModal")?.addEventListener("click", () => {
    closeModal("modalSubject");
  });

  document.getElementById("btnCancelSubject")?.addEventListener("click", () => {
    closeModal("modalSubject");
  });

  // Form Task Submit
  document.getElementById("formTask")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const id = document.getElementById("taskId").value;
    const title = document.getElementById("taskTitle").value.trim();
    const subject = document.getElementById("taskSubject").value;
    const dueDate = document.getElementById("taskDueDate").value;
    const priority = document.getElementById("taskPriority").value;

    if (!title) return;

    if (id) {
      const idx = appState.tasks.findIndex(t => t.id === id);
      if (idx !== -1) {
        appState.tasks[idx] = { ...appState.tasks[idx], title, subject, dueDate, priority };
        showToast("Study task updated.", "success");
      }
    } else {
      appState.tasks.unshift({
        id: "task_" + Date.now(),
        title, subject, dueDate, priority,
        completed: false,
        createdAt: new Date().toISOString()
      });
      showToast("Study task added!", "success");
    }

    saveLocalStudentData(appState.user?.uid);
    closeModal("modalTask");
    renderPlannerView();
    renderDashboardOverview();
  });

  // Form Subject Submit
  document.getElementById("formSubject")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("subjectName").value.trim();
    const description = document.getElementById("subjectDescription").value.trim();

    if (!name) return;

    appState.subjects.push({
      id: "sub_" + Date.now(),
      name, description
    });

    saveLocalStudentData(appState.user?.uid);
    closeModal("modalSubject");
    populateSubjectDropdowns();
    renderPlannerView();
    showToast(`Subject "${name}" added!`, "success");
  });

  document.getElementById("filterTaskSubject")?.addEventListener("change", renderPlannerView);
  document.getElementById("filterTaskStatus")?.addEventListener("change", renderPlannerView);

  document.getElementById("btnGoToPlanner")?.addEventListener("click", () => {
    navHelper.switchView("planner");
  });
}

function populateSubjectDropdowns() {
  const taskSelect = document.getElementById("taskSubject");
  const filterSelect = document.getElementById("filterTaskSubject");
  const pomoSelect = document.getElementById("pomoSubjectSelect");

  if (taskSelect) {
    taskSelect.innerHTML = `<option value="">General</option>` +
      appState.subjects.map(s => `<option value="${escapeHtml(s.name)}">${escapeHtml(s.name)}</option>`).join("");
  }

  if (filterSelect) {
    filterSelect.innerHTML = `<option value="all">All Subjects</option>` +
      appState.subjects.map(s => `<option value="${escapeHtml(s.name)}">${escapeHtml(s.name)}</option>`).join("");
  }

  if (pomoSelect) {
    pomoSelect.innerHTML = `<option value="">General Study Session</option>` +
      appState.subjects.map(s => `<option value="${escapeHtml(s.name)}">${escapeHtml(s.name)}</option>`).join("");
  }
}

function renderPlannerView() {
  // Render Subject Chips
  const chipContainer = document.getElementById("subjectsChipList");
  if (chipContainer) {
    if (appState.subjects.length === 0) {
      chipContainer.innerHTML = `<span style="font-size: 0.82rem; color: var(--text-muted);">No subjects added yet.</span>`;
    } else {
      chipContainer.innerHTML = appState.subjects.map(s => `
        <span class="badge badge-fees" style="padding: 6px 14px; font-size: 0.84rem; display: inline-flex; align-items: center; gap: 8px;">
          <span>📚 ${escapeHtml(s.name)}</span>
          <button type="button" onclick="window.deleteSubject('${s.id}')" style="color: var(--text-muted); font-size: 1rem; line-height: 1;" title="Remove subject">&times;</button>
        </span>
      `).join("");
    }
  }

  // Render Tasks List
  const container = document.getElementById("plannerTasksList");
  if (!container) return;

  const subjectFilter = document.getElementById("filterTaskSubject")?.value || "all";
  const statusFilter = document.getElementById("filterTaskStatus")?.value || "all";

  let list = [...appState.tasks];
  if (subjectFilter !== "all") {
    list = list.filter(t => t.subject === subjectFilter);
  }
  if (statusFilter === "completed") {
    list = list.filter(t => t.completed);
  } else if (statusFilter === "pending") {
    list = list.filter(t => !t.completed);
  }

  if (list.length === 0) {
    const isFiltered = Boolean(subjectFilter !== "all" || statusFilter !== "all");
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-title">${isFiltered ? "No matching study tasks found" : "No study tasks yet"}</div>
        <p class="empty-state-desc">${isFiltered ? "No tasks match your selected subject or status filter." : "Organize chapters, assignments, and revisions for your exams."}</p>
        ${!isFiltered ? `<button type="button" class="btn btn-primary btn-sm" onclick="document.getElementById('btnOpenAddTaskModal').click()">+ Add Study Task</button>` : ""}
      </div>
    `;
    return;
  }

  container.innerHTML = list.map(item => `
    <div class="reminder-card ${item.completed ? "completed" : ""}">
      <div class="custom-checkbox ${item.completed ? "checked" : ""}" onclick="window.toggleTaskDone('${item.id}')">
        ${item.completed ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>` : ""}
      </div>
      <div class="item-content">
        <div class="item-title-row">
          <span class="item-title">${escapeHtml(item.title)}</span>
          ${item.subject ? `<span class="badge badge-fees">${escapeHtml(item.subject)}</span>` : ""}
          <span class="badge badge-priority-${(item.priority || "Medium").toLowerCase()}">${escapeHtml(item.priority || "Medium")}</span>
        </div>
        ${item.dueDate ? `<div class="item-meta-row"><span>Target: ${formatDate(item.dueDate)}</span></div>` : ""}
      </div>
      <div class="item-actions">
        <button type="button" class="btn-icon" onclick="window.editTask('${item.id}')" title="Edit task">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
        </button>
        <button type="button" class="btn-icon" onclick="window.deleteTask('${item.id}')" title="Delete task">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
    </div>
  `).join("");
}

window.editTask = (id) => {
  const task = appState.tasks.find(t => t.id === id);
  if (!task) return;

  document.getElementById("taskId").value = task.id;
  document.getElementById("taskTitle").value = task.title;
  document.getElementById("taskDueDate").value = task.dueDate || "";
  document.getElementById("taskPriority").value = task.priority || "Medium";
  document.getElementById("modalTaskTitle").textContent = "Edit Study Task";

  populateSubjectDropdowns();
  document.getElementById("taskSubject").value = task.subject || "";

  openModal("modalTask");
};

window.toggleTaskDone = (id) => {
  const task = appState.tasks.find(t => t.id === id);
  if (task) {
    task.completed = !task.completed;
    saveLocalStudentData(appState.user?.uid);
    renderPlannerView();
    renderDashboardOverview();
    showToast(task.completed ? "Task completed! 🎯" : "Task marked as pending.", "info");
  }
};

window.deleteTask = (id) => {
  if (confirm("Delete this study task?")) {
    appState.tasks = appState.tasks.filter(t => t.id !== id);
    saveLocalStudentData(appState.user?.uid);
    renderPlannerView();
    renderDashboardOverview();
  }
};

window.deleteSubject = (id) => {
  if (confirm("Remove this subject?")) {
    appState.subjects = appState.subjects.filter(s => s.id !== id);
    saveLocalStudentData(appState.user?.uid);
    populateSubjectDropdowns();
    renderPlannerView();
    showToast("Subject removed.", "info");
  }
};

/* ============================================================================
   4. POMODORO FOCUS TIMER MODULE
   ============================================================================ */

function setupPomodoroModule(navHelper) {
  const pomo = appState.pomodoro;
  const timerDigits = document.getElementById("timerDigits");
  const miniPomoDigits = document.getElementById("miniPomoDigits");
  const btnToggle = document.getElementById("btnTimerToggle");
  const btnMiniToggle = document.getElementById("btnMiniPomoToggle");
  const miniPomoBtnText = document.getElementById("miniPomoBtnText");
  const btnReset = document.getElementById("btnTimerReset");
  const progressRing = document.getElementById("timerProgressRing");
  const phaseLabel = document.getElementById("timerPhaseLabel");

  const modeButtons = {
    focus: document.getElementById("pomoBtnFocus"),
    shortBreak: document.getElementById("pomoBtnShortBreak"),
    longBreak: document.getElementById("pomoBtnLongBreak")
  };

  const ringCircumference = 2 * Math.PI * 130; // ~816.8
  if (progressRing) {
    progressRing.style.strokeDasharray = `${ringCircumference}`;
  }

  function updateTimerDisplay() {
    const minutes = Math.floor(pomo.timeLeft / 60);
    const seconds = pomo.timeLeft % 60;
    const formatted = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

    if (timerDigits) timerDigits.textContent = formatted;
    if (miniPomoDigits) miniPomoDigits.textContent = formatted;

    // Update document title with timer countdown when running
    if (pomo.isRunning) {
      document.title = `(${formatted}) Study Sprint Focus`;
    } else {
      document.title = "Study Sprint — Smart Student Productivity";
    }

    // Progress Ring Calculation
    if (progressRing) {
      const total = pomo.durations[pomo.mode];
      const fraction = pomo.timeLeft / total;
      const offset = ringCircumference * (1 - fraction);
      progressRing.style.strokeDashoffset = `${offset}`;
    }
  }

  function setMode(newMode) {
    if (pomo.isRunning) pauseTimer();
    pomo.mode = newMode;
    pomo.timeLeft = pomo.durations[newMode];

    Object.keys(modeButtons).forEach(m => {
      if (modeButtons[m]) {
        modeButtons[m].classList.toggle("active", m === newMode);
      }
    });

    const labels = {
      focus: "Focus Session",
      shortBreak: "Short Break",
      longBreak: "Long Break"
    };

    if (phaseLabel) phaseLabel.textContent = labels[newMode];
    const miniBadge = document.getElementById("miniPomoModeBadge");
    if (miniBadge) miniBadge.textContent = `${labels[newMode]} • ${Math.floor(pomo.durations[newMode] / 60)}m`;

    updateTimerDisplay();
  }

  function startTimer() {
    if (pomo.isRunning) return;
    pomo.isRunning = true;
    pomo.endTime = Date.now() + pomo.timeLeft * 1000;

    btnToggle.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
      <span>Pause</span>
    `;
    if (miniPomoBtnText) miniPomoBtnText.textContent = "Pause";

    pomo.timerId = setInterval(() => {
      const now = Date.now();
      const remainingSeconds = Math.round((pomo.endTime - now) / 1000);

      if (remainingSeconds <= 0) {
        // Session Completed
        clearInterval(pomo.timerId);
        pomo.isRunning = false;
        pomo.timeLeft = 0;
        updateTimerDisplay();
        handleSessionComplete();
      } else {
        pomo.timeLeft = remainingSeconds;
        updateTimerDisplay();
      }
    }, 500); // Check twice a second to avoid drift
  }

  function pauseTimer() {
    if (!pomo.isRunning) return;
    clearInterval(pomo.timerId);
    pomo.isRunning = false;

    btnToggle.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
      <span>Resume</span>
    `;
    if (miniPomoBtnText) miniPomoBtnText.textContent = "Resume";
    document.title = "Study Sprint — Smart Student Productivity";
  }

  function resetTimer() {
    pauseTimer();
    pomo.timeLeft = pomo.durations[pomo.mode];
    btnToggle.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
      <span>Start</span>
    `;
    if (miniPomoBtnText) miniPomoBtnText.textContent = "Start Focus";
    updateTimerDisplay();
  }

  function handleSessionComplete() {
    btnToggle.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
      <span>Start</span>
    `;
    if (miniPomoBtnText) miniPomoBtnText.textContent = "Start Focus";

    if (pomo.mode === "focus") {
      const sessionDurationMins = Math.floor(pomo.durations.focus / 60);
      const selectedSub = document.getElementById("pomoSubjectSelect")?.value || "General Study";

      // Log completed session to student records
      const sessionRecord = {
        id: "sess_" + Date.now(),
        subject: selectedSub,
        durationMinutes: sessionDurationMins,
        completedAt: new Date().toISOString()
      };
      appState.studySessions.push(sessionRecord);
      saveLocalStudentData(appState.user?.uid);
      renderDashboardOverview();

      showToast(`🎉 Focus session complete! Logged ${sessionDurationMins} minutes of study.`, "success", 6000);

      // Play soft chime if supported or ask for break
      setMode("shortBreak");
    } else {
      showToast("Break time finished! Ready to jump back in?", "info");
      setMode("focus");
    }
  }

  // Bind Mode buttons
  modeButtons.focus?.addEventListener("click", () => setMode("focus"));
  modeButtons.shortBreak?.addEventListener("click", () => setMode("shortBreak"));
  modeButtons.longBreak?.addEventListener("click", () => setMode("longBreak"));

  // Bind Controls
  btnToggle?.addEventListener("click", () => {
    if (pomo.isRunning) pauseTimer();
    else startTimer();
  });

  btnMiniToggle?.addEventListener("click", () => {
    if (pomo.isRunning) pauseTimer();
    else startTimer();
  });

  btnReset?.addEventListener("click", resetTimer);

  document.getElementById("btnMiniPomoFullView")?.addEventListener("click", () => {
    navHelper.switchView("pomodoro");
  });

  updateTimerDisplay();
}

/* ============================================================================
   5. DAILY HABIT TRACKER MODULE
   ============================================================================ */

function setupHabitsModule(navHelper) {
  // Modal Buttons
  document.getElementById("btnOpenAddHabitModal")?.addEventListener("click", () => {
    document.getElementById("formHabit").reset();
    document.getElementById("habitId").value = "";
    document.getElementById("modalHabitTitle").textContent = "Add Daily Habit";
    openModal("modalHabit");
  });

  document.getElementById("btnCloseHabitModal")?.addEventListener("click", () => {
    closeModal("modalHabit");
  });

  document.getElementById("btnCancelHabit")?.addEventListener("click", () => {
    closeModal("modalHabit");
  });

  // Habit Form Submit
  document.getElementById("formHabit")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const id = document.getElementById("habitId").value;
    const name = document.getElementById("habitName").value.trim();
    const description = document.getElementById("habitDescription").value.trim();

    if (!name) return;

    if (id) {
      const idx = appState.habits.findIndex(h => h.id === id);
      if (idx !== -1) {
        appState.habits[idx] = { ...appState.habits[idx], name, description };
        showToast("Habit updated.", "success");
      }
    } else {
      appState.habits.push({
        id: "hab_" + Date.now(),
        name, description,
        createdAt: new Date().toISOString()
      });
      showToast("Habit added!", "success");
    }

    saveLocalStudentData(appState.user?.uid);
    closeModal("modalHabit");
    renderHabitsView();
    renderDashboardOverview();
  });

  document.getElementById("btnGoToHabits")?.addEventListener("click", () => {
    navHelper.switchView("habits");
  });

  document.getElementById("btnEmptyAddHabit")?.addEventListener("click", () => {
    document.getElementById("btnOpenAddHabitModal")?.click();
  });
}

/**
 * Calculates consecutive day streak for a habit
 */
function calculateHabitStreak(habitId) {
  let streak = 0;
  const d = new Date();

  // Check today or yesterday as start
  const todayKey = `${habitId}_${d.toISOString().split("T")[0]}`;
  const isDoneToday = !!appState.habitLogs[todayKey];

  if (!isDoneToday) {
    // Check if yesterday was done to allow streak to continue today
    d.setDate(d.getDate() - 1);
  }

  while (true) {
    const key = `${habitId}_${d.toISOString().split("T")[0]}`;
    if (appState.habitLogs[key]) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

function renderHabitsView() {
  const container = document.getElementById("habitsListContainer");
  if (!container) return;

  if (appState.habits.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-title">No daily habits</div>
        <p class="empty-state-desc">You have not created any daily habits yet. Form consistent daily study and wellness habits.</p>
        <button type="button" class="btn btn-primary btn-sm" onclick="document.getElementById('btnOpenAddHabitModal').click()">+ Add First Habit</button>
      </div>
    `;
    return;
  }

  // Get past 7 days for weekly grid
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const dayLetter = d.toLocaleDateString("en-US", { weekday: "narrow" });
    days.push({ dateStr, dayLetter });
  }

  container.innerHTML = appState.habits.map(habit => {
    const streak = calculateHabitStreak(habit.id);

    const weekButtons = days.map(d => {
      const key = `${habit.id}_${d.dateStr}`;
      const isCompleted = !!appState.habitLogs[key];
      return `
        <div class="habit-day-col">
          <span class="habit-day-label">${d.dayLetter}</span>
          <button type="button" class="habit-check-btn ${isCompleted ? "completed" : ""}" 
            onclick="window.toggleHabitDay('${habit.id}', '${d.dateStr}')" 
            title="${d.dateStr}: ${isCompleted ? "Completed (click to undo)" : "Not completed"}">
            ✓
          </button>
        </div>
      `;
    }).join("");

    return `
      <div class="habit-card">
        <div class="habit-main">
          <div class="habit-name">${escapeHtml(habit.name)}</div>
          ${habit.description ? `<p style="font-size: 0.82rem; margin-bottom: 6px;">${escapeHtml(habit.description)}</p>` : ""}
          <span class="habit-streak-pill">
            🔥 ${streak} ${streak === 1 ? "day" : "days"} streak
          </span>
        </div>

        <div class="habit-week-grid">
          ${weekButtons}
        </div>

        <div style="display: flex; gap: 4px;">
          <button type="button" class="btn-icon" onclick="window.editHabit('${habit.id}')" title="Edit habit">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          </button>
          <button type="button" class="btn-icon" onclick="window.deleteHabit('${habit.id}')" title="Delete habit">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
    `;
  }).join("");
}

window.toggleHabitDay = (habitId, dateStr) => {
  const key = `${habitId}_${dateStr}`;
  if (appState.habitLogs[key]) {
    delete appState.habitLogs[key];
  } else {
    appState.habitLogs[key] = true;
  }
  saveLocalStudentData(appState.user?.uid);
  renderHabitsView();
  renderDashboardOverview();
};

window.editHabit = (id) => {
  const habit = appState.habits.find(h => h.id === id);
  if (!habit) return;
  document.getElementById("habitId").value = habit.id;
  document.getElementById("habitName").value = habit.name;
  document.getElementById("habitDescription").value = habit.description || "";
  document.getElementById("modalHabitTitle").textContent = "Edit Habit";
  openModal("modalHabit");
};

window.deleteHabit = (id) => {
  if (confirm("Delete this habit?")) {
    appState.habits = appState.habits.filter(h => h.id !== id);
    saveLocalStudentData(appState.user?.uid);
    renderHabitsView();
    renderDashboardOverview();
    showToast("Habit deleted.", "info");
  }
};

/* ============================================================================
   6. DASHBOARD & PROGRESS OVERVIEW CALCULATIONS
   ============================================================================ */

function renderDashboardOverview() {
  const todayStr = new Date().toISOString().split("T")[0];

  // 1. Deadlines Stats
  const pendingReminders = appState.reminders.filter(r => !r.completed);
  const overdueReminders = pendingReminders.filter(r => calculateDeadlineStatus(r.dueDate, r.dueTime).isOverdue);

  const kpiPending = document.getElementById("kpiPendingCount");
  const kpiOverdue = document.getElementById("kpiOverdueSubtext");
  const navBadge = document.getElementById("badgePendingDeadlines");

  if (kpiPending) kpiPending.textContent = pendingReminders.length;
  if (kpiOverdue) kpiOverdue.textContent = `${overdueReminders.length} overdue`;
  if (navBadge) {
    if (pendingReminders.length > 0) {
      navBadge.textContent = pendingReminders.length;
      navBadge.classList.remove("hidden");
    } else {
      navBadge.classList.add("hidden");
    }
  }

  // Render Dashboard Reminders List (Top 3 urgent/upcoming)
  const dashRemindersContainer = document.getElementById("dashboardRemindersList");
  if (dashRemindersContainer) {
    const upcomingList = [...pendingReminders].sort((a, b) => 
      new Date(`${a.dueDate}T${a.dueTime || "23:59"}`) - new Date(`${b.dueDate}T${b.dueTime || "23:59"}`)
    ).slice(0, 3);

    if (upcomingList.length === 0) {
      dashRemindersContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-title">No deadlines yet</div>
          <p class="empty-state-desc">You have no upcoming deadlines. Click below to add an assignment or fee reminder.</p>
          <button type="button" class="btn btn-primary btn-sm" onclick="document.getElementById('btnOpenAddReminderModal').click()">+ Add First Reminder</button>
        </div>
      `;
    } else {
      dashRemindersContainer.innerHTML = upcomingList.map(item => {
        const status = calculateDeadlineStatus(item.dueDate, item.dueTime);
        const catClass = getCategoryBadgeClass(item.category);
        return `
          <div class="reminder-card" data-id="${item.id}">
            <div class="custom-checkbox" onclick="window.toggleReminderDone('${item.id}')"></div>
            <div class="item-content">
              <div class="item-title-row">
                <span class="item-title">${escapeHtml(item.title)}</span>
                <span class="badge ${catClass}">${escapeHtml(item.category)}</span>
                <span class="countdown-tag ${status.statusClass}">${escapeHtml(status.label)}</span>
              </div>
              <div class="item-meta-row">
                <span>Due ${formatDate(item.dueDate)}</span>
              </div>
            </div>
          </div>
        `;
      }).join("");
    }
  }

  // 2. Tasks Stats
  const totalTasks = appState.tasks.length;
  const completedTasks = appState.tasks.filter(t => t.completed).length;
  const kpiTasksCount = document.getElementById("kpiTasksCount");
  const kpiTasksSubtext = document.getElementById("kpiTasksSubtext");

  if (kpiTasksCount) kpiTasksCount.textContent = totalTasks;
  if (kpiTasksSubtext) kpiTasksSubtext.textContent = `${completedTasks} completed`;

  // Render Dashboard Tasks List (Top 3)
  const dashTasksContainer = document.getElementById("dashboardTasksList");
  if (dashTasksContainer) {
    const previewTasks = appState.tasks.slice(0, 3);
    if (previewTasks.length === 0) {
      dashTasksContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-title">No study tasks yet</div>
          <p class="empty-state-desc">Plan your revision, homework, or exam preparation.</p>
          <button type="button" class="btn btn-secondary btn-sm" onclick="document.getElementById('btnOpenAddTaskModal').click()">+ Add Study Task</button>
        </div>
      `;
    } else {
      dashTasksContainer.innerHTML = previewTasks.map(t => `
        <div class="reminder-card ${t.completed ? "completed" : ""}">
          <div class="custom-checkbox ${t.completed ? "checked" : ""}" onclick="window.toggleTaskDone('${t.id}')">
            ${t.completed ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>` : ""}
          </div>
          <div class="item-content">
            <span class="item-title">${escapeHtml(t.title)}</span>
            ${t.subject ? `<div class="item-meta-row" style="margin-top: 4px;"><span>${escapeHtml(t.subject)}</span></div>` : ""}
          </div>
        </div>
      `).join("");
    }
  }

  // 3. Study Sessions Stats
  const totalStudyMinutes = appState.studySessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
  const kpiStudyTime = document.getElementById("kpiStudyTime");
  const kpiSessionsCount = document.getElementById("kpiSessionsCount");

  if (kpiStudyTime) {
    if (totalStudyMinutes >= 60) {
      const hrs = (totalStudyMinutes / 60).toFixed(1);
      kpiStudyTime.textContent = `${hrs}h`;
    } else {
      kpiStudyTime.textContent = `${totalStudyMinutes}m`;
    }
  }
  if (kpiSessionsCount) {
    kpiSessionsCount.textContent = `${appState.studySessions.length} focus sessions`;
  }

  // 4. Habits Stats (Today's completion rate & best streak)
  let todayHabitCompletions = 0;
  let bestStreak = 0;

  appState.habits.forEach(h => {
    const key = `${h.id}_${todayStr}`;
    if (appState.habitLogs[key]) todayHabitCompletions++;
    const s = calculateHabitStreak(h.id);
    if (s > bestStreak) bestStreak = s;
  });

  const habitsRate = appState.habits.length > 0 ? Math.round((todayHabitCompletions / appState.habits.length) * 100) : 0;
  const kpiHabitsPercent = document.getElementById("kpiHabitsPercent");
  const kpiHabitStreak = document.getElementById("kpiHabitStreak");

  if (kpiHabitsPercent) kpiHabitsPercent.textContent = `${habitsRate}%`;
  if (kpiHabitStreak) kpiHabitStreak.textContent = `${bestStreak} day best streak`;

  // Render Dashboard Habits Mini Checklist
  const dashHabitsContainer = document.getElementById("dashboardHabitsList");
  if (dashHabitsContainer) {
    if (appState.habits.length === 0) {
      dashHabitsContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-title">No daily habits</div>
          <p class="empty-state-desc">No daily habits yet. Create habits to track your daily progress.</p>
          <button type="button" class="btn btn-secondary btn-sm" onclick="document.getElementById('btnOpenAddHabitModal').click()">+ Add Daily Habit</button>
        </div>
      `;
    } else {
      dashHabitsContainer.innerHTML = appState.habits.slice(0, 4).map(h => {
        const isDone = !!appState.habitLogs[`${h.id}_${todayStr}`];
        return `
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; background: var(--bg-subtle); border-radius: var(--radius-md);">
            <span style="font-size: 0.9rem; font-weight: 500;">${escapeHtml(h.name)}</span>
            <button type="button" class="habit-check-btn ${isDone ? "completed" : ""}" onclick="window.toggleHabitDay('${h.id}', '${todayStr}')">
              ✓
            </button>
          </div>
        `;
      }).join("");
    }
  }

  // 5. Progress Page Stats
  const taskPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const progTasksRate = document.getElementById("progTasksRate");
  const progTasksSummary = document.getElementById("progTasksSummary");
  const progTasksBar = document.getElementById("progTasksBar");

  if (progTasksRate) progTasksRate.textContent = `${taskPercent}%`;
  if (progTasksSummary) progTasksSummary.textContent = `${completedTasks} of ${totalTasks} tasks completed`;
  if (progTasksBar) progTasksBar.style.width = `${taskPercent}%`;

  const progStudyHours = document.getElementById("progStudyHours");
  const progSessionsSummary = document.getElementById("progSessionsSummary");

  if (progStudyHours) progStudyHours.textContent = `${(totalStudyMinutes / 60).toFixed(1)} hrs`;
  if (progSessionsSummary) progSessionsSummary.textContent = `${appState.studySessions.length} focus sessions completed`;

  const progHabitsRate = document.getElementById("progHabitsRate");
  const progHabitsSummary = document.getElementById("progHabitsSummary");
  const progHabitsBar = document.getElementById("progHabitsBar");

  if (progHabitsRate) progHabitsRate.textContent = `${habitsRate}%`;
  if (progHabitsSummary) progHabitsSummary.textContent = `${todayHabitCompletions} of ${appState.habits.length} habits logged today`;
  if (progHabitsBar) progHabitsBar.style.width = `${habitsRate}%`;
}

function renderAllViews() {
  populateSubjectDropdowns();
  renderRemindersView();
  renderPlannerView();
  renderHabitsView();
  renderDashboardOverview();
}

/* ============================================================================
   7. INITIALIZATION
   ============================================================================ */

document.addEventListener("DOMContentLoaded", async () => {
  // 1. Display formatted date in topbar
  const dateDisplay = document.getElementById("currentDateDisplay");
  if (dateDisplay) {
    const now = new Date();
    dateDisplay.textContent = now.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  }

  // 2. Initialize Navigation and Modals
  const navHelper = initNavigation((viewName) => {
    if (viewName === "reminders") renderRemindersView();
    else if (viewName === "planner") renderPlannerView();
    else if (viewName === "habits") renderHabitsView();
    else if (viewName === "dashboard" || viewName === "progress") renderDashboardOverview();
  });
  initModals();

  // 3. Setup Functional Modules
  setupAuthForms();
  setupRemindersModule(navHelper);
  setupPlannerModule(navHelper);
  setupPomodoroModule(navHelper);
  setupHabitsModule(navHelper);

  // 4. Browser Notification Prompt
  const btnNotif = document.getElementById("btnNotificationPrompt");
  if (btnNotif && "Notification" in window) {
    if (Notification.permission === "granted") {
      btnNotif.title = "Browser notifications enabled";
      btnNotif.classList.add("btn-secondary");
    }

    btnNotif.addEventListener("click", async () => {
      if (Notification.permission === "granted") {
        showToast("Browser deadline alerts are already active!", "info");
      } else if (Notification.permission !== "denied") {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
          showToast("Notifications enabled for upcoming deadlines!", "success");
          btnNotif.classList.add("btn-secondary");
        }
      } else {
        showToast("Notification permission blocked in browser settings.", "warning");
      }
    });
  }

  // 5. Initialize Authentication (Firebase or Preview Mode)
  await initAuth(handleAuthStateChange);
});
