/**
 * Authentication & Role Management
 * Handles Cashier vs Admin login, session persistence, and permission checks.
 * Integrates with Express /api/auth/login and /api/auth/current endpoints.
 */

const Auth = {
  currentUser: null,

  init() {
    this.currentUser = DB.auth.getActiveUser();
    this.renderUserUI();
  },

  getCurrentUser() {
    return this.currentUser || DB.auth.getActiveUser();
  },

  isAdmin() {
    const user = this.getCurrentUser();
    return user && user.role === "admin";
  },

  async login(userId, pin) {
    try {
      const res = await DB.api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ userId, pin })
      });

      if (res.success && res.user) {
        this.currentUser = res.user;
        DB.auth.setActiveUser(res.user);
        this.renderUserUI();
        return { success: true, user: res.user };
      }
      return { success: false, message: res.message || "Invalid credentials." };
    } catch (e) {
      // Offline fallback validation
      const user = DB.users.getById(userId);
      if (!user) {
        return { success: false, message: "User not found" };
      }
      if (user.pin && user.pin !== pin) {
        return { success: false, message: "Incorrect PIN code" };
      }

      this.currentUser = user;
      DB.auth.setActiveUser(user);
      this.renderUserUI();
      return { success: true, user };
    }
  },

  renderUserUI() {
    const user = this.getCurrentUser();
    const avatarEl = document.getElementById("header-user-avatar");
    const nameEl = document.getElementById("header-user-name");
    const roleEl = document.getElementById("header-user-role");

    if (avatarEl) avatarEl.textContent = user.avatar || user.name.substring(0, 2).toUpperCase();
    if (nameEl) nameEl.textContent = user.name;
    if (roleEl) roleEl.textContent = user.role;

    // Show/hide admin restricted elements
    const adminElements = document.querySelectorAll(".admin-only");
    adminElements.forEach(el => {
      if (this.isAdmin()) {
        el.classList.remove("hidden");
      } else {
        el.classList.add("hidden");
      }
    });
  }
};
