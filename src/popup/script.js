document.addEventListener('DOMContentLoaded', async () => {
    const statusBadge = document.getElementById('status-badge');
    const messageArea = document.getElementById('message-area');
    const cards = document.querySelectorAll('.card');

    // Disable cards initially
    toggleCards(false);

    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (!tab.url.includes('mail.google.com')) {
            updateStatus('error', 'Not Gmail');
            messageArea.textContent = 'Please open Gmail';
            return;
        }

        // Send ping to content script
        try {
            const response = await chrome.tabs.sendMessage(tab.id, { action: 'PING' });

            if (response && response.status === 'READY') {
                updateStatus('active', 'Ready');
                messageArea.textContent = response.subject ? `Subject: ${response.subject}` : 'Email detected';
                toggleCards(true);
            } else {
                updateStatus('default', 'No Email');
                messageArea.textContent = 'Open a specific email to export';
            }
        } catch (err) {
            // Content script might not be loaded yet or connection error
            updateStatus('error', 'Reload Page');
            messageArea.textContent = 'Please refresh Gmail tab';
            console.error(err);
        }

    } catch (error) {
        console.error('Error in popup:', error);
    }

    // Event Listeners
    document.getElementById('export-pdf').addEventListener('click', () => triggerExport('pdf'));
    document.getElementById('export-png').addEventListener('click', () => triggerExport('png'));
    document.getElementById('export-jpg').addEventListener('click', () => triggerExport('jpg'));
});

function updateStatus(type, text) {
    const badge = document.getElementById('status-badge');
    badge.className = 'status-badge'; // Reset
    badge.classList.add(type);
    badge.textContent = text;
}

function toggleCards(enabled) {
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        if (enabled) {
            card.classList.remove('disabled');
        } else {
            card.classList.add('disabled');
        }
    });
}

async function triggerExport(format) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const messageArea = document.getElementById('message-area');

    messageArea.textContent = `Exporting ${format.toUpperCase()}...`;
    messageArea.classList.add('loading');

    try {
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'EXPORT', format: format });

        if (response && response.success) {
            messageArea.textContent = 'Export Successful!';
        } else {
            messageArea.textContent = 'Export Failed.';
        }
    } catch (err) {
        messageArea.textContent = 'Error during export';
        console.error(err);
    } finally {
        messageArea.classList.remove('loading');
        setTimeout(() => {
            // Reset message after 3 seconds
            // We might want to keep "Successful" visible
        }, 3000);
    }
}
