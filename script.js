// Select DOM Elements
const todoInput = document.getElementById('todo-input');
const todoDate = document.getElementById('todo-date');
const todoCategory = document.getElementById('todo-category');
const addBtn = document.getElementById('add-btn');
const todoList = document.getElementById('todo-list');
const itemsLeft = document.getElementById('items-left');
const clearCompletedBtn = document.getElementById('clear-completed');
const dateDisplay = document.getElementById('date-display');
const themeToggle = document.getElementById('theme-toggle');
const progressBar = document.getElementById('progress-bar');
const searchInput = document.getElementById('search-input');
const filterBtns = document.querySelectorAll('.filter-btn');

// Constants
const STORAGE_KEY = 'todoApp_tasks';
const THEME_KEY = 'todoApp_theme';
const SUCCESS_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3'; // Simple ding sound

// State
let tasks = [];
let draggingItem = null;
let draggingIndex = null;
const successAudio = new Audio(SUCCESS_SOUND_URL);
let filterState = {
    search: '',
    status: 'all' // all, active, completed
};

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    loadTheme();
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
themeToggle.addEventListener('click', toggleTheme);
searchInput.addEventListener('input', handleSearch);
filterBtns.forEach(btn => btn.addEventListener('click', handleFilter));

// Drag & Drop Event Listeners on List
todoList.addEventListener('dragover', handleDragOver);
todoList.addEventListener('drop', handleDrop);

// Functions

function loadTheme() {
    const storedTheme = localStorage.getItem(THEME_KEY);
    if (storedTheme === 'light') {
        document.body.classList.add('light-theme');
        updateThemeIcon(true);
    }
}

function toggleTheme() {
    const isLight = document.body.classList.toggle('light-theme');
    localStorage.setItem(THEME_KEY, isLight ? 'light' : 'dark');
    updateThemeIcon(isLight);
}

function updateThemeIcon(isLight) {
    const icon = themeToggle.querySelector('i');
    if (isLight) {
        icon.className = 'fa-solid fa-moon';
    } else {
        icon.className = 'fa-solid fa-sun';
    }
}

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
    updateProgress();
}

function addTask() {
    const text = todoInput.value.trim();
    const date = todoDate.value;
    const category = todoCategory.value;

    if (text === '') return;
    if (text.length > 500) {
        alert('Task is too long (max 500 characters).');
        return;
    }

    const newTask = {
        id: Date.now(),
        text: text,
        completed: false,
        dueDate: date,
        category: category,
        subtasks: []
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
            const newStatus = !task.completed;
            if (newStatus) {
                playSuccessSound();
            }
            return { ...task, completed: newStatus };
        }
        return task;
    });
    saveTasks();
    renderTasks();
    checkAllCompleted();
}

function playSuccessSound() {
    successAudio.currentTime = 0;
    successAudio.volume = 0.5;
    successAudio.play().catch(e => console.log('Audio play failed:', e));
}

function checkAllCompleted() {
    if (tasks.length === 0) return;
    const allCompleted = tasks.every(task => task.completed);
    if (allCompleted) {
        triggerConfetti();
    }
}

function triggerConfetti() {
    // Canvas Confetti
    const duration = 3000;
    const end = Date.now() + duration;

    (function frame() {
        confetti({
            particleCount: 5,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: ['#38bdf8', '#818cf8', '#f472b6']
        });
        confetti({
            particleCount: 5,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: ['#38bdf8', '#818cf8', '#f472b6']
        });

        if (Date.now() < end) {
            requestAnimationFrame(frame);
        }
    }());
}

function updateProgress() {
    if (tasks.length === 0) {
        progressBar.style.width = '0%';
        return;
    }
    const completedCount = tasks.filter(t => t.completed).length;
    const percentage = (completedCount / tasks.length) * 100;
    progressBar.style.width = `${percentage}%`;
}

