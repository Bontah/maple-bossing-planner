// Enhanced Firebase initialization with better error handling
function initializeFirebase() {
    if (appState.isFirebaseInitialized) return Promise.resolve();

    try {
        firebase.initializeApp(firebaseConfig);
        appState.isFirebaseInitialized = true;

        console.log("Firebase app initialized");

        // Set up anonymous authentication
        return firebase.auth().signInAnonymously()
            .then(() => {
                console.log("Firebase authenticated successfully");
                return setupRealtimeSync();
            })
            .catch(error => {
                console.error("Firebase authentication error:", error);
                alert(`Error connecting to the synchronization service: ${error.message}. Using local storage only.`);
                return Promise.reject(error);
            });
    } catch (error) {
        console.error("Firebase initialization error:", error);
        alert(`Error initializing the synchronization service: ${error.message}. Using local storage only.`);
        return Promise.reject(error);
    }
}

// Improved real-time sync with better data handling
function setupRealtimeSync() {
    if (!appState.groupId) return Promise.resolve();

    const groupRef = firebase.database().ref(`groups/${appState.groupId}`);

    // Listen for changes to the group data
    groupRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (!data) {
            console.log("No data found for group:", appState.groupId);
            return;
        }

        console.log("Received Firebase update:", data);

        // Update local app state with Firebase data
        if (data.name && data.name !== appState.groupName) {
            appState.groupName = data.name;
            localStorage.setItem('groupName', appState.groupName);
            document.getElementById('group-name').value = appState.groupName;
        }

        // Update members if changed
        if (data.members && JSON.stringify(data.members) !== JSON.stringify(appState.members)) {
            appState.members = data.members;
            localStorage.setItem('members', JSON.stringify(appState.members));
        }

        // Update availability if changed
        if (data.availability && JSON.stringify(data.availability) !== JSON.stringify(appState.availability)) {
            appState.availability = data.availability;
            localStorage.setItem('availability', JSON.stringify(appState.availability));
        }

        // Update UI
        loadMembers();
        loadAvailability();
        calculateResults();

        // Show sync status if on results tab
        if (document.querySelector('.tab[data-tab="results"]').classList.contains('active')) {
            document.getElementById('sync-status-display').style.display = 'block';
        }
    }, (error) => {
        // This is the error callback for the 'value' event
        console.error("Firebase sync error:", error);
        alert(`Error syncing with the group: ${error.message}. Some changes may not be synchronized.`);
    });

    return Promise.resolve();
}

// Save group data to Firebase with error handling and proper timestamps
function saveGroupToFirebase() {
    if (!appState.isFirebaseInitialized || !appState.groupId) {
        console.warn("Firebase not initialized or no group ID");
        return Promise.reject(new Error("Firebase not initialized or no group ID"));
    }

    const groupRef = firebase.database().ref(`groups/${appState.groupId}`);
    console.log("Saving group data to Firebase:", appState.groupId);

    return groupRef.set({
        name: appState.groupName,
        members: appState.members,
        availability: appState.availability,
        leader: appState.yourName, // Store leader info
        isLeaderActive: appState.isGroupLeader,
        lastUpdated: firebase.database.ServerValue.TIMESTAMP
    }).then(() => {
        console.log("Group data saved successfully to Firebase");
        return Promise.resolve();
    }).catch(error => {
        console.error("Error saving to Firebase:", error);
        alert(`Error saving group data: ${error.message}. Your changes are saved locally but may not be synchronized.`);
        return Promise.reject(error);
    });
}

// Update members in Firebase with proper error handling
function updateMembersInFirebase() {
    if (!appState.isFirebaseInitialized || !appState.groupId) {
        console.warn("Firebase not initialized or no group ID");
        return Promise.reject(new Error("Firebase not initialized or no group ID"));
    }

    const groupRef = firebase.database().ref(`groups/${appState.groupId}`);
    console.log("Updating members in Firebase");

    // Update both members and the lastUpdated timestamp
    return groupRef.update({
        members: appState.members,
        lastUpdated: firebase.database.ServerValue.TIMESTAMP
    }).then(() => {
        console.log("Members updated successfully in Firebase");
        return Promise.resolve();
    }).catch(error => {
        console.error("Error updating members in Firebase:", error);
        alert(`Error updating members: ${error.message}. Your changes are saved locally but may not be synchronized.`);
        return Promise.reject(error);
    });
}

// Update availability in Firebase with proper error handling
function updateAvailabilityInFirebase() {
    if (!appState.isFirebaseInitialized || !appState.groupId) {
        console.warn("Firebase not initialized or no group ID");
        return Promise.reject(new Error("Firebase not initialized or no group ID"));
    }

    const groupRef = firebase.database().ref(`groups/${appState.groupId}`);
    console.log("Updating availability in Firebase");

    // Update both availability and the lastUpdated timestamp
    return groupRef.update({
        availability: appState.availability,
        lastUpdated: firebase.database.ServerValue.TIMESTAMP
    }).then(() => {
        console.log("Availability updated successfully in Firebase");
        return Promise.resolve();
    }).catch(error => {
        console.error("Error updating availability in Firebase:", error);
        alert(`Error updating availability: ${error.message}. Your changes are saved locally but may not be synchronized.`);
        return Promise.reject(error);
    });
}