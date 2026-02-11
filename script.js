// Select DOM Elements
const todoInput = document.getElementById('todo-input');
const addBtn = document.getElementById('add-btn');
const todoList = document.getElementById('todo-list');
const itemsLeft = document.getElementById('items-left');
const clearCompletedBtn = document.getElementById('clear-completed');
const dateDisplay = document.getElementById('date-display');

// Constants
const STORAGE_KEY = 'todoApp_tasks';

// State
let tasks = [];

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    loadTasks();
    renderTasks();
    displayDate();
});

// Event Listeners
addBtn.addEventListener('click', addTask);
todoInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addTask();
});
clearCompletedBtn.addEventListener('click', clearCompleted);

// Functions

function displayDate() {
    const options = { weekday: 'long', month: 'short', day: 'numeric' };
    const today = new Date();
    dateDisplay.textContent = today.toLocaleDateString('en-US', options);
}

function loadTasks() {
    const storedTasks = localStorage.getItem(STORAGE_KEY);
    if (storedTasks) {
        tasks = JSON.parse(storedTasks);
    }
}

function saveTasks() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    updateItemsLeft();
}

function addTask() {
    const text = todoInput.value.trim();
    if (text === '') return;

    const newTask = {
        id: Date.now(),
        text: text,
        completed: false
    };

    tasks.unshift(newTask); // Add to top
    saveTasks();
    renderTasks();

    todoInput.value = '';
    todoInput.focus();
}

function toggleTask(id) {
    tasks = tasks.map(task => {
        if (task.id === id) {
            return { ...task, completed: !task.completed };
        }
        return task;
    });
    saveTasks();
    renderTasks();
}

function deleteTask(id) {
    // Add deleting class for animation
    const taskElement = document.querySelector(`[data-id="${id}"]`);
    if (taskElement) {
        taskElement.classList.add('deleting');
        
        // Wait for animation to finish before removing from state and DOM
        taskElement.addEventListener('animationend', () => {
            tasks = tasks.filter(task => task.id !== id);
            saveTasks();
            renderTasks();
        });
    } else {
        // Fallback if element not found (shouldn't happen)
        tasks = tasks.filter(task => task.id !== id);
        saveTasks();
        renderTasks();
    }
}

function clearCompleted() {
    const completedTasks = tasks.filter(task => task.completed);
    
    if (completedTasks.length === 0) return;

    // Animate removal of completed tasks
    completedTasks.forEach(task => {
        const el = document.querySelector(`[data-id="${task.id}"]`);
        if (el) el.classList.add('deleting');
    });

    // Wait for animations
    setTimeout(() => {
        tasks = tasks.filter(task => !task.completed);
        saveTasks();
        renderTasks();
    }, 300);
}

function updateItemsLeft() {
    const count = tasks.filter(task => !task.completed).length;
    itemsLeft.textContent = `${count} item${count !== 1 ? 's' : ''} left`;
}

function renderTasks() {
    todoList.innerHTML = '';

    tasks.forEach(task => {
        const li = document.createElement('li');
        li.className = `todo-item ${task.completed ? 'completed' : ''}`;
        li.dataset.id = task.id;

        li.innerHTML = `
            <button class="check-btn" onclick="toggleTask(${task.id})">
                <i class="fa-solid fa-check"></i>
            </button>
            <span class="todo-text">${escapeHtml(task.text)}</span>
            <button class="delete-btn" onclick="deleteTask(${task.id})">
                <i class="fa-solid fa-trash"></i>
            </button>
        `;

        // Add event listeners for buttons within the rendered HTML
        // Note: Inline onclicks are used for simplicity, but we could also attach event listeners here.
        // To make the inline functions work, they need to be globally accessible or attached differently.
        // Let's attach them properly to avoid global pollution.
        
        const checkBtn = li.querySelector('.check-btn');
        const deleteBtn = li.querySelector('.delete-btn');
        
        // Remove inline onclicks from HTML above to use these listeners
        checkBtn.removeAttribute('onclick');
        deleteBtn.removeAttribute('onclick');

        checkBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleTask(task.id);
        });

        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteTask(task.id);
        });
        
        // Make the whole item clickable to toggle (optional, but good UX)
        // But preventing conflict with delete button
        li.addEventListener('click', (e) => {
            if (e.target !== deleteBtn && !deleteBtn.contains(e.target) && 
                e.target !== checkBtn && !checkBtn.contains(e.target)) {
                toggleTask(task.id);
            }
        });

        todoList.appendChild(li);
    });

    updateItemsLeft();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
