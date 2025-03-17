// Create a new group
function createNewGroup() {
    // Clear current group data
    appState.groupId = '';
    appState.groupName = '';
    appState.members = [];
    appState.availability = {};
    appState.isGroupLeader = true;

    // Update localStorage
    localStorage.setItem('groupId', '');
    localStorage.setItem('groupName', '');
    localStorage.setItem('members', JSON.stringify([]));
    localStorage.setItem('availability', JSON.stringify({}));
    localStorage.setItem('isGroupLeader', 'true');

    // Update UI
    document.getElementById('group-name').value = '';
    document.getElementById('group-sync-status').style.display = 'none';

    // Refresh members and availability display
    loadMembers();
    loadAvailability();
    calculateResults();

    // Focus on group name field
    document.getElementById('group-name').focus();

    // Display message to user
    alert('Ready to create a new group! Enter a group name and your character name, then click "Save Group Info".');
}// Load group info
function loadGroupInfo() {
    document.getElementById('group-name').value = appState.groupName;
    document.getElementById('your-name').value = appState.yourName;
}

// Enhanced save group info with better Firebase integration and multi-group support
function saveGroupInfo() {
    const groupName = document.getElementById('group-name').value.trim();
    const yourName = document.getElementById('your-name').value.trim();

    if (!groupName || !yourName) {
        alert('Please enter both group name and your name.');
        return;
    }

    appState.groupName = groupName;
    appState.yourName = yourName;

    localStorage.setItem('groupName', groupName);
    localStorage.setItem('yourName', yourName);

    // Generate a group ID if it doesn't exist
    if (!appState.groupId) {
        appState.groupId = generateGroupId(groupName);
        localStorage.setItem('groupId', appState.groupId);

        // Set as group leader for new groups
        appState.isGroupLeader = true;
        localStorage.setItem('isGroupLeader', 'true');

        // Initialize Firebase and set up group in database
        initializeFirebase().then(() => {
            // Add yourself as a member if not already present
            if (!appState.members.includes(yourName)) {
                appState.members.push(yourName);
                localStorage.setItem('members', JSON.stringify(appState.members));
            }

            // Create initial group in Firebase with leader info
            saveGroupToFirebase().then(() => {
                // Add to my groups list
                addToMyGroups({
                    id: appState.groupId,
                    name: groupName,
                    isLeader: true,
                    lastAccessed: new Date().toISOString()
                });

                alert('Group created successfully! Your Group ID is: ' + appState.groupId);
                updateGroupIdDisplay();
                loadMembers();
                updateGroupSelector();
                showLeaderControls();
            });
        });
    } else {
        // Add yourself as a member if not already present
        if (!appState.members.includes(yourName)) {
            appState.members.push(yourName);
            localStorage.setItem('members', JSON.stringify(appState.members));
            loadMembers();
        }

        // Update existing group in Firebase
        if (appState.isFirebaseInitialized) {
            saveGroupToFirebase().then(() => {
                // Update group in my groups list
                updateGroupInMyGroups({
                    id: appState.groupId,
                    name: groupName
                });

                alert('Group information updated successfully!');
                updateGroupIdDisplay();
                updateGroupSelector();
            });
        } else {
            initializeFirebase().then(() => {
                saveGroupToFirebase().then(() => {
                    // Update group in my groups list
                    updateGroupInMyGroups({
                        id: appState.groupId,
                        name: groupName
                    });

                    alert('Group information updated and synchronized successfully!');
                    updateGroupIdDisplay();
                    updateGroupSelector();
                });
            });
        }
    }
}

