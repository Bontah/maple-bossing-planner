// Global selection mode state
let selectionMode = 'click'; // 'click' or 'drag'

// Initialize availability grid with MapleStory's Wednesday reset
function initializeAvailabilityGrid() {
    const grid = document.getElementById('availability-grid');
    const resultGrid = document.getElementById('result-grid');

    // Clear existing time slots
    grid.innerHTML = '';
    resultGrid.innerHTML = '';

    // Create days header based on Wednesday reset
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    // Add empty header for time column
    const emptyHeader = document.createElement('div');
    emptyHeader.className = 'grid-header';
    grid.appendChild(emptyHeader);
    resultGrid.appendChild(emptyHeader.cloneNode(true));

    // Add day headers
    dayNames.forEach(day => {
        const header = document.createElement('div');
        header.className = 'grid-header';
        header.textContent = day;
        grid.appendChild(header);
        resultGrid.appendChild(header.cloneNode(true));
    });

    // Add mouse drag selection support
    let isSelecting = false;
    let selectionState = null;

    function startSelection(e) {
        if (selectionMode === 'drag' && e.target.classList.contains('grid-cell')) {
            isSelecting = true;
            selectionState = !e.target.classList.contains('selected');
            toggleCellSelection(e.target, selectionState);
        }
    }

    function continueSelection(e) {
        if (selectionMode === 'drag' && isSelecting && e.target.classList.contains('grid-cell')) {
            toggleCellSelection(e.target, selectionState);
        }
    }

    function endSelection() {
        isSelecting = false;
    }

    // Add event listeners for drag selection
    grid.addEventListener('mousedown', startSelection);
    grid.addEventListener('mouseover', continueSelection);
    document.addEventListener('mouseup', endSelection);

    // Add time slots in 30-minute increments
    for (let hour = 0; hour < 24; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
            const formattedHour = hour.toString().padStart(2, '0');
            const formattedMinute = minute.toString().padStart(2, '0');
            const timeLabel = `${formattedHour}:${formattedMinute}`;
            const timeValue = hour + (minute / 60); // e.g. 1:30 = 1.5

            // Availability grid
            const timeCell = document.createElement('div');
            timeCell.className = 'grid-time';
            timeCell.textContent = timeLabel;
            timeCell.dataset.time = timeValue;
            grid.appendChild(timeCell);

            for (let day = 0; day < 7; day++) {
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                cell.dataset.time = `${day}-${timeValue}`;
                cell.dataset.day = day;
                cell.dataset.hour = timeValue;
                cell.addEventListener('click', toggleTimeSlot);
                grid.appendChild(cell);
            }

            // Result grid
            const resultTimeCell = document.createElement('div');
            resultTimeCell.className = 'grid-time';
            resultTimeCell.textContent = timeLabel;
            resultGrid.appendChild(resultTimeCell);

            for (let day = 0; day < 7; day++) {
                const resultCell = document.createElement('div');
                resultCell.className = 'grid-cell heat-0';
                resultCell.dataset.time = `${day}-${timeValue}`;
                resultCell.dataset.day = day;
                resultCell.dataset.hour = timeValue;
                resultGrid.appendChild(resultCell);
            }
        }
    }
}

// Toggle time slot selection
function toggleTimeSlot(e) {
    // If we're in click mode, or if it's a direct click in drag mode
    if (selectionMode === 'click' || (selectionMode === 'drag' && !isSelecting)) {
        const cell = e.target;
        toggleCellSelection(cell);
    }
}

// Helper function to toggle cell selection
function toggleCellSelection(cell, forceState = null) {
    if (forceState !== null) {
        if (forceState) {
            cell.classList.add('selected');
        } else {
            cell.classList.remove('selected');
        }
    } else {
        cell.classList.toggle('selected');
    }
}

