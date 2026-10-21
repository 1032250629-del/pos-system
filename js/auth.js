/**
 * Authentication & Staff Role Management
 */

const Auth = {
  currentUser: {
    id: "usr-1",
    name: "Alex Morgan",
    role: "admin",
    avatar: "AM"
  },

  init() {
    this.renderUserInfo();
  },

  getActiveUser() {
    return this.currentUser;
  },

  isAdmin() {
    return this.currentUser && this.currentUser.role === "admin";
  },

  renderUserInfo() {
    const avatarEl = document.getElementById("header-user-avatar");
    const nameEl = document.getElementById("header-user-name");
    const roleEl = document.getElementById("header-user-role");

    if (avatarEl) avatarEl.textContent = this.currentUser.avatar || "AM";
    if (nameEl) nameEl.textContent = this.currentUser.name || "Alex Morgan";
    if (roleEl) roleEl.textContent = this.currentUser.role || "admin";
  },

  async login(userId, pin) {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, pin })
      });
      const data = await res.json();
      if (data.success && data.user) {
        this.currentUser = data.user;
        this.renderUserInfo();
        return { success: true, user: data.user };
      }
      return { success: false, message: data.message || "Invalid credentials." };
    } catch (err) {
      const users = DB.users ? DB.users.getAll() : [];
      const user = users.find(u => u.id === userId);
      if (user) {
        this.currentUser = { ...user, avatar: user.name.substring(0, 2).toUpperCase() };
        this.renderUserInfo();
        return { success: true, user: this.currentUser };
      }
      return { success: false, message: "Authentication failed." };
    }
  }
};