// Add a group to My Groups list
function addToMyGroups(groupInfo) {
    // Check if group already exists
    const existingIndex = appState.groups.findIndex(g => g.id === groupInfo.id);

    if (existingIndex >= 0) {
        // Update existing entry
        appState.groups[existingIndex] = {
            ...appState.groups[existingIndex],
            ...groupInfo,
            lastAccessed: new Date().toISOString()
        };
    } else {
        // Add new entry
        appState.groups.push({
            id: groupInfo.id,
            name: groupInfo.name,
            isLeader: groupInfo.isLeader || false,
            lastAccessed: new Date().toISOString()
        });

        // Set as current group
        appState.currentGroupIndex = appState.groups.length - 1;
        localStorage.setItem('currentGroupIndex', appState.currentGroupIndex.toString());
    }

    // Save to localStorage
    localStorage.setItem('groups', JSON.stringify(appState.groups));
}

// Update a group in My Groups list
function updateGroupInMyGroups(groupInfo) {
    const existingIndex = appState.groups.findIndex(g => g.id === groupInfo.id);

    if (existingIndex >= 0) {
        // Update existing entry
        appState.groups[existingIndex] = {
            ...appState.groups[existingIndex],
            ...groupInfo,
            lastAccessed: new Date().toISOString()
        };

        // Save to localStorage
        localStorage.setItem('groups', JSON.stringify(appState.groups));
    } else {
        // Add if not found
        addToMyGroups(groupInfo);
    }
}

// Remove a group from My Groups list
function removeFromMyGroups(groupId) {
    const existingIndex = appState.groups.findIndex(g => g.id === groupId);

    if (existingIndex >= 0) {
        // Remove from array
        appState.groups.splice(existingIndex, 1);

        // Update current group index if necessary
        if (appState.groups.length === 0) {
            appState.currentGroupIndex = 0;
        } else if (appState.currentGroupIndex >= appState.groups.length) {
            appState.currentGroupIndex = appState.groups.length - 1;
        }

        // Save to localStorage
        localStorage.setItem('groups', JSON.stringify(appState.groups));
        localStorage.setItem('currentGroupIndex', appState.currentGroupIndex.toString());
    }
}

// Update group selector dropdown
function updateGroupSelector() {
    const selector = document.getElementById('group-selector');
    if (!selector) return;

    // Clear existing options except the placeholder
    while (selector.options.length > 1) {
        selector.remove(1);
    }

    // Add groups to selector
    appState.groups.forEach((group, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = `${group.name} ${group.isLeader ? '(Leader)' : ''}`;
        selector.appendChild(option);
    });

    // Set current selection
    if (appState.groups.length > 0) {
        selector.value = appState.currentGroupIndex;
    } else {
        selector.value = -1;
    }
}

// Switch to selected group
function switchGroup() {
    const selector = document.getElementById('group-selector');
    const selectedIndex = parseInt(selector.value);

    if (selectedIndex === -1 || selectedIndex >= appState.groups.length) {
        alert('Please select a valid group.');
        return;
    }

    // Confirm switch if current group has unsaved changes
    // (This is a simple implementation - you may want to add more checks)
    const confirmSwitch = confirm('Switch to the selected group? Any unsaved changes will be lost.');
    if (!confirmSwitch) return;

    // Update current group index
    appState.currentGroupIndex = selectedIndex;
    localStorage.setItem('currentGroupIndex', selectedIndex.toString());

    // Load the selected group
    const selectedGroup = appState.groups[selectedIndex];
    appState.groupId = selectedGroup.id;
    appState.groupName = selectedGroup.name;
    appState.isGroupLeader = selectedGroup.isLeader;

    // Update localStorage
    localStorage.setItem('groupId', selectedGroup.id);
    localStorage.setItem('groupName', selectedGroup.name);
    localStorage.setItem('isGroupLeader', selectedGroup.isLeader.toString());

    // Update last accessed timestamp
    selectedGroup.lastAccessed = new Date().toISOString();
    localStorage.setItem('groups', JSON.stringify(appState.groups));

    // Re-initialize with the new group data
    loadGroupInfo();

    // Initialize Firebase connection for the group
    initializeFirebase()
        .then(() => {
            return firebase.database().ref(`groups/${appState.groupId}`).once('value');
        })
        .then((snapshot) => {
            const data = snapshot.val();
            if (!data) {
                throw new Error('Group not found. It may have been deleted.');
            }

            // Update app state with Firebase data
            appState.members = data.members || [];
            appState.availability = data.availability || {};

            // Update localStorage
            localStorage.setItem('members', JSON.stringify(appState.members));
            localStorage.setItem('availability', JSON.stringify(appState.availability));

            // Update UI
            updateGroupIdDisplay();
            loadMembers();
            loadAvailability();
            calculateResults();
            showLeaderControls();

            // Set up real-time sync
            setupRealtimeSync();

            alert(`Switched to group "${selectedGroup.name}" successfully!`);
        })
        .catch((error) => {
            console.error("Error switching groups:", error);
            alert('Error loading group: ' + error.message);
        });
}