// Add a function to toggle the selection mode
function toggleSelectionMode() {
    selectionMode = selectionMode === 'click' ? 'drag' : 'click';

    // Update button text
    const toggleButton = document.getElementById('toggle-selection-mode');
    if (toggleButton) {
        toggleButton.textContent = selectionMode === 'click' ? 'Mode: Click' : 'Mode: Drag';
        toggleButton.setAttribute('title', selectionMode === 'click' ?
            'Click to switch to drag selection mode' :
            'Click to switch to single click mode');
    }

    // Update cursor style
    const grid = document.getElementById('availability-grid');
    if (grid) {
        if (selectionMode === 'drag') {
            grid.classList.add('drag-selection-mode');
        } else {
            grid.classList.remove('drag-selection-mode');
        }
    }
}

// Updated save availability to track last updated timestamp
function saveAvailability() {
    if (!appState.yourName) {
        alert('Please set your name in the Group Setup tab first.');
        return;
    }

    const selectedCells = document.querySelectorAll('#availability-grid .grid-cell.selected');
    const availabilityData = Array.from(selectedCells).map(cell => cell.dataset.time);

    // Update local storage
    appState.availability[appState.yourName] = availabilityData;
    localStorage.setItem('availability', JSON.stringify(appState.availability));

    // Update timestamps
    const currentTime = Date.now();
    if (!appState.lastUpdatedTimestamps) {
        appState.lastUpdatedTimestamps = {};
    }
    appState.lastUpdatedTimestamps[appState.yourName] = currentTime;
    localStorage.setItem('lastUpdatedTimestamps', JSON.stringify(appState.lastUpdatedTimestamps));

    // Update Firebase if connected
    if (appState.isFirebaseInitialized && appState.groupId) {
        updateAvailabilityInFirebase()
            .then(() => {
                alert('Your availability has been saved and synchronized with your group!');
            })
            .catch(() => {
                alert('Your availability has been saved locally, but could not be synchronized with your group.');
            });
    } else {
        alert('Your availability has been saved locally.');
    }

    calculateResults();
    updateLastUpdatedInfo(); // Update the UI with timestamp info
}

// Load availability
function loadAvailability() {
    if (!appState.yourName || !appState.availability[appState.yourName]) {
        return;
    }

    const yourAvailability = appState.availability[appState.yourName];
    const cells = document.querySelectorAll('#availability-grid .grid-cell');

    cells.forEach(cell => {
        if (yourAvailability.includes(cell.dataset.time)) {
            cell.classList.add('selected');
        } else {
            cell.classList.remove('selected');
        }
    });
}

// Fixed reset availability to update Firebase after resetting locally
function resetAvailability() {
    if (!appState.yourName) {
        alert('Please set your name in the Group Setup tab first.');
        return;
    }

    if (confirm('Are you sure you want to reset your availability? This action cannot be undone.')) {
        // Clear all selected cells
        document.querySelectorAll('#availability-grid .grid-cell.selected').forEach(cell => {
            cell.classList.remove('selected');
        });

        // Clear from appState
        if (appState.availability[appState.yourName]) {
            appState.availability[appState.yourName] = [];
            localStorage.setItem('availability', JSON.stringify(appState.availability));

            // Update timestamps when resetting
            const currentTime = Date.now();
            if (!appState.lastUpdatedTimestamps) {
                appState.lastUpdatedTimestamps = {};
            }
            appState.lastUpdatedTimestamps[appState.yourName] = currentTime;
            localStorage.setItem('lastUpdatedTimestamps', JSON.stringify(appState.lastUpdatedTimestamps));

            // Update Firebase if connected
            if (appState.isFirebaseInitialized && appState.groupId) {
                updateAvailabilityInFirebase()
                    .then(() => {
                        alert('Your availability has been reset and synchronized with your group.');
                    })
                    .catch(() => {
                        alert('Your availability has been reset locally, but could not be synchronized with your group.');
                    });
            } else {
                alert('Your availability has been reset.');
            }
        }

        calculateResults();
        updateLastUpdatedInfo(); // Update the UI with timestamp info
    }
}

