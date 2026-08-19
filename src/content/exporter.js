import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

const Exporter = {
    exportEmail: async function (element, format, filenameBase) {
        const clone = element.cloneNode(true);

        // Apply aggressive cleanup
        this.cleanArtifacts(clone);
        // Force Japanese fonts
        this.forceJapaneseFont(clone);

        // Setup Render Wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'gmail-export-wrapper';
        wrapper.style.cssText = `
            position: fixed;
            left: 0;
            top: 0;
            width: 800px;
            background-color: #ffffff;
            z-index: -9999;
            font-family: "Hiragino Kaku Gothic Pro", "Meiryo", "Yu Gothic", "MS Gothic", "Noto Sans JP", sans-serif !important;
        `;

        const paddedContent = document.createElement('div');
        paddedContent.style.cssText = `
            padding: 40px;
            background-color: white;
            font-family: "Hiragino Kaku Gothic Pro", "Meiryo", "Yu Gothic", "MS Gothic", "Noto Sans JP", sans-serif !important;
            color: #202124;
            line-height: 1.6;
            font-size: 14px;
        `;

        // Simple Header
        const header = document.createElement('div');
        header.style.cssText = `margin-bottom: 25px; border-bottom: 1px solid #ddd; padding-bottom: 15px;`;

        const h1 = document.createElement('div');
        h1.innerText = filenameBase.substring(0, 100);
        h1.style.cssText = `font-size: 20px; font-weight: bold; margin-bottom: 5px; font-family: inherit !important;`;

        const date = document.createElement('div');
        date.innerText = new Date().toLocaleString();
        date.style.cssText = `color: #5f6368; font-size: 11px;`;

        header.appendChild(h1);
        header.appendChild(date);

        paddedContent.appendChild(header);
        paddedContent.appendChild(clone);
        wrapper.appendChild(paddedContent);
        document.body.appendChild(wrapper);

        try {
            await new Promise(r => setTimeout(r, 500));
            const fullHeight = paddedContent.scrollHeight + 50;

            if (format === 'pdf') {
                await this.generateImagePDF(wrapper, filenameBase, fullHeight);
            } else {
                await this.generateImage(wrapper, filenameBase, 'png', fullHeight);
            }
        } catch (err) {
            console.error(err);
            alert("Export Error: " + err.message);
        } finally {
            document.body.removeChild(wrapper);
        }
    },

    forceJapaneseFont: function (clone) {
        const japaneseFontStack = '"Hiragino Kaku Gothic Pro", "Meiryo", "Yu Gothic", "MS Gothic", "Noto Sans JP", sans-serif';
        clone.style.setProperty('font-family', japaneseFontStack, 'important');
        clone.querySelectorAll('*').forEach(el => {
            el.style.setProperty('font-family', japaneseFontStack, 'important');
        });
    },

    cleanArtifacts: function (clone) {
        // === REMOVE COMPLETELY ===
        // Extension UI
        clone.querySelectorAll('.gmail-export-trigger, .gmail-export-menu, .gmail-export-wrapper').forEach(el => el.remove());

        // Gmail toolbar and action buttons
        clone.querySelectorAll('[role="toolbar"]').forEach(el => el.remove());

        // Reply/Forward/Reaction buttons at bottom
        clone.querySelectorAll('[data-tooltip*="Reply"], [data-tooltip*="Forward"], [data-tooltip*="Antworten"], [data-tooltip*="Weiterleiten"]').forEach(el => el.remove());

        // === COMPREHENSIVE SELECTORS TO HIDE ===
        const selectorsToHide = [
            // Action buttons by aria-label (English and German)
            'div[aria-label="Reply"]', 'div[aria-label="Reply to all"]', 'div[aria-label="Forward"]',
            'div[aria-label="Antworten"]', 'div[aria-label="Allen antworten"]', 'div[aria-label="Weiterleiten"]',
            'div[aria-label="More"]', 'div[aria-label="Mehr"]',
            'div[aria-label="In new window"]', 'div[aria-label="In neuem Fenster öffnen"]',
            'div[aria-label="Print all"]', 'div[aria-label="Alle drucken"]', 'div[aria-label="Drucken"]',
            'div[aria-label="Delete"]', 'div[aria-label="Löschen"]',
            'div[aria-label="Archive"]', 'div[aria-label="Archivieren"]',
            'div[aria-label="Mark as unread"]', 'div[aria-label="Als ungelesen markieren"]',
            'div[aria-label="Show details"]', 'div[aria-label="Details anzeigen"]',
            'div[aria-label="Not starred"]', 'div[aria-label="Nicht markiert"]',
            'div[aria-label="Starred"]', 'div[aria-label="Markiert"]',

            // Toolbar and alerts
            'div[role="toolbar"]', 'div[role="alert"]',

            // Gmail class-based selectors
            '.hI', '.fv', '.at', '.au', '.av', '.aqL', '.bi4', '.gK', '.ad', '.j1',
            '.acX', '.aH1', '.aaZ', '.gE', '.T-I', '.pG', '.ajz', '.hB', '.mn',
            '.gH', '.gL', // Labels
            '.ams', // Star
            '.bAo', // Send reply bar
            '.btC', // Action buttons container
            '.aDF', // More menu
            '.ajy', // Toolbar icons
            '.aqg', // Reply buttons container
            '.aKS', '.aKT', // Additional action buttons

            // Generic action containers
            '[data-tooltip]', // All tooltipped elements are likely UI
        ];

        selectorsToHide.forEach(sel => {
            clone.querySelectorAll(sel).forEach(el => {
                el.style.setProperty('display', 'none', 'important');
            });
        });

        // === TEXT-BASED REMOVAL ===
        clone.querySelectorAll('*').forEach(el => {
            // Skip if already hidden
            if (el.style.display === 'none') return;

            // Check for UI text patterns
            if (el.children.length < 5 && el.innerText) {
                const txt = el.innerText.trim().toLowerCase();
                const uiPatterns = [
                    'translate message', 'turn off for:', 'view gmail in:',
                    'click here to reply', 'press to reply',
                    'reply', 'forward', 'antworten', 'weiterleiten',
                    'inbox', 'posteingang', 'sent', 'gesendet',
                    'show original', 'original anzeigen',
                    'print', 'drucken'
                ];

                // Only hide if it's a short text that matches exactly (likely a button)
                if (el.innerText.length < 50 && uiPatterns.some(p => txt.includes(p))) {
                    // Find parent button/container
                    const parent = el.closest('[role="button"]') || el.closest('.T-I') || el.closest('[data-tooltip]');
                    if (parent) {
                        parent.style.setProperty('display', 'none', 'important');
                    }
                }
            }

            // Hide elements with tooltips (likely UI buttons)
            const tooltip = el.getAttribute('data-tooltip') || el.getAttribute('aria-label');
            if (tooltip) {
                const lowerTooltip = tooltip.toLowerCase();
                const uiTooltips = [
                    'star', 'nicht markiert', 'markiert', 'not starred', 'starred',
                    'important', 'wichtig',
                    'reply', 'antworten', 'forward', 'weiterleiten',
                    'print', 'drucken',
                    'new window', 'neues fenster', 'neuem fenster',
                    'expand', 'erweitern', 'collapse',
                    'more', 'mehr', 'options',
                    'delete', 'löschen',
                    'archive', 'archivieren',
                    'label', 'labels'
                ];

                if (uiTooltips.some(t => lowerTooltip.includes(t))) {
                    el.style.setProperty('display', 'none', 'important');
                }
            }

            // Hide SVG icons by path signature
            if (el.tagName === 'svg' || el.tagName === 'path') {
                const parent = el.closest('div[role="button"]') || el.closest('[data-tooltip]') || el.closest('.T-I');
                if (parent && !parent.closest('.a3s')) { // Don't hide if inside email body
                    parent.style.setProperty('display', 'none', 'important');
                }
            }
        });

        // === STYLE FIXES ===
        // Remove gray backgrounds
        clone.querySelectorAll('*').forEach(el => {
            const bg = getComputedStyle(el).backgroundColor;
            if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent' && bg !== 'rgb(255, 255, 255)') {
                // Check if it's a grayish color
                const match = bg.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
                if (match) {
                    const [, r, g, b] = match.map(Number);
                    // If it's a gray (r≈g≈b and > 200) or light gray background
                    if (Math.abs(r - g) < 10 && Math.abs(g - b) < 10 && r > 200) {
                        el.style.setProperty('background-color', '#ffffff', 'important');
                    }
                }
            }
        });

        // Ensure text is visible
        clone.style.setProperty('color', '#202124', 'important');
        clone.style.setProperty('background-color', '#ffffff', 'important');
    },

    generateImagePDF: async function (element, filename, height) {
        const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            windowWidth: 800,
            width: 800,
            height: height,
            windowHeight: height,
            foreignObjectRendering: false
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;

        const pdf = new jsPDF({
            orientation: imgWidth > imgHeight ? 'l' : 'p',
            unit: 'px',
            format: [imgWidth / 2, imgHeight / 2]
        });

        pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth / 2, imgHeight / 2);
        pdf.save(`${filename}.pdf`);
    },

    generateImage: async function (element, filename, format, height) {
        const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            windowWidth: 800,
            width: 800,
            height: height,
            windowHeight: height,
            foreignObjectRendering: false
        });

        const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
        const dataUrl = canvas.toDataURL(mimeType, 1.0);

        const link = document.createElement('a');
        link.download = `${filename}.${format}`;
        link.href = dataUrl;
        link.click();
    }
};

export default Exporter;