// Leave current group
function leaveGroup() {
    if (!appState.groupId) {
        alert('You are not currently in a group.');
        return;
    }

    const confirmLeave = confirm('Are you sure you want to leave this group? Your availability will be removed from the group.');
    if (!confirmLeave) return;

    // Remove yourself from members list
    if (appState.isFirebaseInitialized) {
        // Get reference to the group
        const groupRef = firebase.database().ref(`groups/${appState.groupId}`);

        // Get current group data
        groupRef.once('value')
            .then((snapshot) => {
                const data = snapshot.val();
                if (!data) throw new Error('Group not found.');

                // Remove yourself from members
                const updatedMembers = data.members.filter(m => m !== appState.yourName);

                // Remove your availability
                const updatedAvailability = {...data.availability};
                delete updatedAvailability[appState.yourName];

                // Update Firebase
                return groupRef.update({
                    members: updatedMembers,
                    availability: updatedAvailability,
                    lastUpdated: firebase.database.ServerValue.TIMESTAMP
                });
            })
            .then(() => {
                // Remove from my groups
                removeFromMyGroups(appState.groupId);

                // Clear current group data
                appState.groupId = '';
                appState.members = [];
                appState.isGroupLeader = false;

                // Update localStorage
                localStorage.setItem('groupId', '');
                localStorage.setItem('members', JSON.stringify([]));
                localStorage.setItem('isGroupLeader', 'false');

                // Update UI
                document.getElementById('group-name').value = '';
                updateGroupSelector();
                loadMembers();

                // Hide leader controls
                document.getElementById('leader-controls').style.display = 'none';

                alert('You have left the group successfully.');

                // Switch to a different group if available
                if (appState.groups.length > 0) {
                    document.getElementById('group-selector').value = appState.currentGroupIndex;
                    switchGroup();
                }
            })
            .catch((error) => {
                console.error("Error leaving group:", error);
                alert('Error leaving group: ' + error.message);
            });
    } else {
        // No Firebase connection - just remove locally
        removeFromMyGroups(appState.groupId);

        // Clear current group data
        appState.groupId = '';
        appState.members = [];
        appState.isGroupLeader = false;

        // Update localStorage
        localStorage.setItem('groupId', '');
        localStorage.setItem('members', JSON.stringify([]));
        localStorage.setItem('isGroupLeader', 'false');

        // Update UI
        document.getElementById('group-name').value = '';
        updateGroupSelector();
        loadMembers();

        alert('You have left the group.');
    }
}

// Show/hide leader controls based on leader status
function showLeaderControls() {
    const leaderControls = document.getElementById('leader-controls');
    if (leaderControls) {
        leaderControls.style.display = appState.isGroupLeader ? 'block' : 'none';
    }
}

