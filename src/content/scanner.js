import Exporter from './exporter.js';

console.log("Mail Thread Export: content script loaded");

// Icons
const DOWNLOAD_ICON = '<svg focusable="false" viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"></path></svg>';
const PDF_ICON = '<svg viewBox="0 0 24 24"><path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm4-3H19v1h1.5V11H19v2h-1.5V7h3v1.5zM9 9.5h1v-1H9v1zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm10 5.5h1v-3h-1v3z"/></svg>';
const IMG_ICON = '<svg viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>';

const observer = new MutationObserver((mutations) => {
    checkForEmailHeader();
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});

document.addEventListener('click', (e) => {
    if (!e.target.closest('.gmail-export-trigger') && !e.target.closest('.gmail-export-menu')) {
        closeAllMenus();
    }
});

function checkForEmailHeader() {
    const mainRole = document.querySelector('div[role="main"]');
    if (!mainRole) return;
    const subject = mainRole.querySelector('h2.hP');
    if (subject && !subject.parentNode.querySelector('.gmail-export-trigger')) {
        injectMenu(subject.parentNode);
    }
}

function injectMenu(container) {
    if (container.querySelector('.gmail-export-trigger')) return;

    const wrapper = document.createElement('div');
    wrapper.style.display = 'inline-block';
    wrapper.style.position = 'relative';
    wrapper.style.marginLeft = '12px';

    // Trigger Button
    const trigger = document.createElement('button');
    trigger.className = 'gmail-export-trigger';
    trigger.title = 'Export Options';
    // Use a clearer "Export" icon
    const EXPORT_ICON = '<svg focusable="false" viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"></path></svg>';

    trigger.innerHTML = `${EXPORT_ICON} Export`;
    trigger.onclick = (e) => toggleMenu(e, menu);

    // Dropdown Menu
    const menu = document.createElement('div');
    menu.className = 'gmail-export-menu';

    // Menu Items
    const pdfItem = createMenuItem(
        'Export as PDF',
        PDF_ICON,
        () => handleExport('pdf')
    );

    const pngItem = createMenuItem('Export as Image', IMG_ICON, () => handleExport('png'));

    menu.appendChild(pdfItem);
    menu.appendChild(pngItem);

    wrapper.appendChild(trigger);
    wrapper.appendChild(menu);

    container.appendChild(wrapper);
}

function createMenuItem(text, iconHtml, onClick) {
    const item = document.createElement('div');
    item.className = 'gmail-export-item';
    item.innerHTML = `${iconHtml} <span>${text}</span>`;
    item.onclick = async (e) => {
        // Show loading state
        const originalHtml = item.innerHTML;
        const spinner = '<div class="gmail-export-spinner"></div>';

        item.innerHTML = `${spinner} <span>Processing...</span>`;
        item.style.pointerEvents = 'none';

        setTimeout(async () => {
            // Run export logic
            await onClick();
            // Reset
            item.innerHTML = originalHtml;
            item.style.pointerEvents = 'auto';
            closeAllMenus();
        }, 50);
    };
    return item;
}

function toggleMenu(e, menu) {
    e.stopPropagation();
    const isOpen = menu.classList.contains('open');
    closeAllMenus(); // Close others
    if (!isOpen) {
        menu.classList.add('open');
        e.currentTarget.classList.add('active');
    }
}

function closeAllMenus() {
    document.querySelectorAll('.gmail-export-menu').forEach(m => m.classList.remove('open'));
    document.querySelectorAll('.gmail-export-trigger').forEach(t => t.classList.remove('active'));
}

async function handleExport(format) {
    const emailData = detectEmail();
    if (!emailData) {
        alert('Could not detect email content.');
        return;
    }

    try {
        await Exporter.exportEmail(emailData.element, format, emailData.subject);
    } catch (err) {
        console.error(err);
        alert('Export Failed: ' + err.message);
    }
}

function detectEmail() {
    const subjectNode = document.querySelector('h2.hP');
    if (!subjectNode) return null;
    const subject = subjectNode.textContent;
    const mainContainer = document.querySelector('div[role="main"]');
    return {
        subject: subject,
        element: mainContainer
    };
}
