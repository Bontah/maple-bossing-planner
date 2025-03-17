// Enhanced function to copy shareable link
function copyShareableLink() {
    if (!appState.groupId) {
        alert("Please save your group information first to generate a shareable link.");
        return;
    }

    if (!appState.isFirebaseInitialized) {
        // Try to initialize Firebase first
        initializeFirebase()
            .then(() => {
                // Now try to copy the link again
                copyShareableLink();
            })
            .catch((error) => {
                // Fallback to the old sharing method
                legacyCopyShareableLink();
            });
        return;
    }

    // Generate a link with the group ID for Firebase
    const shareUrl = `${window.location.href.split('?')[0]}?group=${appState.groupId}`;

    navigator.clipboard.writeText(shareUrl)
        .then(() => {
            alert('Shareable link copied to clipboard! Anyone can use this link to join your group and synchronize schedules in real-time.');
        })
        .catch(err => {
            console.error('Could not copy text: ', err);

            // Fallback for browsers that don't support clipboard API
            const textArea = document.createElement('textarea');
            textArea.value = shareUrl;
            textArea.style.position = 'fixed';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();

            try {
                const successful = document.execCommand('copy');
                if (successful) {
                    alert('Shareable link copied to clipboard! Anyone can use this link to join your group and synchronize schedules in real-time.');
                } else {
                    throw new Error('Copy command was unsuccessful');
                }
            } catch (err) {
                console.error('Fallback copying failed: ', err);
                alert('Failed to copy link. Here is the link to share: ' + shareUrl);
            }

            document.body.removeChild(textArea);
        });
}

// Legacy sharing method as fallback
function legacyCopyShareableLink() {
    const data = {
        groupName: appState.groupName,
        members: appState.members,
        availability: appState.availability
    };

    const shareData = btoa(JSON.stringify(data));
    const shareUrl = `${window.location.href.split('?')[0]}?share=${shareData}`;

    navigator.clipboard.writeText(shareUrl)
        .then(() => {
            alert('Shareable link copied to clipboard! Share this with your group members. Note: Real-time synchronization is not enabled with this link type.');
        })
        .catch(err => {
            console.error('Could not copy text: ', err);

            // Fallback for browsers that don't support clipboard API
            const textArea = document.createElement('textarea');
            textArea.value = shareUrl;
            textArea.style.position = 'fixed';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();

            try {
                const successful = document.execCommand('copy');
                if (successful) {
                    alert('Shareable link copied to clipboard! Share this with your group members. Note: Real-time synchronization is not enabled with this link type.');
                } else {
                    throw new Error('Copy command was unsuccessful');
                }
            } catch (err) {
                console.error('Fallback copying failed: ', err);
                alert('Failed to copy link. Here is the link to share: ' + shareUrl);
            }

            document.body.removeChild(textArea);
        });
}

// Enhanced export as image function
function exportAsImage() {
    // Check if html2canvas is available
    if (typeof html2canvas === 'undefined') {
        // Load html2canvas library dynamically
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        script.onload = function() {
            // Once the library is loaded, proceed with the export
            exportWithHtml2Canvas();
        };
        script.onerror = function() {
            alert('Could not load required library for image export. Please check your internet connection and try again.');
        };
        document.head.appendChild(script);
    } else {
        // Library already loaded, proceed with export
        exportWithHtml2Canvas();
    }
}

// Helper function for html2canvas export
function exportWithHtml2Canvas() {
    const resultGrid = document.getElementById('result-grid');
    const legend = document.querySelector('.legend');

    // Create a container for the export
    const exportContainer = document.createElement('div');
    exportContainer.style.backgroundColor = 'white';
    exportContainer.style.padding = '20px';
    exportContainer.style.width = 'fit-content';

    // Add a title
    const title = document.createElement('h2');
    title.textContent = appState.groupName + ' - Bossing Schedule';
    title.style.textAlign = 'center';
    title.style.margin = '0 0 15px 0';
    exportContainer.appendChild(title);

    // Clone the grid and legend
    const gridClone = resultGrid.cloneNode(true);
    const legendClone = legend.cloneNode(true);

    // Append the clones to the container
    exportContainer.appendChild(gridClone);
    exportContainer.appendChild(legendClone);

    // Hide the tooltips in the clone
    exportContainer.querySelectorAll('.tooltip').forEach(tooltip => {
        tooltip.style.display = 'none';
    });

    // Add a timestamp
    const timestamp = document.createElement('div');
    const now = new Date();
    timestamp.textContent = 'Generated on: ' + now.toLocaleDateString() + ' ' + now.toLocaleTimeString();
    timestamp.style.fontSize = '12px';
    timestamp.style.color = '#666';
    timestamp.style.textAlign = 'center';
    timestamp.style.marginTop = '15px';
    exportContainer.appendChild(timestamp);

    // Position offscreen for capturing
    exportContainer.style.position = 'absolute';
    exportContainer.style.left = '-9999px';
    document.body.appendChild(exportContainer);

    // Use html2canvas to generate an image
    html2canvas(exportContainer, {
        backgroundColor: 'white',
        scale: 2, // Better quality
        logging: false
    }).then(canvas => {
        // Convert to image
        const image = canvas.toDataURL('image/png');

        // Create a link and trigger download
        const link = document.createElement('a');
        link.href = image;
        link.download = appState.groupName + '_schedule.png';
        link.click();

        // Clean up
        document.body.removeChild(exportContainer);
    }).catch(error => {
        console.error('Error generating image:', error);
        alert('Error generating image. Please try again.');
        document.body.removeChild(exportContainer);
    });
}