// Reset all members' availability (leader only)
function resetAllAvailability() {
    if (!appState.isGroupLeader) {
        alert('Only the group leader can reset all availability.');
        return;
    }

    const confirmReset = confirm('Are you sure you want to reset ALL members\' availability? This cannot be undone and is typically done at the weekly reset.');
    if (!confirmReset) return;

    if (appState.isFirebaseInitialized && appState.groupId) {
        // Get reference to the group
        const groupRef = firebase.database().ref(`groups/${appState.groupId}`);

        // Reset all availability data
        const emptyAvailability = {};
        appState.members.forEach(member => {
            emptyAvailability[member] = [];
        });

        // Update Firebase
        groupRef.update({
            availability: emptyAvailability,
            lastUpdated: firebase.database.ServerValue.TIMESTAMP,
            lastReset: firebase.database.ServerValue.TIMESTAMP
        })
            .then(() => {
                // Update local state
                appState.availability = emptyAvailability;
                localStorage.setItem('availability', JSON.stringify(appState.availability));

                // Update UI
                loadAvailability();
                calculateResults();

                // Clear selection in the grid
                document.querySelectorAll('#availability-grid .grid-cell.selected').forEach(cell => {
                    cell.classList.remove('selected');
                });

                alert('All availability has been reset successfully for the new boss cycle.');
            })
            .catch((error) => {
                console.error("Error resetting availability:", error);
                alert('Error resetting availability: ' + error.message);
            });
    } else {
        alert('Cannot reset availability: No connection to the server.');
    }
}

// Load members
function loadMembers() {
    const memberList = document.getElementById('member-list');
    memberList.innerHTML = '';

    appState.members.forEach(member => {
        const memberElement = document.createElement('div');
        memberElement.className = 'member';

        const nameSpan = document.createElement('span');
        nameSpan.textContent = member;

        const removeButton = document.createElement('button');
        removeButton.className = 'btn-danger';
        removeButton.textContent = 'Remove';
        removeButton.addEventListener('click', () => removeMember(member));

        memberElement.appendChild(nameSpan);
        memberElement.appendChild(removeButton);
        memberList.appendChild(memberElement);
    });
}

// Enhanced function to add a member with Firebase integration
function addMember() {
    const memberInput = document.getElementById('new-member');
    const memberName = memberInput.value.trim();

    if (!memberName) {
        alert('Please enter a member name.');
        return;
    }

    if (appState.members.includes(memberName)) {
        alert('This member is already in your group.');
        return;
    }

    // Add locally
    appState.members.push(memberName);
    localStorage.setItem('members', JSON.stringify(appState.members));

    // Update UI
    loadMembers();
    calculateResults();
    memberInput.value = '';

    // Update Firebase if connected
    if (appState.isFirebaseInitialized && appState.groupId) {
        updateMembersInFirebase()
            .then(() => {
                console.log(`Member "${memberName}" added and synchronized.`);
            })
            .catch((error) => {
                console.error("Error syncing new member:", error);
            });
    }
}

// Enhanced function to remove a member with Firebase integration
function removeMember(memberName) {
    if (memberName === appState.yourName) {
        if (!confirm('Are you sure you want to remove yourself from the group?')) {
            return;
        }
    } else if (!confirm(`Are you sure you want to remove ${memberName} from the group?`)) {
        return;
    }

    // Remove from local state
    appState.members = appState.members.filter(member => member !== memberName);
    localStorage.setItem('members', JSON.stringify(appState.members));

    // Remove availability data for this member
    if (appState.availability[memberName]) {
        delete appState.availability[memberName];
        localStorage.setItem('availability', JSON.stringify(appState.availability));
    }

    // Update UI
    loadMembers();
    calculateResults();

    // Update Firebase if connected
    if (appState.isFirebaseInitialized && appState.groupId) {
        // Update both members and availability in Firebase
        Promise.all([
            updateMembersInFirebase(),
            updateAvailabilityInFirebase()
        ])
            .then(() => {
                console.log(`Member "${memberName}" removed and synchronized.`);
            })
            .catch((error) => {
                console.error("Error syncing member removal:", error);
            });
    }
}

// Update timezone selector
function updateTimezoneSelector() {
    document.getElementById('timezone-select').value = appState.timezone;
}

// Save timezone
function saveTimezone() {
    const timezone = document.getElementById('timezone-select').value;
    appState.timezone = timezone;
    localStorage.setItem('timezone', timezone);
}