// Subtasks Logic
function addSubtask(taskId, text) {
    const task = tasks.find(t => t.id === taskId);
    if (task && text.trim() !== '') {
        task.subtasks = task.subtasks || [];
        task.subtasks.push({
            id: Date.now(),
            text: text,
            completed: false
        });
        saveTasks();
        renderTasks();
    }
}

function toggleSubtask(taskId, subtaskId) {
    const task = tasks.find(t => t.id === taskId);
    if (task && task.subtasks) {
        task.subtasks = task.subtasks.map(st =>
            st.id === subtaskId ? { ...st, completed: !st.completed } : st
        );
        saveTasks();
        renderTasks();
    }
}

function deleteSubtask(taskId, subtaskId) {
    const task = tasks.find(t => t.id === taskId);
    if (task && task.subtasks) {
        task.subtasks = task.subtasks.filter(st => st.id !== subtaskId);
        saveTasks();
        renderTasks();
    }
}

// Filter Logic
function handleSearch(e) {
    filterState.search = e.target.value.toLowerCase();
    renderTasks();
}

function handleFilter(e) {
    filterBtns.forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');
    filterState.status = e.target.dataset.filter;
    renderTasks();
}

function getFilteredTasks() {
    return tasks.filter(task => {
        // Status Filter
        if (filterState.status === 'active' && task.completed) return false;
        if (filterState.status === 'completed' && !task.completed) return false;

        // Search Filter
        if (filterState.search && !task.text.toLowerCase().includes(filterState.search)) return false;

        return true;
    });
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

    // Check if already editing
    if (textSpan.tagName === 'INPUT') return;

    const input = document.createElement('input');
    input.type = 'text';
    input.value = task.text;
    input.className = 'todo-text-input';
    input.maxLength = 500;

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

    // Only allow drag reordering if not searching/filtering
    if (filterState.search !== '' || filterState.status !== 'all') return;

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
    if (filterState.search !== '' || filterState.status !== 'all') return;

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
    const displayTasks = getFilteredTasks();

    displayTasks.forEach(task => {
        const li = document.createElement('li');
        li.className = `todo-item ${task.completed ? 'completed' : ''}`;
        li.dataset.id = task.id;
        li.draggable = filterState.search === '' && filterState.status === 'all'; // Enable drag only when no filter

        const formattedDate = formatDueDate(task.dueDate);
        const overdueClass = isOverdue(task.dueDate) && !task.completed ? 'overdue' : '';

        // Generate Subtasks HTML
        let subtasksHtml = '';
        if (task.subtasks && task.subtasks.length > 0) {
            subtasksHtml = `<ul class="subtasks-list">`;
            task.subtasks.forEach(st => {
                subtasksHtml += `
                    <li class="subtask-item ${st.completed ? 'completed' : ''}">
                        <button class="subtask-checkbox" onclick="toggleSubtask(${task.id}, ${st.id})">
                             <i class="fa-solid fa-check"></i>
                        </button>
                        <span class="subtask-text">${escapeHtml(st.text)}</span>
                        <button class="subtask-delete" onclick="deleteSubtask(${task.id}, ${st.id})">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </li>
                `;
            });
            subtasksHtml += `</ul>`;
        }

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
                
                ${subtasksHtml}
                
                <div class="add-subtask-form">
                    <input type="text" class="subtask-input" placeholder="Add subtask..." onkeydown="if(event.key === 'Enter') addSubtask(${task.id}, this.value)">
                </div>
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

        // Fix Inline Onclick Scoping Issue
        // We need to attach these globally or use event delegation.
        // For simplicity in this structure, let's attach event handlers dynamically
        // But the inline onclicks in subtasks won't work because functions aren't global.
        // We need to expose them or rewrite. Rewriting to use event delegation within logic.

        // Remove Subtask DOM handlers and use cleaner approach?
        // Let's make the subtask functions global for now as it's the easiest fix without refactoring entire render logic
        window.toggleSubtask = toggleSubtask;
        window.addSubtask = addSubtask;
        window.deleteSubtask = deleteSubtask;

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
    updateProgress();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
