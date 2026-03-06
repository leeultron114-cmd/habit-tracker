document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const dateDisplay = document.getElementById('dateDisplay');
    const addHabitForm = document.getElementById('addHabitForm');
    const habitInput = document.getElementById('habitInput');
    const habitsGrid = document.getElementById('habitsGrid');
    const emptyState = document.getElementById('emptyState');
    const habitCountDisplay = document.getElementById('habitCount');
    const toast = document.getElementById('toast');
    const habitFrequency = document.getElementById('habitFrequency');
    const targetGroup = document.getElementById('targetGroup');
    const habitTarget = document.getElementById('habitTarget');

    // Edit Modal Elements
    const editHabitModal = document.getElementById('editHabitModal');
    const editHabitForm = document.getElementById('editHabitForm');
    const editHabitId = document.getElementById('editHabitId');
    const editHabitInput = document.getElementById('editHabitInput');
    const editHabitFrequency = document.getElementById('editHabitFrequency');
    const editTargetGroup = document.getElementById('editTargetGroup');
    const editHabitTarget = document.getElementById('editHabitTarget');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const cancelEditBtn = document.getElementById('cancelEditBtn');

    let habits = JSON.parse(localStorage.getItem('habits')) || [];

    habitFrequency.addEventListener('change', (e) => {
        if (e.target.value === 'weekly') {
            targetGroup.style.display = 'flex';
        } else {
            targetGroup.style.display = 'none';
        }
    });

    editHabitFrequency.addEventListener('change', (e) => {
        if (e.target.value === 'weekly') {
            editTargetGroup.style.display = 'flex';
        } else {
            editTargetGroup.style.display = 'none';
        }
    });

    function openEditModal(id) {
        const habit = habits.find(h => h.id === id);
        if (!habit) return;

        editHabitId.value = habit.id;
        editHabitInput.value = habit.name;
        editHabitFrequency.value = habit.frequency;

        if (habit.frequency === 'weekly') {
            editTargetGroup.style.display = 'flex';
            editHabitTarget.value = habit.target || 3;
        } else {
            editTargetGroup.style.display = 'none';
            editHabitTarget.value = 3;
        }

        editHabitModal.classList.add('show');
    }

    function closeEditModal() {
        editHabitModal.classList.remove('show');
        setTimeout(() => {
            editHabitForm.reset();
            editTargetGroup.style.display = 'none';
        }, 300); // Wait for transition
    }

    closeModalBtn.addEventListener('click', closeEditModal);
    cancelEditBtn.addEventListener('click', closeEditModal);

    editHabitModal.addEventListener('click', (e) => {
        if (e.target === editHabitModal) {
            closeEditModal();
        }
    });

    editHabitForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const id = editHabitId.value;
        const habitIndex = habits.findIndex(h => h.id === id);

        if (habitIndex === -1) return;

        const newName = editHabitInput.value.trim();
        if (newName) {
            habits[habitIndex].name = newName;
            habits[habitIndex].frequency = editHabitFrequency.value;
            habits[habitIndex].target = editHabitFrequency.value === 'weekly' ? parseInt(editHabitTarget.value, 10) : 0;

            // Recalculate streak based on potentially new target/frequency
            recalculateStreaks(habits[habitIndex]);

            saveHabits();
            renderHabits();
            closeEditModal();
            showToast('Habit updated!');
        }
    });

    function init() {
        updateDateDisplay();
        renderHabits();
    }

    function getLocalDateString() {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function updateDateDisplay() {
        const options = { weekday: 'long', month: 'short', day: 'numeric' };
        dateDisplay.textContent = new Date().toLocaleDateString('en-US', options);
    }

    function saveHabits() {
        localStorage.setItem('habits', JSON.stringify(habits));
    }

    addHabitForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const habitName = habitInput.value.trim();

        if (habitName) {
            const newHabit = {
                id: Date.now().toString(),
                name: habitName,
                createdAt: new Date().getTime(),
                currentStreak: 0,
                maxStreak: 0,
                completedDates: [],
                frequency: habitFrequency.value,
                target: habitFrequency.value === 'weekly' ? parseInt(habitTarget.value, 10) : 0
            };

            habits.push(newHabit);
            saveHabits();
            habitInput.value = '';
            habitFrequency.value = 'daily';
            habitTarget.value = '3';
            targetGroup.style.display = 'none';

            renderHabits();
            showToast(`"${habitName}" added!`);
        }
    });

    window.toggleHabit = toggleHabit; // Ensure it's global if we needed inline onClick, but we use event listeners
    function toggleHabit(id) {
        const habit = habits.find(h => h.id === id);
        if (!habit) return;

        const today = getLocalDateString();
        const isCompletedToday = habit.completedDates.includes(today);

        if (isCompletedToday) {
            habit.completedDates = habit.completedDates.filter(date => date !== today);
        } else {
            if (!habit.completedDates.includes(today)) {
                habit.completedDates.push(today);
            }
        }

        habit.completedDates.sort();

        recalculateStreaks(habit);
        saveHabits();
        renderHabits();
    }

    function getWeekStartingDate(dateString) {
        const [y, m, d] = dateString.split('-');
        const date = new Date(y, m - 1, d);
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(date.setDate(diff));
        return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
    }

    function recalculateWeeklyStreaks(habit) {
        const target = habit.target || 3;
        const weekCounts = {};

        habit.completedDates.forEach(date => {
            const week = getWeekStartingDate(date);
            weekCounts[week] = (weekCounts[week] || 0) + 1;
        });

        const currentWeekString = getWeekStartingDate(getLocalDateString());
        habit.currentWeekProgress = weekCounts[currentWeekString] || 0;

        let effectiveStreak = 0;
        let iterWeekString = currentWeekString;
        let iterDate = new Date();
        // Extract y,m,d from iterWeekString to avoid timezone issues when setting iterDate
        let [yw, mw, dw] = iterWeekString.split('-');
        iterDate = new Date(yw, mw - 1, dw);

        if ((weekCounts[iterWeekString] || 0) >= target) {
            effectiveStreak++;
            iterDate.setDate(iterDate.getDate() - 7);
            iterWeekString = `${iterDate.getFullYear()}-${String(iterDate.getMonth() + 1).padStart(2, '0')}-${String(iterDate.getDate()).padStart(2, '0')}`;
        } else {
            iterDate.setDate(iterDate.getDate() - 7);
            iterWeekString = `${iterDate.getFullYear()}-${String(iterDate.getMonth() + 1).padStart(2, '0')}-${String(iterDate.getDate()).padStart(2, '0')}`;
            if ((weekCounts[iterWeekString] || 0) < target) {
                habit.currentStreak = 0;
                return;
            }
        }

        while (true) {
            if ((weekCounts[iterWeekString] || 0) >= target) {
                effectiveStreak++;
                iterDate.setDate(iterDate.getDate() - 7);
                iterWeekString = `${iterDate.getFullYear()}-${String(iterDate.getMonth() + 1).padStart(2, '0')}-${String(iterDate.getDate()).padStart(2, '0')}`;
            } else {
                break;
            }
        }

        habit.currentStreak = effectiveStreak;
        if (effectiveStreak > habit.maxStreak) {
            habit.maxStreak = effectiveStreak;
        }
    }

    function recalculateStreaks(habit) {
        if (habit.frequency === 'weekly') {
            recalculateWeeklyStreaks(habit);
            return;
        }

        let effectiveStreak = 0;
        const sortedDates = [...habit.completedDates].sort().reverse();

        if (sortedDates.length === 0) {
            habit.currentStreak = 0;
            return;
        }

        let targetDate = new Date();
        let targetString = getLocalDateString();

        if (sortedDates.includes(targetString)) {
            effectiveStreak++;
            targetDate.setDate(targetDate.getDate() - 1);
        } else {
            targetDate.setDate(targetDate.getDate() - 1);
            let ytdString = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;
            if (!sortedDates.includes(ytdString)) {
                habit.currentStreak = 0;
                return;
            }
        }

        while (true) {
            let iterString = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;
            if (sortedDates.includes(iterString)) {
                effectiveStreak++;
                targetDate.setDate(targetDate.getDate() - 1);
            } else {
                break;
            }
        }

        habit.currentStreak = effectiveStreak;
        if (effectiveStreak > habit.maxStreak) {
            habit.maxStreak = effectiveStreak;
        }
    }

    window.deleteHabit = deleteHabit;
    function deleteHabit(id) {
        habits = habits.filter(h => h.id !== id);
        saveHabits();
        renderHabits();
        showToast('Habit deleted');
    }

    function showToast(message) {
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    function renderHabits() {
        habitsGrid.innerHTML = '';
        const today = getLocalDateString();

        const activeHabits = habits.length;
        habitCountDisplay.textContent = `${activeHabits} Active`;

        if (activeHabits === 0) {
            emptyState.classList.add('visible');
            habitsGrid.style.display = 'none';
            return;
        } else {
            emptyState.classList.remove('visible');
            habitsGrid.style.display = 'flex';
        }

        habits.forEach((habit, index) => {
            const isCompletedToday = habit.completedDates.includes(today);
            recalculateStreaks(habit);

            const isWeekly = habit.frequency === 'weekly';
            const streakText = isWeekly ? `${habit.currentStreak} wk${habit.currentStreak !== 1 ? 's' : ''}` : `${habit.currentStreak} day${habit.currentStreak !== 1 ? 's' : ''}`;
            const targetText = isWeekly ? `🎯 ${habit.currentWeekProgress || 0}/${habit.target} this wk` : `Total: ${habit.completedDates.length}`;

            const card = document.createElement('div');
            card.className = `habit-card ${isCompletedToday ? 'completed' : ''}`;
            card.style.animationDelay = `${index * 0.05}s`;

            card.innerHTML = `
                <div class="habit-info" style="cursor: pointer;">
                    <button class="check-btn" aria-label="Toggle habit completion" data-id="${habit.id}">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    </button>
                    <div class="habit-details">
                        <h3>${escapeHtml(habit.name)} <span style="font-size: 0.75rem; font-weight: 300; background: var(--card-border); padding: 2px 6px; border-radius: 6px; margin-left: 6px;">${isWeekly ? 'Weekly' : 'Daily'}</span></h3>
                        <div class="habit-meta">
                            <span class="streak" title="Current Streak">🔥 ${streakText}</span>
                            <span>•</span>
                            <span>${targetText}</span>
                        </div>
                    </div>
                </div>
                <div class="habit-actions">
                    <button class="action-btn edit-btn" data-id="${habit.id}" title="Edit Habit">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                    <button class="action-btn delete" data-id="${habit.id}" title="Delete Habit">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            `;

            const checkBtn = card.querySelector('.check-btn');
            checkBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleHabit(habit.id);
            });

            const habitInfoArea = card.querySelector('.habit-info');
            habitInfoArea.addEventListener('click', (e) => {
                if (!e.target.closest('.check-btn')) {
                    toggleHabit(habit.id);
                }
            });

            const editBtn = card.querySelector('.edit-btn');
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openEditModal(habit.id);
            });

            const deleteBtn = card.querySelector('.delete');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteHabit(habit.id);
            });

            habitsGrid.appendChild(card);
        });
    }

    function escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    init();

    setInterval(() => {
        updateDateDisplay();
    }, 60000);
});
