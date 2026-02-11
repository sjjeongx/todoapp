// Select DOM Elements
const todoInput = document.getElementById('todo-input');
const todoDate = document.getElementById('todo-date');
const todoCategory = document.getElementById('todo-category');
const addBtn = document.getElementById('add-btn');
const todoList = document.getElementById('todo-list');
const itemsLeft = document.getElementById('items-left');
const clearCompletedBtn = document.getElementById('clear-completed');
const dateDisplay = document.getElementById('date-display');

// Constants
const STORAGE_KEY = 'todoApp_tasks';

// State
let tasks = [];
let draggingItem = null;
let draggingIndex = null;

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    loadTasks();
    displayDate();
    renderTasks();
});

// Event Listeners
addBtn.addEventListener('click', addTask);
todoInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addTask();
});
clearCompletedBtn.addEventListener('click', clearCompleted);

// Drag & Drop Event Listeners on List
todoList.addEventListener('dragover', handleDragOver);
todoList.addEventListener('drop', handleDrop);

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
    const date = todoDate.value;
    const category = todoCategory.value;

    if (text === '') return;

    const newTask = {
        id: Date.now(),
        text: text,
        completed: false,
        dueDate: date,
        category: category
    };

    tasks.unshift(newTask); // Add to top
    saveTasks();
    renderTasks();

    todoInput.value = '';
    todoDate.value = '';
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
    const taskElement = document.querySelector(`li[data-id="${id}"]`);
    if (taskElement) {
        taskElement.classList.add('deleting');
        taskElement.addEventListener('animationend', () => {
            tasks = tasks.filter(task => task.id !== id);
            saveTasks();
            renderTasks();
        });
    } else {
        tasks = tasks.filter(task => task.id !== id);
        saveTasks();
        renderTasks();
    }
}

function clearCompleted() {
    const completedTasks = tasks.filter(task => task.completed);
    if (completedTasks.length === 0) return;

    completedTasks.forEach(task => {
        const el = document.querySelector(`li[data-id="${task.id}"]`);
        if (el) el.classList.add('deleting');
    });

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

function formatDueDate(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function isOverdue(isoString) {
    if (!isoString) return false;
    return new Date(isoString) < new Date();
}

// Edit Mode
function enableEditMode(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const li = document.querySelector(`li[data-id="${id}"]`);
    const textSpan = li.querySelector('.todo-text');

    const input = document.createElement('input');
    input.type = 'text';
    input.value = task.text;
    input.className = 'todo-text-input';

    // Replace span with input
    textSpan.replaceWith(input);
    input.focus();

    // Save on Enter or Blur
    const saveEdit = () => {
        const newText = input.value.trim();
        if (newText) {
            task.text = newText;
            saveTasks();
        }
        renderTasks();
    };

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') saveEdit();
    });
    input.addEventListener('blur', saveEdit);
}

// Drag & Drop Handlers
function handleDragStart(e) {
    draggingItem = e.target;
    draggingIndex = getTaskIndex(Number(draggingItem.dataset.id));
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    draggingItem = null;
    draggingIndex = null;

    // Resync DOM order to State if needed, but we update state on Drop usually
    // or we can just re-render to be safe
    // renderTasks(); 
}

function handleDragOver(e) {
    e.preventDefault(); // Necessary to allow dropping
    e.dataTransfer.dropEffect = 'move';

    const afterElement = getDragAfterElement(todoList, e.clientY);
    const draggable = document.querySelector('.dragging');
    if (!draggable) return;

    if (afterElement == null) {
        todoList.appendChild(draggable);
    } else {
        todoList.insertBefore(draggable, afterElement);
    }
}

function handleDrop(e) {
    e.preventDefault();

    // Reconstruct tasks array based on new DOM order
    const newTasksOrder = [];
    const listItems = todoList.querySelectorAll('.todo-item');

    listItems.forEach(item => {
        const id = Number(item.dataset.id);
        const task = tasks.find(t => t.id === id);
        if (task) newTasksOrder.push(task);
    });

    tasks = newTasksOrder;
    saveTasks();
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.todo-item:not(.dragging)')];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        // offset: distance from the center of the box to the mouse cursor
        const offset = y - box.top - box.height / 2;

        // We want the element where the cursor is *above* its center (negative offset)
        // and closest to 0 (largest negative value)
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function getTaskIndex(id) {
    return tasks.findIndex(task => task.id === id);
}

function renderTasks() {
    todoList.innerHTML = '';

    tasks.forEach(task => {
        const li = document.createElement('li');
        li.className = `todo-item ${task.completed ? 'completed' : ''}`;
        li.dataset.id = task.id;
        li.draggable = true; // Enable drag

        const formattedDate = formatDueDate(task.dueDate);
        const overdueClass = isOverdue(task.dueDate) && !task.completed ? 'overdue' : '';

        li.innerHTML = `
            <button class="check-btn">
                <i class="fa-solid fa-check"></i>
            </button>
            
            <div class="todo-content">
                <div class="todo-header">
                    <span class="todo-text">${escapeHtml(task.text)}</span>
                    ${task.category ? `<span class="badge" data-category="${task.category}">${task.category}</span>` : ''}
                </div>
                ${formattedDate ? `
                <div class="todo-details">
                    <span class="due-date ${overdueClass}"><i class="fa-regular fa-clock"></i> ${formattedDate}</span>
                </div>
                ` : ''}
            </div>

            <div class="todo-actions">
                <button class="action-btn edit-btn" aria-label="Edit">
                    <i class="fa-solid fa-pen"></i>
                </button>
                <button class="action-btn delete-btn" aria-label="Delete">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        `;

        // Event Listeners for this item
        // Drag Events
        li.addEventListener('dragstart', handleDragStart);
        li.addEventListener('dragend', handleDragEnd);

        // Buttons
        const checkBtn = li.querySelector('.check-btn');
        const editBtn = li.querySelector('.edit-btn');
        const deleteBtn = li.querySelector('.delete-btn');
        const todoText = li.querySelector('.todo-text');

        checkBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent bubbling if needed
            toggleTask(task.id);
        });

        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            enableEditMode(task.id);
        });

        // Double click text to edit
        todoText.addEventListener('dblclick', (e) => {
            enableEditMode(task.id);
        });

        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteTask(task.id);
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