// Enhanced update group ID display with better UI feedback
function updateGroupIdDisplay() {
    const groupIdDisplay = document.getElementById('group-id-display');
    const groupSyncStatus = document.getElementById('group-sync-status');

    if (groupIdDisplay && appState.groupId) {
        groupIdDisplay.textContent = appState.groupId;
        groupSyncStatus.style.display = 'block';

        // Make the group ID copyable with a click
        groupIdDisplay.style.cursor = 'pointer';
        groupIdDisplay.title = 'Click to copy Group ID';

        // Remove existing event listener if any
        groupIdDisplay.removeEventListener('click', copyGroupId);

        // Add new event listener
        groupIdDisplay.addEventListener('click', copyGroupId);
    }
}

// Helper function to copy group ID to clipboard
function copyGroupId(e) {
    e.preventDefault();
    const groupId = appState.groupId;

    navigator.clipboard.writeText(groupId)
        .then(() => {
            // Visual feedback
            const el = e.target;
            const originalText = el.textContent;
            const originalStyle = el.style.color;

            el.textContent = 'Copied!';
            el.style.color = '#4caf50';

            setTimeout(() => {
                el.textContent = originalText;
                el.style.color = originalStyle;
            }, 1500);
        })
        .catch(err => {
            console.error('Could not copy group ID: ', err);
            alert('Group ID: ' + groupId);
        });
}

// Enhanced join group function with better error handling
function joinGroup() {
    const groupIdInput = document.getElementById('group-id-input');
    const groupId = groupIdInput.value.trim();

    if (!groupId) {
        alert('Please enter a valid Group ID.');
        return;
    }

    // Show loading state
    const joinButton = document.getElementById('join-group');
    const originalText = joinButton.textContent;
    joinButton.textContent = 'Joining...';
    joinButton.disabled = true;

    // Initialize Firebase first
    initializeFirebase()
        .then(() => {
            // Check if the group exists
            const groupRef = firebase.database().ref(`groups/${groupId}`);
            return groupRef.once('value');
        })
        .then((snapshot) => {
            const data = snapshot.val();
            if (!data) {
                throw new Error('Group not found. Please check the Group ID and try again.');
            }

            // Ask user to confirm joining the group
            if (confirm(`Do you want to join the "${data.name}" group?`)) {
                // Set the group ID and sync data
                appState.groupId = groupId;
                localStorage.setItem('groupId', groupId);

                // Update group name
                appState.groupName = data.name;
                localStorage.setItem('groupName', data.name);
                document.getElementById('group-name').value = data.name;

                // Update members and availability
                appState.members = data.members || [];

                // Check if joining as leader
                const isLeader = (data.leader === appState.yourName) ||
                    (!data.leader && data.members.length === 0);
                appState.isGroupLeader = isLeader;
                localStorage.setItem('isGroupLeader', isLeader.toString());

                // Add yourself as member if you've set your name and aren't already in the list
                const yourName = document.getElementById('your-name').value.trim();
                if (yourName && !appState.members.includes(yourName)) {
                    appState.members.push(yourName);
                    appState.yourName = yourName;
                    localStorage.setItem('yourName', yourName);

                    // Update members in Firebase
                    updateMembersInFirebase();
                }

                localStorage.setItem('members', JSON.stringify(appState.members));

                appState.availability = data.availability || {};
                localStorage.setItem('availability', JSON.stringify(appState.availability));

                // Add to my groups
                addToMyGroups({
                    id: groupId,
                    name: data.name,
                    isLeader: isLeader,
                    lastAccessed: new Date().toISOString()
                });

                // Reload UI
                loadMembers();
                loadAvailability();
                calculateResults();
                updateGroupIdDisplay();
                updateGroupSelector();
                showLeaderControls();

                // Set up real-time sync
                setupRealtimeSync();

                alert(`You've successfully joined the "${data.name}" group! Your schedule will now stay synchronized with your group members.`);

                // Switch to availability tab
                document.querySelector('.tab[data-tab="availability"]').click();

                return true;
            }
            return false;
        })
        .catch((error) => {
            console.error("Error joining group:", error);
            alert(error.message || 'Error joining group. Please try again.');
        })
        .finally(() => {
            // Restore button state
            joinButton.textContent = originalText;
            joinButton.disabled = false;
        });
}

