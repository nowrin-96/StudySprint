// ============================================================================
// Study Sprint — UI and DOM Helper Utilities
// ============================================================================

/**
 * Safely escapes untrusted user strings before injecting into HTML.
 * Prevents XSS (Cross-Site Scripting) vulnerabilities.
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Toast Notification System
 * Displays temporary feedback messages in the bottom-right corner.
 * Types: 'success', 'error', 'info', 'warning'
 */
export function showToast(message, type = "info", duration = 4000) {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;

  const iconSvg = {
    success: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`,
    error: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    warning: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    info: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`
  }[type] || "";

  toast.innerHTML = `
    <span style="display: flex; align-items: center; color: var(--${type === 'info' ? 'primary' : type});">${iconSvg}</span>
    <span style="flex: 1; font-weight: 500;">${escapeHtml(message)}</span>
    <button type="button" style="color: var(--text-muted); padding: 2px;" aria-label="Dismiss">&times;</button>
  `;

  const dismissBtn = toast.querySelector("button");
  dismissBtn.addEventListener("click", () => {
    toast.remove();
  });

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(20px)";
    setTimeout(() => toast.remove(), 250);
  }, duration);
}

/**
 * Modal Management: Open modal by ID
 */
export function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.add("open");
  document.body.style.overflow = "hidden"; // Prevent background scrolling

  // Auto focus first visible input
  const firstInput = modal.querySelector("input:not([type=hidden]), select, textarea");
  if (firstInput) {
    setTimeout(() => firstInput.focus(), 100);
  }
}

/**
 * Modal Management: Close modal by ID
 */
export function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.remove("open");
  document.body.style.overflow = "";
}

/**
 * Initialize all modal backdrop click and close button handlers
 */
export function initModals() {
  document.querySelectorAll(".modal-backdrop").forEach(backdrop => {
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) {
        closeModal(backdrop.id);
      }
    });
  });

  // Esc key closes any open modal
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      document.querySelectorAll(".modal-backdrop.open").forEach(openM => {
        closeModal(openM.id);
      });
    }
  });
}

/**
 * Formats a Date object or ISO string into a friendly user string (e.g. "Oct 16, 2026")
 */
export function formatDate(dateInput) {
  if (!dateInput) return "";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

/**
 * Calculates remaining time / overdue status for a given deadline date and time
 */
export function calculateDeadlineStatus(dueDateStr, dueTimeStr = "23:59") {
  if (!dueDateStr) return { label: "No date", statusClass: "badge-upcoming", isOverdue: false };

  const deadlineDateTime = new Date(`${dueDateStr}T${dueTimeStr || "23:59"}:00`);
  const now = new Date();
  const diffMs = deadlineDateTime - now;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMs < 0) {
    const overdueHours = Math.abs(diffHours);
    let overdueLabel = "Overdue";
    if (overdueHours < 24) {
      overdueLabel = `Overdue by ${overdueHours}h`;
    } else {
      const overdueDays = Math.abs(diffDays);
      overdueLabel = `Overdue by ${overdueDays}d`;
    }
    return {
      label: overdueLabel,
      statusClass: "badge-overdue",
      isOverdue: true,
      diffDays
    };
  }

  // Today
  if (diffHours < 24 && deadlineDateTime.toDateString() === now.toDateString()) {
    return {
      label: diffHours <= 1 ? `Due in ${Math.max(1, diffMinutes)}m` : `Due today (${diffHours}h left)`,
      statusClass: "badge-due-today",
      isOverdue: false,
      isToday: true,
      diffDays: 0
    };
  }

  // Upcoming
  if (diffDays === 1) {
    return {
      label: "Due tomorrow",
      statusClass: "badge-upcoming",
      isOverdue: false,
      diffDays: 1
    };
  }

  return {
    label: `In ${diffDays} days`,
    statusClass: "badge-upcoming",
    isOverdue: false,
    diffDays
  };
}

/**
 * Returns category badge class based on category name
 */
export function getCategoryBadgeClass(category) {
  switch (category) {
    case "College Fees":
      return "badge-fees";
    case "Assignments":
      return "badge-assignments";
    case "Examinations":
      return "badge-exams";
    case "Personal Tasks":
      return "badge-personal";
    case "Other":
    default:
      return "badge-other";
  }
}

/**
 * Setup Desktop and Mobile Navigation
 */
export function initNavigation(onViewChange) {
  const navItems = document.querySelectorAll(".sidebar-nav .nav-item");
  const viewSections = document.querySelectorAll(".view-section");
  const sidebar = document.getElementById("appSidebar");
  const backdrop = document.getElementById("sidebarBackdrop");
  const btnOpen = document.getElementById("btnOpenSidebar");
  const btnClose = document.getElementById("btnCloseSidebar");

  function switchView(viewName) {
    navItems.forEach(item => {
      if (item.getAttribute("data-view") === viewName) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });

    viewSections.forEach(sec => {
      if (sec.id === `view${viewName.charAt(0).toUpperCase() + viewName.slice(1)}`) {
        sec.classList.add("active");
      } else {
        sec.classList.remove("active");
      }
    });

    // Close mobile drawer if open
    if (sidebar) sidebar.classList.remove("mobile-open");
    if (backdrop) backdrop.classList.remove("active");

    if (typeof onViewChange === "function") {
      onViewChange(viewName);
    }
  }

  navItems.forEach(item => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const view = item.getAttribute("data-view");
      if (view) {
        switchView(view);
        window.location.hash = view;
      }
    });
  });

  // Mobile menu open / close
  if (btnOpen) {
    btnOpen.addEventListener("click", () => {
      sidebar.classList.add("mobile-open");
      backdrop.classList.add("active");
    });
  }

  if (btnClose) {
    btnClose.addEventListener("click", () => {
      sidebar.classList.remove("mobile-open");
      backdrop.classList.remove("active");
    });
  }

  if (backdrop) {
    backdrop.addEventListener("click", () => {
      sidebar.classList.remove("mobile-open");
      backdrop.classList.remove("active");
    });
  }

  return { switchView };
}
