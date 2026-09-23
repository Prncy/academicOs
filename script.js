// AcademicOS - Phase 2 Engine
document.addEventListener('DOMContentLoaded', () => {
    initDynamicGreeting();
    initProgramManagement();
});

/**
 * Updates the dashboard greeting dynamically based on the student's current system time.
 */
function initDynamicGreeting() {
    const greetingElement = document.getElementById('welcome-greeting');
    if (!greetingElement) return;

    const currentHour = new Date().getHours();
    let greetingString = 'Good evening';

    if (currentHour < 12) {
        greetingString = 'Good morning';
    } else if (currentHour < 18) {
        greetingString = 'Good afternoon';
    }

    greetingElement.textContent = `${greetingString} 👋`;
}

/**
 * Core Data Management & DOM Event Controller for AcademicOS Programs
 */
function initProgramManagement() {
    // Key Identifier Reference for browser localStorage
    const STORAGE_KEY = 'academicOS_programs';

    // DOM Target Elements Mapping
    const emptyState = document.getElementById('empty-state');
    const programsGrid = document.getElementById('programs-grid');
    const globalCreateBtn = document.getElementById('global-create-btn');
    const searchBar = document.getElementById('search-bar');
    
    // Modal Overlay Form Control Targets
    const programModal = document.getElementById('program-modal');
    const programForm = document.getElementById('program-form');
    const modalTitle = document.getElementById('modal-title');
    const modalSubmitBtn = document.getElementById('modal-submit-btn');
    const modalCancelBtn = document.getElementById('modal-cancel-btn');
    
    // Form Input Target References
    const inputId = document.getElementById('program-id');
    const inputName = document.getElementById('program-name');
    const inputYears = document.getElementById('program-years');

    // ----------------------------------------------------
    // LOCAL STORAGE INFRASTRUCTURE DATA HELPERS
    // ----------------------------------------------------

    function getPrograms() {
        try {
            const dataStr = localStorage.getItem(STORAGE_KEY);
            return dataStr ? JSON.parse(dataStr) : [];
        } catch (e) {
            console.error("Data tracking reference mismatch error reading local storage", e);
            return [];
        }
    }

    function savePrograms(programsArray) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(programsArray));
        } catch (e) {
            console.error("Storage system allocation failure tracking write sequence", e);
        }
    }

    // ----------------------------------------------------
    // UI CORE RENDERING SCHEDULER ENGINE
    // ----------------------------------------------------

    function renderPrograms(filterString = '') {
        const list = getPrograms();
        const normalizedSearch = filterString.trim().toLowerCase();
        
        // Execute real-time user query mapping filters
        const filteredList = list.filter(prog => 
            prog.name.toLowerCase().includes(normalizedSearch)
        );

        // Scenario A: Storage configuration contains no records at all
        if (list.length === 0) {
            emptyState.classList.remove('hidden');
            programsGrid.classList.add('hidden');
            globalCreateBtn.classList.add('hidden');
            return;
        }

        // Scenario B: Records exist, safely swap layout states out
        emptyState.classList.add('hidden');
        programsGrid.classList.remove('hidden');
        globalCreateBtn.classList.remove('hidden');

        // Scenario C: Search query entered yields no structural hits
        if (filteredList.length === 0) {
            programsGrid.innerHTML = `
                <div class="search-empty-msg">
                    <p>No programs found matching "<strong>${escapeHtml(filterString)}</strong>"</p>
                </div>
            `;
            return;
        }

        // Standardize output buffer generation loops safely
        programsGrid.innerHTML = filteredList.map(prog => `
            <div class="program-card" data-id="${prog.id}">
                <div class="program-info">
                    <h4>${escapeHtml(prog.name)}</h4>
                    <span class="program-badge">${parseInt(prog.totalYears, 10)} ${parseInt(prog.totalYears, 10) === 1 ? 'Year' : 'Years'}</span>
                </div>
                
                <div class="program-progress-container">
                    <div class="progress-label-wrapper">
                        <span>Progress</span>
                        <span>0%</span>
                    </div>
                    <div class="progress-bar-track">
                        <div class="progress-bar-fill"></div>
                    </div>
                </div>
                
                <div class="program-card-actions">
                    <button type="button" class="action-link-btn open-action" data-action="open">Open Program</button>
                    <button type="button" class="action-link-btn edit-action" data-action="edit">Edit</button>
                    <button type="button" class="action-link-btn delete-action" data-action="delete">Delete</button>
                </div>
            </div>
        `).join('');
    }

    // Helper variant utility script pattern to prevent markup injection vectors
    function escapeHtml(str) {
        return str.replace(/&/g, "&amp;")
                  .replace(/</g, "&lt;")
                  .replace(/>/g, "&gt;")
                  .replace(/"/g, "&quot;")
                  .replace(/'/g, "&#039;");
    }

    // ----------------------------------------------------
    // MODAL DIALOG CONTROLLER ROUTINES
    // ----------------------------------------------------

    function openModal(editingId = null) {
        programForm.reset();
        
        if (editingId) {
            // Edit Mode Configuration Settings Configuration Setup
            const list = getPrograms();
            const matchingProg = list.find(p => p.id === editingId);
            if (!matchingProg) return;

            modalTitle.textContent = 'Edit Program';
            modalSubmitBtn.textContent = 'Save Changes';
            
            // Populating form hidden variables safely
            inputId.value = matchingProg.id;
            inputName.value = matchingProg.name;
            inputYears.value = matchingProg.totalYears;
        } else {
            // Creation Mode Settings Defaults Template Layout configuration mapping
            modalTitle.textContent = 'Create Program';
            modalSubmitBtn.textContent = 'Create Program';
            inputId.value = '';
        }
        
        programModal.classList.remove('hidden');
        inputName.focus();
    }

    function closeModal() {
        programModal.classList.add('hidden');
        programForm.reset();
    }

    // ----------------------------------------------------
    // CRUD EVENT ENGINE LOGIC ROUTINES
    // ----------------------------------------------------

    // Submission Handler (Covers both Create and Update Actions)
    programForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const nameValue = inputName.value.trim();
        const yearsValue = parseInt(inputYears.value, 10);
        const targetId = inputId.value;

        // Validation Rules Checklist Safeguards
        if (!nameValue) {
            alert('Please specify a valid program name.');
            return;
        }
        if (isNaN(yearsValue) || yearsValue <= 0) {
            alert('Number of years must be a positive whole number.');
            return;
        }

        let programs = getPrograms();

        if (targetId) {
            // ACTION: UPDATE PROGRAM
            programs = programs.map(p => {
                if (p.id === targetId) {
                    return {
                        ...p,
                        name: nameValue,
                        totalYears: yearsValue
                    };
                }
                return p;
            });
        } else {
            // ACTION: CREATE PROGRAM
            const newProgram = {
                id: 'prog_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                name: nameValue,
                totalYears: yearsValue,
                createdAt: new Date().toISOString()
            };
            programs.push(newProgram);
        }

        savePrograms(programs);
        closeModal();
        
        // Reset dynamic tracking structures instantly to clear previous user filters
        searchBar.value = '';
        renderPrograms();
    });

    // ----------------------------------------------------
    // EVENT WIREUP CAPTURE ENGINE SUBSCRIPTIONS
    // ----------------------------------------------------

    // Intercept click triggers configured for open operations across both context configurations
    document.addEventListener('click', (e) => {
        if (e.target && e.target.classList.contains('open-modal-trigger')) {
            openModal();
        }
    });
    
    globalCreateBtn.addEventListener('click', () => openModal());
    modalCancelBtn.addEventListener('click', () => closeModal());

    // Dismiss modal safely if clicking out of boundary structure
    programModal.addEventListener('click', (e) => {
        if (e.target === programModal) closeModal();
    });

    // Delegated Actions inside the Programs Grid System Container
    programsGrid.addEventListener('click', (e) => {
        const actionButton = e.target.closest('[data-action]');
        if (!actionButton) return;

        const targetCard = actionButton.closest('[data-id]');
        if (!targetCard) return;

        const programId = targetCard.getAttribute('data-id');
        const action = actionButton.getAttribute('data-action');

        if (action === 'open') {
            // Phase Boundary Intercept Guard
            alert('Opening program dashboard workspace interface wrapper. (Feature scheduled for release in Phase 3)');
        } 
        else if (action === 'edit') {
            openModal(programId);
        } 
        else if (action === 'delete') {
            const list = getPrograms();
            const matchingProg = list.find(p => p.id === programId);
            const programName = matchingProg ? matchingProg.name : 'this program';

            if (confirm(`Are you sure you want to delete "${programName}"?`)) {
                const updatedList = list.filter(p => p.id !== programId);
                savePrograms(updatedList);
                
                // Keep the current search query filter active if user is deleting from a subset list
                renderPrograms(searchBar.value);
            }
        }
    });

    // Functional Real-Time Filtering Input Listener Integration Strategy
    searchBar.addEventListener('input', (e) => {
        renderPrograms(e.target.value);
    });

    // Kickstart application engine view matching sequence checks during standard runtime sequence loops
    renderPrograms();
}