// Enhanced check for shared data
function checkForSharedData() {
    const urlParams = new URLSearchParams(window.location.search);

    // Check for Firebase group ID
    const groupId = urlParams.get('group');
    if (groupId) {
        // Show loading indicator
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'loading-indicator';
        loadingDiv.style.position = 'fixed';
        loadingDiv.style.top = '0';
        loadingDiv.style.left = '0';
        loadingDiv.style.width = '100%';
        loadingDiv.style.padding = '10px';
        loadingDiv.style.backgroundColor = 'var(--primary)';
        loadingDiv.style.color = 'white';
        loadingDiv.style.textAlign = 'center';
        loadingDiv.style.zIndex = '9999';
        loadingDiv.textContent = 'Loading group data...';
        document.body.appendChild(loadingDiv);

        appState.groupId = groupId;
        localStorage.setItem('groupId', groupId);

        // Initialize Firebase and sync group data
        initializeFirebase()
            .then(() => {
                const groupRef = firebase.database().ref(`groups/${groupId}`);
                return groupRef.once('value');
            })
            .then((snapshot) => {
                const data = snapshot.val();
                if (!data) {
                    throw new Error('Group not found. The link might be invalid or the group has been deleted.');
                }

                if (confirm(`Do you want to join the "${data.name}" group?`)) {
                    // Update app state with group data
                    appState.groupName = data.name;
                    localStorage.setItem('groupName', data.name);
                    document.getElementById('group-name').value = data.name;

                    appState.members = data.members || [];
                    localStorage.setItem('members', JSON.stringify(appState.members));

                    appState.availability = data.availability || {};
                    localStorage.setItem('availability', JSON.stringify(appState.availability));

                    // Reload UI
                    loadGroupInfo();
                    loadMembers();
                    loadAvailability();
                    calculateResults();
                    updateGroupIdDisplay();

                    // Set up real-time sync
                    setupRealtimeSync();

                    // Switch to availability tab
                    document.querySelector('.tab[data-tab="availability"]').click();

                    alert(`You've joined the "${data.name}" group! Your schedule will now stay synchronized with your group members.`);
                }
            })
            .catch((error) => {
                console.error("Error loading group data:", error);
                alert(error.message || "Error loading group data");
            })
            .finally(() => {
                // Remove loading indicator
                const loadingIndicator = document.getElementById('loading-indicator');
                if (loadingIndicator) {
                    loadingIndicator.remove();
                }
            });

        return;
    }

    // Legacy support for old sharing format
    const shareData = urlParams.get('share');
    if (shareData) {
        try {
            const decodedData = JSON.parse(atob(shareData));

            if (confirm(`Do you want to load the shared "${decodedData.groupName}" group data? Note: This is using the old sharing system without real-time sync.`)) {
                // Merge with local data or replace completely
                appState.groupName = decodedData.groupName;
                appState.members = decodedData.members;

                // Merge availability data
                const mergedAvailability = {...appState.availability, ...decodedData.availability};
                appState.availability = mergedAvailability;

                // Save to localStorage
                localStorage.setItem('groupName', appState.groupName);
                localStorage.setItem('members', JSON.stringify(appState.members));
                localStorage.setItem('availability', JSON.stringify(appState.availability));

                // Reload UI
                loadGroupInfo();
                loadMembers();
                loadAvailability();
                calculateResults();

                alert('Shared data loaded successfully! Consider setting up real-time synchronization in the Group Setup tab.');
            }
        } catch (error) {
            console.error('Error loading shared data:', error);
            alert('Invalid shared data. Could not load.');
        }
    }
}