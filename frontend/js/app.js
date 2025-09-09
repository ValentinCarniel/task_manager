const API_URL = "http://127.0.0.1:8000/tasks/";

class TaskManager {
  constructor() {
    this.tasks = [];
    this.currentFilter = "all";
    this.init();
  }

  init() {
    this.cacheElements();
    this.setupEventListeners();
    this.setupNavigation();
    this.loadTasks();
  }

  cacheElements() {
    this.taskForm = document.getElementById("taskForm");
    this.taskList = document.getElementById("taskList");
    this.searchTitle = document.getElementById("searchTitle");
    this.searchDate = document.getElementById("searchDate");
    this.searchBtn = document.getElementById("searchBtn");
    this.resetBtn = document.getElementById("resetBtn");
    this.searchResults = document.getElementById("searchResults");
    this.emptyState = document.getElementById("emptyState");
  }

  setupEventListeners() {
    this.taskForm.addEventListener("submit", (e) => {
      e.preventDefault();
      this.addTask();
    });

    this.searchBtn.addEventListener("click", () => this.searchTasks());
    this.resetBtn.addEventListener("click", () => this.resetSearch());

    document.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.addEventListener("click", (e) =>
        this.setFilter(e.target.dataset.filter)
      );
    });

    document
      .getElementById("mobileMenuBtn")
      ?.addEventListener("click", () => this.toggleMobileMenu());
    document
      .getElementById("overlay")
      ?.addEventListener("click", () => this.closeMobileMenu());
  }

  setupNavigation() {
    const navButtons = {
      navCreate: "createSection",
      navTasks: "tasksSection",
      navSearch: "searchSection",
    };

    Object.entries(navButtons).forEach(([btnId, sectionId]) => {
      document.getElementById(btnId)?.addEventListener("click", () => {
        this.showSection(sectionId);
        this.setActiveNav(btnId);
        this.closeMobileMenu();
      });
    });
  }

  showSection(activeSection) {
    document.querySelectorAll(".section-content").forEach((section) => {
      section.classList.add("hidden");
    });
    document.getElementById(activeSection)?.classList.remove("hidden");
  }

  setActiveNav(activeBtn) {
    document.querySelectorAll(".nav-item").forEach((btn) => {
      btn.classList.remove("active", "bg-white/20");
    });
    document.getElementById(activeBtn)?.classList.add("active", "bg-white/20");
  }

  toggleMobileMenu() {
    document.getElementById("sidebar")?.classList.toggle("-translate-x-full");
    document.getElementById("overlay")?.classList.toggle("hidden");
  }

  closeMobileMenu() {
    document.getElementById("sidebar")?.classList.add("-translate-x-full");
    document.getElementById("overlay")?.classList.add("hidden");
  }

  async loadTasks() {
    try {
      const res = await fetch(API_URL);
      this.tasks = await res.json();
      this.renderTasks();
      this.updateStats();
    } catch (err) {
      console.error("Error cargando tareas:", err);
      this.taskList.innerHTML =
        "<p class='text-red-500'>No se pudieron cargar las tareas</p>";
    }
  }

  async addTask() {
    const title = DOMPurify.sanitize(
      document.getElementById("title").value.trim()
    );
    const description = DOMPurify.sanitize(
      document.getElementById("description").value.trim()
    );
    const priority = document.getElementById("priority").value;
    const due_date = document.getElementById("due_date").value;

    if (!title || title.length < 3)
      return alert("El título debe tener al menos 3 caracteres.");
    if (!description || description.length < 5)
      return alert("La descripción debe tener al menos 5 caracteres.");
    if (!["baja", "media", "alta"].includes(priority))
      return alert("Prioridad inválida.");
    if (!due_date) return alert("Selecciona una fecha válida.");

    const today = new Date();
    const dueDateObj = new Date(due_date);
    today.setHours(0, 0, 0, 0);
    dueDateObj.setHours(0, 0, 0, 0);
    if (dueDateObj <= today) return alert("La fecha debe ser futura.");

    const task = { title, description, priority, due_date, completed: false };

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(task),
      });
      const newTask = await res.json();
      this.tasks.push(newTask);
      this.renderTasks();
      this.updateStats();
      this.taskForm.reset();
      this.showToast("Tarea creada con éxito ✅", "green");
    } catch (err) {
      console.error("Error creando tarea:", err);
      alert("No se pudo crear la tarea.");
    }
  }

  async deleteTask(id) {
    if (!confirm("¿Seguro que quieres eliminar esta tarea?")) return;
    try {
      await fetch(`${API_URL}${id}`, { method: "DELETE" });
      this.tasks = this.tasks.filter((t) => t.id !== id);
      this.renderTasks();
      this.updateStats();
      this.showToast("Tarea eliminada con éxito ✅", "red");
    } catch (err) {
      console.error("Error eliminando tarea:", err);
      alert("No se pudo eliminar la tarea");
    }
  }

  async toggleTask(id) {
    const task = this.tasks.find((t) => t.id === id);
    if (!task) return;
    task.completed = !task.completed;
    try {
      await fetch(`${API_URL}${id}/toggle`, { method: "PATCH" });
      this.renderTasks();
      this.updateStats();
    } catch (err) {
      console.error("Error actualizando tarea:", err);
      alert("No se pudo actualizar la tarea");
    }
  }

  setFilter(filter) {
    this.currentFilter = filter;
    document.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.classList.remove("active", "bg-primary", "text-white");
      btn.classList.add("bg-gray-200", "text-gray-700");
    });
    const activeBtn = document.querySelector(`[data-filter="${filter}"]`);
    if (activeBtn) {
      activeBtn.classList.remove("bg-gray-200", "text-gray-700");
      activeBtn.classList.add("active", "bg-primary", "text-white");
    }
    this.renderTasks();
  }

  getFilteredTasks() {
    let filtered = [...this.tasks];
    switch (this.currentFilter) {
      case "alta":
      case "media":
      case "baja":
        filtered = filtered.filter(
          (task) => task.priority === this.currentFilter
        );
        break;
      case "completed":
        filtered = filtered.filter((task) => task.completed);
        break;
    }
    return filtered.sort(
      (a, b) =>
        a.completed - b.completed || new Date(a.due_date) - new Date(b.due_date)
    );
  }

  renderTasks() {
    const tasksToRender =
      this.getFilteredTasks()
        .map((t) => this.createTaskCard(t))
        .join("") || "";

    this.taskList.innerHTML = tasksToRender;
    this.emptyState.classList.toggle("hidden", this.tasks.length > 0);
  }

  createTaskCard(task) {
    return `
      <div class="task-card bg-white rounded-xl shadow-md p-6 ${
        task.completed ? "opacity-75" : ""
      } priority-${task.priority}">
        <div class="flex justify-between items-start mb-4">
          <h3 class="${
            task.completed ? "line-through text-gray-500" : "text-text-primary"
          } font-bold text-lg">
            ${task.title}
          </h3>
          <div class="flex space-x-2">
            <button onclick="taskManager.toggleTask(${
              task.id
            })" class="p-2 rounded-lg bg-green-100 hover:bg-green-200 transition">
              <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
            </button>
            <button onclick="taskManager.deleteTask(${
              task.id
            })" class="p-2 rounded-lg bg-red-100 hover:bg-red-200 transition">
              <svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3m-9 0h10"/>
              </svg>
            </button>
          </div>
        </div>
        <p class="${
          task.completed ? "line-through text-gray-400" : "text-gray-700"
        }">${task.description}</p>
        <div class="flex justify-between text-sm mt-2">
          <span class="font-medium">${task.priority.toUpperCase()}</span>
          <span>${new Date(task.due_date).toLocaleDateString()}</span>
        </div>
      </div>
    `;
  }

  updateStats() {
    document.getElementById("totalTasks").textContent = this.tasks.length;
    document.getElementById("completedTasks").textContent = this.tasks.filter(
      (t) => t.completed
    ).length;
    document.getElementById("pendingTasks").textContent = this.tasks.filter(
      (t) => !t.completed
    ).length;
  }

  searchTasks() {
    const titleQuery = this.searchTitle.value.toLowerCase();
    const dateQuery = this.searchDate.value; // YYYY-MM-DD o D/M/YYYY
    let results = this.tasks;

    if (titleQuery)
      results = results.filter(
        (t) =>
          t.title.toLowerCase().includes(titleQuery) ||
          t.description.toLowerCase().includes(titleQuery)
      );

    if (dateQuery) {
      results = results.filter((t) => {
        const taskDate = new Date(t.due_date);
        let inputDate;

        if (dateQuery.includes("/")) {
          // Formato D/M/YYYY
          const [d, m, y] = dateQuery.split("/").map(Number);
          inputDate = new Date(y, m - 1, d);
        } else {
          // Formato YYYY-MM-DD
          const [y, m, d] = dateQuery.split("-").map(Number);
          inputDate = new Date(y, m - 1, d);
        }

        return (
          taskDate.getFullYear() === inputDate.getFullYear() &&
          taskDate.getMonth() === inputDate.getMonth() &&
          taskDate.getDate() === inputDate.getDate()
        );
      });
    }

    this.searchResults.innerHTML =
      results.map((t) => this.createTaskCard(t)).join("") ||
      "<p class='col-span-full text-center py-8'>No se encontraron tareas</p>";
  }

  resetSearch() {
    this.searchTitle.value = "";
    this.searchDate.value = "";
    this.searchResults.innerHTML = "";
  }

  showToast(message, color = "green") {
    let toast = document.getElementById("toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "toast";
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.className = `fixed top-6 right-6 bg-${color}-500 text-white px-6 py-3 rounded-xl shadow-lg opacity-100 transition-all duration-300 z-50 pointer-events-auto`;

    setTimeout(() => {
      toast.className = `fixed top-6 right-6 bg-${color}-500 text-white px-6 py-3 rounded-xl shadow-lg opacity-0 pointer-events-none transition-all duration-300 z-50`;
    }, 3000);
  }
}

// Inicialización
let taskManager;
document.addEventListener("DOMContentLoaded", () => {
  taskManager = new TaskManager();
});
