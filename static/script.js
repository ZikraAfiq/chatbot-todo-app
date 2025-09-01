document.addEventListener("DOMContentLoaded", () => {
    const taskInput = document.getElementById("taskInput");
    const addBtn = document.getElementById("add-btn");
    const taskList = document.getElementById("taskList");
    const chatInput = document.getElementById("chatInput");
    const chatSend = document.getElementById("chat-send");
    const chatBox = document.getElementById("chatBox");

    let tasks = [];

    // ✅ Render tasks dynamically
    function renderTasks() {
        taskList.innerHTML = "";
        tasks.forEach((task, index) => {
            const li = document.createElement("li");
            li.className = "flex justify-between items-center p-3 bg-gray-100 rounded-lg";
            li.innerHTML = `
                <span class="${task.completed ? 'line-through text-gray-400' : ''}">${task.name}</span>
                <div class="flex gap-2">
                    <button class="text-green-600 hover:text-green-800" onclick="completeTask(${index})">✔</button>
                    <button class="text-red-600 hover:text-red-800" onclick="deleteTask(${index})">✖</button>
                </div>
            `;
            taskList.appendChild(li);
        });
    }

    // ✅ Add new task
    function addTask(taskName) {
        if (!taskName.trim()) return;
        tasks.push({ name: taskName, completed: false });
        renderTasks();
    }

    // ✅ Complete a task
    window.completeTask = (index) => {
        tasks[index].completed = !tasks[index].completed;
        renderTasks();
    };

    // ✅ Delete a task
    window.deleteTask = (index) => {
        tasks.splice(index, 1);
        renderTasks();
    };

    // ✅ Add task via button
    addBtn.addEventListener("click", () => {
        addTask(taskInput.value);
        taskInput.value = "";
    });

    // ✅ Add task via Enter key
    taskInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            addTask(taskInput.value);
            taskInput.value = "";
        }
    });

    // ✅ AI Chat Handler
    chatSend.addEventListener("click", () => {
        handleChat(chatInput.value);
        chatInput.value = "";
    });

    chatInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            handleChat(chatInput.value);
            chatInput.value = "";
        }
    });

    // ✅ Append messages to chat box
    function addMessage(sender, text) {
        const div = document.createElement("div");
        div.className = sender === "user" ? 
            "text-right mb-2" : 
            "text-left mb-2";

        div.innerHTML = `
            <span class="${sender === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'} inline-block px-3 py-2 rounded-lg">
                ${text}
            </span>
        `;
        chatBox.appendChild(div);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    // ✅ Handle AI chat commands
    function handleChat(message) {
        if (!message.trim()) return;
        addMessage("user", message);

        let response = "I'm not sure what you mean.";
        const lowerMsg = message.toLowerCase();

        if (lowerMsg.startsWith("add")) {
            const taskName = message.replace(/add/i, "").trim();
            if (taskName) {
                addTask(taskName);
                response = `Added task: "${taskName}".`;
            } else {
                response = "Please specify a task to add.";
            }
        } else if (lowerMsg.startsWith("delete") || lowerMsg.startsWith("remove")) {
            const taskName = message.replace(/delete|remove/i, "").trim();
            const index = tasks.findIndex(t => t.name.toLowerCase() === taskName.toLowerCase());
            if (index !== -1) {
                deleteTask(index);
                response = `Successfully deleted the task "${taskName}".`;
            } else {
                response = `Task "${taskName}" not found.`;
            }
        } else if (lowerMsg.startsWith("complete") || lowerMsg.startsWith("done")) {
            const taskName = message.replace(/complete|done/i, "").trim();
            const index = tasks.findIndex(t => t.name.toLowerCase() === taskName.toLowerCase());
            if (index !== -1) {
                completeTask(index);
                response = `Marked "${taskName}" as completed.`;
            } else {
                response = `Task "${taskName}" not found.`;
            }
        } else if (lowerMsg === "show tasks" || lowerMsg === "list tasks") {
            if (tasks.length === 0) {
                response = "Your task list is empty.";
            } else {
                response = "Here are your tasks:\n" + tasks.map((t, i) => `${i + 1}. ${t.name} ${t.completed ? '(✔)' : ''}`).join("\n");
            }
        }

        setTimeout(() => addMessage("ai", response), 500);
    }
});