// Enhanced function to calculate results with better tooltips and last updated info
function calculateResults() {
    const resultCells = document.querySelectorAll('#result-grid .grid-cell');
    const totalMembers = appState.members.length;

    if (totalMembers === 0) {
        return;
    }

    resultCells.forEach(cell => {
        const timeSlot = cell.dataset.time;
        let count = 0;

        // Get list of available members for this timeslot
        const availableMembers = [];
        appState.members.forEach(memberName => {
            if (appState.availability[memberName] && appState.availability[memberName].includes(timeSlot)) {
                availableMembers.push(memberName);
                count++;
            }
        });

        // Clear the cell content first
        cell.innerHTML = '';

        // Add appropriate heat class with emphasis on full availability
        cell.className = 'grid-cell';
        if (count === 0) {
            cell.classList.add('heat-0');
        } else if (count === totalMembers) {
            cell.classList.add('heat-max');
            // Add pulsing effect for all-member slots
            cell.classList.add('pulse-effect');
        } else if (count >= 5) {
            cell.classList.add('heat-5');
        } else {
            cell.classList.add(`heat-${count}`);
        }

        // Add count text and tooltip for cells with members
        if (count > 0) {
            // Create a span for the count
            const countSpan = document.createElement('span');
            countSpan.textContent = count;
            cell.appendChild(countSpan);

            // Extract the day and time for the tooltip
            const [day, timeValue] = timeSlot.split('-');
            const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
            const dayName = dayNames[parseInt(day)];

            // Convert time value to hours and minutes
            const hours = Math.floor(parseFloat(timeValue));
            const minutes = Math.round((parseFloat(timeValue) - hours) * 60);
            const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

            // Create tooltip div with enhanced information
            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip';

            // Add time information to tooltip
            tooltip.innerHTML = `<strong>${dayName} at ${timeString}</strong><br>`;
            tooltip.innerHTML += `<strong>${count}/${totalMembers} members available:</strong><br>`;

            // Add members with their last updated time
            availableMembers.forEach(member => {
                let memberHTML = member === appState.yourName ?
                    `<span style="font-weight: bold;">${member} (you)</span>` :
                    member;

                // Add last updated info if available
                if (appState.lastUpdatedTimestamps && appState.lastUpdatedTimestamps[member]) {
                    const lastUpdated = new Date(appState.lastUpdatedTimestamps[member]);
                    const formattedDate = lastUpdated.toLocaleDateString();
                    memberHTML += ` <span style="font-size: 0.8em; color: #666;">(updated: ${formattedDate})</span>`;
                }

                tooltip.innerHTML += memberHTML + '<br>';
            });

            // Add unavailable members if not everyone is available
            if (count < totalMembers) {
                const unavailableMembers = appState.members.filter(member => !availableMembers.includes(member));
                if (unavailableMembers.length > 0) {
                    tooltip.innerHTML += '<br><br><strong>Not available:</strong><br>';
                    unavailableMembers.forEach(member => {
                        let memberHTML = member === appState.yourName ?
                            `<span style="color: #999;">${member} (you)</span>` :
                            `<span style="color: #999;">${member}</span>`;

                        // Add last updated info if available
                        if (appState.lastUpdatedTimestamps && appState.lastUpdatedTimestamps[member]) {
                            const lastUpdated = new Date(appState.lastUpdatedTimestamps[member]);
                            const formattedDate = lastUpdated.toLocaleDateString();
                            memberHTML += ` <span style="font-size: 0.8em; color: #999;">(updated: ${formattedDate})</span>`;
                        }

                        tooltip.innerHTML += memberHTML + '<br>';
                    });
                }
            }

            cell.appendChild(tooltip);

            // Add click handler for mobile (toggle tooltip visibility)
            cell.addEventListener('click', function(e) {
                const tooltipEl = this.querySelector('.tooltip');
                if (tooltipEl) {
                    // Hide all other tooltips first
                    document.querySelectorAll('.tooltip.visible').forEach(t => {
                        if (t !== tooltipEl) t.classList.remove('visible');
                    });

                    tooltipEl.classList.toggle('visible');
                    e.stopPropagation(); // Prevent body click from immediately closing it
                }
            });
        }
    });

    // Update legend for all members
    const allMembersLegend = document.querySelector('.legend-item:last-child span');
    allMembersLegend.textContent = `All Members (${totalMembers})`;
}