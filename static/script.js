const API_BASE = "";
const TASKS_URL = "/tasks";
const CHAT_URL = "/chat";

const newTaskInput = document.getElementById("new-task");
const addBtn = document.getElementById("add-btn");
const taskList = document.getElementById("task-list");
const taskCount = document.getElementById("task-count");

const chatWindow = document.getElementById("chat-window");
const chatInput = document.getElementById("chat-input");
const chatSend = document.getElementById("chat-send");

let tasks = [];

async function fetchTasks() {
  try {
    const res = await fetch(TASKS_URL);
    tasks = await res.json();
    renderTasks();
  } catch (e) {
    console.error("Failed to fetch tasks", e);
  }
}

function renderTasks() {
  taskList.innerHTML = "";
  tasks.forEach(t => {
    const li = document.createElement("li");
    li.className = "task-item" + (t.completed ? " completed" : "");
    li.innerHTML = `<span>${t.id} - ${escapeHtml(t.title)}</span>
      <div>
        <input type="checkbox" ${t.completed ? "checked" : ""} onchange="toggleComplete(${t.id}, this.checked)">
        <button onclick="deleteTask(${t.id})">&times;</button>
      </div>`;
    taskList.appendChild(li);
  });
  taskCount.textContent = `${tasks.length} task${tasks.length !== 1 ? "s" : ""}`;
}

function escapeHtml(unsafe) {
  return unsafe.replace(/[&<"'>]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m]));
}

async function addTask() {
  const title = newTaskInput.value.trim();
  if (!title) return;
  await fetch(TASKS_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title }) });
  newTaskInput.value = "";
  await fetchTasks();
}

async function toggleComplete(id, completed) {
  await fetch(`${TASKS_URL}/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ completed }) });
  await fetchTasks();
}

async function deleteTask(id) {
  await fetch(`${TASKS_URL}/${id}`, { method: "DELETE" });
  await fetchTasks();
}

function appendChat(role, text) {
  const div = document.createElement("div");
  div.className = "chat-bubble " + (role === "assistant" ? "assistant" : "");
  div.textContent = text;
  chatWindow.appendChild(div);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

async function sendChat() {
  const message = chatInput.value.trim();
  if (!message) return;
  appendChat("user", message);
  chatInput.value = "";
  appendChat("assistant", "...");

  try {
    const res = await fetch(CHAT_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message }) });
    const data = await res.json();
    const last = chatWindow.querySelectorAll(".chat-bubble.assistant");
    if (last.length) last[last.length - 1].remove();

    if (data.error) {
      appendChat("assistant", "Error: " + data.error);
    } else {
      appendChat("assistant", data.reply);
      if (data.function_result) {
        appendChat("assistant", JSON.stringify(data.function_result));
      }
      await fetchTasks();
    }
  } catch (e) {
    console.error(e);
    appendChat("assistant", "Failed to contact server");
  }
}

addBtn.addEventListener("click", addTask);
newTaskInput.addEventListener("keypress", e => { if (e.key === "Enter") addTask(); });

chatSend.addEventListener("click", sendChat);
chatInput.addEventListener("keypress", e => { if (e.key === "Enter") sendChat(); });

window.toggleComplete = toggleComplete;
window.deleteTask = deleteTask;

fetchTasks();
