// Initialize app state
const appState = {
    groupName: localStorage.getItem('groupName') || '',
    yourName: localStorage.getItem('yourName') || '',
    members: JSON.parse(localStorage.getItem('members') || '[]'),
    availability: JSON.parse(localStorage.getItem('availability') || '{}'),
    lastUpdatedTimestamps: JSON.parse(localStorage.getItem('lastUpdatedTimestamps') || '{}'),
    timezone: localStorage.getItem('timezone') || '0',
    groupId: localStorage.getItem('groupId') || '',
    isFirebaseInitialized: false,
    groups: JSON.parse(localStorage.getItem('groups') || '[]'),
    currentGroupIndex: parseInt(localStorage.getItem('currentGroupIndex') || '0'),
    isGroupLeader: localStorage.getItem('isGroupLeader') === 'true' || false,
    weekStartsWednesday: true // Account for MapleStory's Wednesday reset
};

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAJJzf6FSPSbMTfEyYCZ6sLPt2onn4jtCY",
    authDomain: "maple-bossing-schedule.firebaseapp.com",
    databaseURL: "https://maple-bossing-schedule-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "maple-bossing-schedule",
    storageBucket: "maple-bossing-schedule.firebasestorage.app",
    messagingSenderId: "546242541642",
    appId: "1:546242541642:web:12a19f763c6d66e5f40eb3"
};

// DOMContentLoaded handler with initialization flow
document.addEventListener('DOMContentLoaded', function() {
    // Setup tab navigation
    setupTabNavigation();

    // Load My Groups and update selector
    updateGroupSelector();

    // Load saved data
    loadGroupInfo();
    initializeAvailabilityGrid();
    loadAvailability();
    updateTimezoneSelector();
    loadMembers();
    calculateResults();
    showLeaderControls();

    // Setup event listeners
    setupEventListeners();

    // Initialize Firebase connection status indicator
    setupFirebaseStatusIndicator();

    // Initialize Firebase if group ID exists
    if (appState.groupId) {
        initializeFirebase()
            .then(() => {
                updateGroupIdDisplay();

                // Show sync status on results tab if active
                if (document.querySelector('.tab[data-tab="results"]').classList.contains('active')) {
                    document.getElementById('sync-status-display').style.display = 'block';
                }

                // Update connection status indicator
                updateFirebaseConnectionStatus(true);

                // Set up connection status monitoring
                setupConnectionMonitoring();
            })
            .catch(() => {
                // Show offline indicator
                updateFirebaseConnectionStatus(false);
            });
    }

    // Check for shared data in URL
    checkForSharedData();
});

// Setup tab navigation
function setupTabNavigation() {
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const tabContents = document.querySelectorAll('.tab-content');
            tabContents.forEach(content => content.classList.remove('active'));
            document.getElementById(tab.dataset.tab).classList.add('active');

            // Update sync status display when switching to results tab
            if (tab.dataset.tab === 'results') {
                if (appState.isFirebaseInitialized && appState.groupId) {
                    document.getElementById('sync-status-display').style.display = 'block';
                } else {
                    document.getElementById('sync-status-display').style.display = 'none';
                }
            }
        });
    });
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('save-group').addEventListener('click', saveGroupInfo);
    document.getElementById('save-availability').addEventListener('click', saveAvailability);
    document.getElementById('reset-availability').addEventListener('click', resetAvailability);
    document.getElementById('copy-link').addEventListener('click', copyShareableLink);
    document.getElementById('export-image').addEventListener('click', exportAsImage);
    document.getElementById('timezone-select').addEventListener('change', saveTimezone);
    document.getElementById('join-group').addEventListener('click', joinGroup);
    document.getElementById('switch-group').addEventListener('click', switchGroup);
    document.getElementById('leave-group').addEventListener('click', leaveGroup);
    document.getElementById('reset-all-availability').addEventListener('click', resetAllAvailability);
    document.getElementById('new-group').addEventListener('click', createNewGroup);

    // Add the toggle selection mode button event listener
    document.getElementById('toggle-selection-mode').addEventListener('click', toggleSelectionMode);

    // Add enter key event for join group input
    document.getElementById('group-id-input').addEventListener('keyup', function(event) {
        if (event.key === 'Enter') {
            document.getElementById('join-group').click();
        }
    });

    // Add tooltip click-away handler
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.grid-cell')) {
            document.querySelectorAll('.tooltip.visible').forEach(t => {
                t.classList.remove('visible');
            });
        }
    });
}

// Setup Firebase status indicator
function setupFirebaseStatusIndicator() {
    const syncStatusIndicator = document.createElement('div');
    syncStatusIndicator.id = 'firebase-status';
    syncStatusIndicator.style.position = 'fixed';
    syncStatusIndicator.style.bottom = '10px';
    syncStatusIndicator.style.right = '10px';
    syncStatusIndicator.style.padding = '5px 10px';
    syncStatusIndicator.style.backgroundColor = '#f1f1f1';
    syncStatusIndicator.style.border = '1px solid #ddd';
    syncStatusIndicator.style.borderRadius = '4px';
    syncStatusIndicator.style.fontSize = '12px';
    syncStatusIndicator.style.display = 'none';
    document.body.appendChild(syncStatusIndicator);
}

// Update Firebase connection status
function updateFirebaseConnectionStatus(isConnected) {
    const syncStatusIndicator = document.getElementById('firebase-status');

    if (syncStatusIndicator) {
        syncStatusIndicator.style.display = 'block';

        if (isConnected) {
            syncStatusIndicator.style.backgroundColor = '#4caf50';
            syncStatusIndicator.style.color = 'white';
            syncStatusIndicator.textContent = 'Real-time sync: Connected';
        } else {
            syncStatusIndicator.style.backgroundColor = '#f44336';
            syncStatusIndicator.style.color = 'white';
            syncStatusIndicator.textContent = isConnected === false ? 'Real-time sync: Failed' : 'Real-time sync: Disconnected';
        }
    }
}

// Setup connection monitoring
function setupConnectionMonitoring() {
    const connectedRef = firebase.database().ref('.info/connected');
    connectedRef.on('value', (snap) => {
        updateFirebaseConnectionStatus(snap.val() === true);
    });
}

// Generate a group ID from the group name
function generateGroupId(groupName) {
    // Create a simple hash from the group name + random string
    const randomStr = Math.random().toString(36).substring(2, 8);
    const baseStr = groupName.toLowerCase().replace(/[^a-z0-9]/g, '') + randomStr;
    let hash = 0;
    for (let i = 0; i < baseStr.length; i++) {
        const char = baseStr.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16).substring(0, 8);
}