import os
import json
from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_from_directory
import openai

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    print("Warning: OPENAI_API_KEY not set. Put your key in a .env file.")
openai.api_key = OPENAI_API_KEY

MODEL = os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")

app = Flask(__name__, static_folder="static", static_url_path="")

tasks = []
task_id_counter = 1

@app.route("/tasks", methods=["POST"])
def create_task():
    global task_id_counter
    data = request.get_json()
    if not data or "title" not in data:
        return jsonify({"error": "Title is required"}), 400
    task = {"id": task_id_counter, "title": data["title"], "completed": False}
    tasks.append(task)
    task_id_counter += 1
    return jsonify(task), 201

@app.route("/tasks", methods=["GET"])
def get_tasks():
    return jsonify(tasks), 200

@app.route("/tasks/<int:task_id>", methods=["PATCH"])
def update_task(task_id):
    data = request.get_json()
    for t in tasks:
        if t["id"] == task_id:
            if "completed" in data:
                t["completed"] = data["completed"]
            if "title" in data:
                t["title"] = data["title"]
            return jsonify(t), 200
    return jsonify({"error": "Task not found"}), 404

@app.route("/tasks/<int:task_id>", methods=["DELETE"])
def delete_task(task_id):
    for t in tasks:
        if t["id"] == task_id:
            tasks.remove(t)
            return jsonify({"message": "Task deleted successfully"}), 200
    return jsonify({"error": "Task not found"}), 404

def addTask(description: str):
    global task_id_counter
    task = {"id": task_id_counter, "title": description, "completed": False}
    tasks.append(task)
    task_id_counter += 1
    return {"status": "success", "task": task, "message": f"Added task '{description}'."}

def viewTasks():
    return {"tasks": tasks}

def completeTask(task_key: str):
    target = None
    try:
        tid = int(task_key)
        target = next((t for t in tasks if t["id"] == tid), None)
    except Exception:
        pass
    if not target:
        target = next((t for t in tasks if t["title"].lower() == task_key.lower()), None)
    if not target:
        return {"status": "error", "message": f"Task '{task_key}' not found."}
    target["completed"] = True
    return {"status": "success", "task": target, "message": f"Marked '{target['title']}' complete."}

def deleteTask(task_key: str):
    target = None
    try:
        tid = int(task_key)
        target = next((t for t in tasks if t["id"] == tid), None)
    except Exception:
        pass
    if not target:
        target = next((t for t in tasks if t["title"].lower() == task_key.lower()), None)
    if not target:
        return {"status": "error", "message": f"Task '{task_key}' not found."}
    tasks.remove(target)
    return {"status": "success", "task": target, "message": f"Deleted '{target['title']}'."}

def find_task_by_name_or_id(tasks, user_input):
    user_input = user_input.lower().strip()
    
    # 1. If user input is a number → match by ID
    if user_input.isdigit():
        for task in tasks:
            if str(task["id"]) == user_input:
                return task

    # 2. Exact match first
    for task in tasks:
        if task["title"].lower() == user_input:
            return task

    # 3. Partial match (longest substring first)
    matches = sorted(
        [task for task in tasks if user_input in task["title"].lower()],
        key=lambda t: len(t["title"]),
        reverse=True
    )
    return matches[0] if matches else None

available_functions = {
    "addTask": addTask,
    "viewTasks": viewTasks,
    "completeTask": completeTask,
    "deleteTask": deleteTask,
}

functions_schema = [
    {
        "name": "addTask",
        "description": "Add a new task to the to-do list.",
        "parameters": {
            "type": "object",
            "properties": {
                "description": {"type": "string", "description": "The task description/title"}
            },
            "required": ["description"],
        },
    },
    {
        "name": "viewTasks",
        "description": "Return all tasks.",
        "parameters": {"type": "object", "properties": {}},
    },
    {
        "name": "completeTask",
        "description": "Mark a task as complete by id or title.",
        "parameters": {
            "type": "object",
            "properties": {
                "task_key": {
                    "type": "string",
                    "description": "Task ID (as string) or task title to mark complete",
                }
            },
            "required": ["task_key"],
        },
    },
    {
        "name": "deleteTask",
        "description": "Delete a task by id or title.",
        "parameters": {
            "type": "object",
            "properties": {
                "task_key": {
                    "type": "string",
                    "description": "Task ID (as string) or task title to delete",
                }
            },
            "required": ["task_key"],
        },
    },
]

@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json()
    if not data or "message" not in data:
        return jsonify({"error": "Message is required"}), 400
    user_input = data["message"]

    messages = [{"role": "user", "content": user_input}]

    # First OpenAI call
    try:
        response = openai.ChatCompletion.create(
            model=MODEL,
            messages=messages,
            functions=functions_schema,
            function_call="auto",
        )
    except Exception as e:
        return jsonify({"error": "OpenAI API request failed", "details": str(e)}), 500

    response_message = response["choices"][0]["message"]

    # If function call detected
    if response_message.get("function_call"):
        func_name = response_message["function_call"]["name"]
        raw_args = response_message["function_call"].get("arguments", "{}")

        try:
            func_args = json.loads(raw_args)
        except Exception:
            func_args = {}

        func = available_functions.get(func_name)
        if not func:
            assistant_reply = f"Requested function {func_name} is not available."
            return jsonify({"reply": assistant_reply}), 200

        # ✅ FIX: Handle deleteTask & completeTask when AI sends a string instead of an ID
        if func_name in ["deleteTask", "completeTask"]:
            task_id = func_args.get("task_id")
            if isinstance(task_id, str):  # AI sent a name, not an ID
                matched_task = find_task_by_name_or_id(task_id)
                if matched_task:
                    func_args["task_id"] = matched_task["id"]
                else:
                    return jsonify({"reply": f"Sorry, I couldn't find a task matching '{task_id}'."}), 200

        # Execute the function
        try:
            result = func(**func_args)
            function_content = json.dumps(result)
        except Exception as e:
            function_content = json.dumps({"status": "error", "message": f"Function call failed: {e}"})

        messages.append(response_message)
        messages.append({"role": "function", "name": func_name, "content": function_content})

        # Second OpenAI call (to generate natural response)
        try:
            second_response = openai.ChatCompletion.create(
                model=MODEL,
                messages=messages,
            )
            assistant_reply = second_response["choices"][0]["message"]["content"]
        except Exception as e:
            assistant_reply = json.dumps({"status": "error", "message": f"OpenAI second call failed: {e}"})

        return jsonify({"reply": assistant_reply, "function_result": json.loads(function_content)}), 200

    return jsonify({"reply": response_message.get("content")}), 200


@app.route("/", methods=["GET"])
def index():
    return send_from_directory(app.static_folder, "index.html")

if __name__ == "__main__":
    app.run(debug=True)