// Global variables
let cropper = null;
let croppedImageData = null;
let currentImageOption = 'upload';
let currentModalImageOption = 'upload';
let messages = [];
let isEditing = false;
let currentPostSha = null;
let currentImageSha = null;
let activityLogs = [];
let drafts = [];
let currentDraftId = null;
let isPreviewVisible = true;

// Initialize the editor
document.addEventListener('DOMContentLoaded', function() {
    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('post-date').value = today;
    
    // Initialize markdown preview
    const input = document.getElementById('md-input');
    const preview = document.getElementById('md-preview');
    
    // Configure marked options
    marked.setOptions({
        highlight: function(code, lang) {
            return code;
        },
        breaks: true,
        gfm: true
    });
    
    input.addEventListener('input', () => {
        preview.innerHTML = marked.parse(input.value || '*Start writing to see preview...*');
        if (currentDraftId) {
            autoSaveCurrentDraft();
        }
    });
    
    // Initialize preview
    preview.innerHTML = marked.parse(input.value || '*Start writing to see preview...*');
    
    // Initialize image cropping
    initializeImageCropping();
    
    // Initialize URL preview
    document.getElementById('post-image-url').addEventListener('input', function(e) {
        const url = e.target.value.trim();
        const preview = document.getElementById('url-preview');
        if (url && isValidUrl(url)) {
            preview.src = url;
            preview.classList.remove('hidden');
        } else {
            preview.classList.add('hidden');
        }
    });
    
    // Initialize event listeners
    initializeEventListeners();
    
    // Load drafts and activity logs
    loadDrafts();
    loadActivityLogs();
    
    // Show welcome message
    showToast('Welcome to the Advanced Editor! Start writing your content.', 'info');
    addToLog('Editor initialized', 'info');
});

// Initialize event listeners
function initializeEventListeners() {
    // Image option tabs
    document.querySelectorAll('.image-tab').forEach(tab => {
        if (!tab.hasAttribute('data-modal-option')) {
            tab.addEventListener('click', function() {
                switchImageTab(this.getAttribute('data-option'));
            });
        }
    });
    
    // Modal image option tabs
    document.querySelectorAll('[data-modal-option]').forEach(tab => {
        tab.addEventListener('click', function() {
            switchModalImageTab(this.getAttribute('data-modal-option'));
        });
    });
    
    // Message sidebar toggle
    document.getElementById('toggle-messages').addEventListener('click', toggleMessageSidebar);
    document.getElementById('close-messages').addEventListener('click', toggleMessageSidebar);
    document.getElementById('clear-all-messages').addEventListener('click', clearAllMessages);
    
    // Draft management
    document.getElementById('save-draft').addEventListener('click', showSaveDraftModal);
    document.getElementById('load-draft').addEventListener('click', showLoadDraftModal);
    document.getElementById('clear-current-draft').addEventListener('click', clearCurrentDraft);
    document.getElementById('change-draft').addEventListener('click', showLoadDraftModal);
    
    // Draft modals
    document.getElementById('close-save-draft-modal').addEventListener('click', closeSaveDraftModal);
    document.getElementById('cancel-save-draft').addEventListener('click', closeSaveDraftModal);
    document.getElementById('confirm-save-draft').addEventListener('click', saveDraftWithName);
    
    document.getElementById('close-load-draft-modal').addEventListener('click', closeLoadDraftModal);
    document.getElementById('cancel-load-draft').addEventListener('click', closeLoadDraftModal);
    document.getElementById('delete-all-drafts').addEventListener('click', deleteAllDrafts);
    
    // Draft search
    document.getElementById('drafts-search').addEventListener('input', searchDrafts);
    
    // Preview toggle
    document.getElementById('toggle-preview').addEventListener('click', togglePreview);
    
    // Form actions
    document.getElementById('save-btn').addEventListener('click', savePost);
    document.getElementById('clear-btn').addEventListener('click', clearForm);
    document.getElementById('export-btn').addEventListener('click', exportMarkdown);
    document.getElementById('view-logs').addEventListener('click', showLogsModal);
    
    // Image modal
    document.getElementById('close-modal').addEventListener('click', closeImageModal);
    document.getElementById('cancel-image').addEventListener('click', closeImageModal);
    document.getElementById('insert-image').addEventListener('click', insertImageFromModal);
    
    // Posts modal
    document.getElementById('load-posts').addEventListener('click', showPostsModal);
    document.getElementById('close-posts-modal').addEventListener('click', closePostsModal);
    document.getElementById('cancel-posts').addEventListener('click', closePostsModal);
    
    // Logs modal
    document.getElementById('close-logs-modal').addEventListener('click', closeLogsModal);
    document.getElementById('close-logs').addEventListener('click', closeLogsModal);
    document.getElementById('export-logs').addEventListener('click', exportLogs);
    document.getElementById('clear-logs').addEventListener('click', clearLogs);
    
    // Search posts
    document.getElementById('posts-search').addEventListener('input', searchPosts);
    
    // Inline image upload
    document.getElementById('inline-image-upload').addEventListener('change', handleInlineImageUpload);
    
    // Update filename when title changes
    document.getElementById('post-title').addEventListener('input', updateFilename);
}

// Toast message system
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toast-container');
    const toastId = 'toast-' + Date.now();
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.id = toastId;
    toast.innerHTML = `
        <div class="toast-content">${message}</div>
        <button class="toast-close" onclick="removeToast('${toastId}')">&times;</button>
    `;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        removeToast(toastId);
    }, 5000);
    
    addToMessageHistory(message, type);
}

function removeToast(toastId) {
    const toast = document.getElementById(toastId);
    if (toast) {
        toast.style.animation = 'fadeOut 0.3s ease forwards';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }
}

// Message history system
function addToMessageHistory(message, type = 'info') {
    const messageObj = {
        id: Date.now(),
        message,
        type,
        timestamp: new Date().toLocaleTimeString()
    };
    
    messages.unshift(messageObj);
    
    if (messages.length > 50) {
        messages.pop();
    }
    
    updateMessageList();
    updateMessageBadge();
    addToLog(`Message: ${message}`, type);
}

function updateMessageList() {
    const messageList = document.getElementById('message-list');
    messageList.innerHTML = '';
    
    messages.forEach(msg => {
        const messageEl = document.createElement('div');
        messageEl.className = `message ${msg.type}`;
        messageEl.innerHTML = `
            <div class="message-content">${msg.message}</div>
            <div class="message-time">${msg.timestamp}</div>
            <button class="message-close" onclick="removeMessage(${msg.id})">&times;</button>
        `;
        messageList.appendChild(messageEl);
    });
    
    document.getElementById('message-count').textContent = messages.length;
}

function removeMessage(id) {
    messages = messages.filter(msg => msg.id !== id);
    updateMessageList();
    updateMessageBadge();
}

function clearAllMessages() {
    messages = [];
    updateMessageList();
    updateMessageBadge();
    showToast('All messages cleared', 'info');
}

function updateMessageBadge() {
    const badge = document.getElementById('message-badge');
    if (messages.length > 0) {
        badge.textContent = messages.length;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
}

function toggleMessageSidebar() {
    const sidebar = document.getElementById('message-sidebar');
    sidebar.classList.toggle('active');
}

// Switch between image options for featured image
function switchImageTab(option) {
    currentImageOption = option;
    
    document.querySelectorAll('.image-tab:not([data-modal-option])').forEach(tab => {
        tab.classList.remove('active');
        if (tab.getAttribute('data-option') === option) {
            tab.classList.add('active');
        }
    });
    
    document.getElementById('upload-option').classList.toggle('hidden', option !== 'upload');
    document.getElementById('url-option').classList.toggle('hidden', option !== 'url');
    
    // Clear image data when switching to none
    if (option === 'none') {
        croppedImageData = null;
        document.getElementById('post-image-url').value = '';
        document.getElementById('url-preview').classList.add('hidden');
    }
}

// Switch between image options in modal
function switchModalImageTab(option) {
    currentModalImageOption = option;
    
    document.querySelectorAll('[data-modal-option]').forEach(tab => {
        tab.classList.remove('active');
        if (tab.getAttribute('data-modal-option') === option) {
            tab.classList.add('active');
        }
    });
    
    document.getElementById('modal-upload').classList.toggle('hidden', option !== 'upload');
    document.getElementById('modal-url').classList.toggle('hidden', option !== 'url');
}

// URL validation
function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

// Image cropping functionality
function initializeImageCropping() {
    const imageInput = document.getElementById('post-image');
    const imageCropper = document.getElementById('image-cropper');
    const cropImage = document.getElementById('crop-image');
    const cropBtn = document.getElementById('crop-btn');
    const cancelCrop = document.getElementById('cancel-crop');
    const croppedPreview = document.getElementById('cropped-preview');

    imageInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.match('image.*')) {
            showToast('Please select an image file', 'error');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            showToast('Image size should be less than 10MB', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = function(event) {
            cropImage.src = event.target.result;
            imageCropper.classList.remove('hidden');
            
            if (cropper) {
                cropper.destroy();
            }
            
            cropper = new Cropper(cropImage, {
                aspectRatio: 16 / 9,
                viewMode: 1,
                background: false,
                autoCropArea: 0.8,
                responsive: true,
                restore: false,
                guides: true,
                center: true,
                highlight: false,
                cropBoxMovable: true,
                cropBoxResizable: true,
                toggleDragModeOnDblclick: false,
            });
        };
        reader.readAsDataURL(file);
    });

    cropBtn.addEventListener('click', function() {
        if (!cropper) return;

        const canvas = cropper.getCroppedCanvas({
            width: 1200,
            height: 675,
            imageSmoothingQuality: 'high'
        });

        croppedImageData = canvas.toDataURL('image/jpeg', 0.85);
        
        document.getElementById('cropped-image').src = croppedImageData;
        croppedPreview.classList.remove('hidden');
        
        imageCropper.classList.add('hidden');
        
        showToast('Image cropped successfully!', 'success');
        addToLog('Image cropped for post', 'info');
    });

    cancelCrop.addEventListener('click', function() {
        imageCropper.classList.add('hidden');
        document.getElementById('post-image').value = '';
        if (cropper) {
            cropper.destroy();
            cropper = null;
        }
    });
}

// Text formatting functions
function formatText(type) {
    const input = document.getElementById('md-input');
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const value = input.value;
    const selected = value.substring(start, end);
    
    let before = '';
    let after = '';
    let cursorOffset = 0;
    
    switch(type) {
        case 'bold':
            before = '**';
            after = '**';
            break;
        case 'italic':
            before = '*';
            after = '*';
            break;
        case 'underline':
            before = '<u>';
            after = '</u>';
            break;
        case 'h1':
            before = '# ';
            after = '';
            break;
        case 'h2':
            before = '## ';
            after = '';
            break;
        case 'h3':
            before = '### ';
            after = '';
            break;
        case 'link':
            before = '[';
            after = '](url)';
            cursorOffset = -5;
            break;
        case 'image':
            before = '![';
            after = '](image-url)';
            cursorOffset = -12;
            break;
        case 'code':
            before = '`';
            after = '`';
            break;
        case 'codeBlock':
            before = '```\n';
            after = '\n```';
            break;
        case 'ul':
            before = '- ';
            after = '';
            break;
        case 'ol':
            before = '1. ';
            after = '';
            break;
        case 'quote':
            before = '> ';
            after = '';
            break;
    }
    
    let insertText = before + selected + after;
    
    if (!selected && (type === 'ul' || type === 'ol' || type === 'h1' || type === 'h2' || type === 'h3' || type === 'quote')) {
        insertText = before;
    }
    
    input.value = value.substring(0, start) + insertText + value.substring(end);
    input.focus();
    
    let cursorPos = start + insertText.length;
    if (cursorOffset) {
        cursorPos += cursorOffset;
    }
    input.setSelectionRange(cursorPos, cursorPos);
    
    document.getElementById('md-preview').innerHTML = marked.parse(input.value);
    
    if (currentDraftId) {
        autoSaveCurrentDraft();
    }
}

// Open image insertion modal
function insertImage() {
    document.getElementById('image-modal').classList.remove('hidden');
}

// Close image modal
function closeImageModal() {
    document.getElementById('image-modal').classList.add('hidden');
    document.getElementById('inline-image-url').value = '';
    document.getElementById('image-alt').value = '';
    document.getElementById('inline-image-upload').value = '';
    document.getElementById('selected-image-name').textContent = '';
    delete document.getElementById('inline-image-upload').dataset.imageData;
}

// Handle inline image upload in modal
function handleInlineImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.match('image.*')) {
        showToast('Please select an image file', 'error');
        return;
    }

    if (file.size > 10 * 1024 * 1024) {
        showToast('Image size should be less than 10MB', 'error');
        return;
    }

    // Show selected file name
    document.getElementById('selected-image-name').textContent = `Selected: ${file.name}`;

    const reader = new FileReader();
    reader.onload = function(event) {
        document.getElementById('inline-image-upload').dataset.imageData = event.target.result;
    };
    reader.readAsDataURL(file);
}

// Insert image from modal
function insertImageFromModal() {
    const altText = document.getElementById('image-alt').value.trim() || 'image';
    let imageUrl = '';
    
    if (currentModalImageOption === 'upload') {
        const imageData = document.getElementById('inline-image-upload').dataset.imageData;
        if (!imageData) {
            showToast('Please select an image to upload', 'error');
            return;
        }
        
        // For now, use data URL - in production, upload to hosting service
        imageUrl = imageData;
        showToast('Note: For production use, upload images to a proper hosting service', 'warning');
    } else {
        imageUrl = document.getElementById('inline-image-url').value.trim();
        if (!imageUrl || !isValidUrl(imageUrl)) {
            showToast('Please enter a valid image URL', 'error');
            return;
        }
    }
    
    const input = document.getElementById('md-input');
    const start = input.selectionStart;
    const value = input.value;
    
    const imageMarkdown = `![${altText}](${imageUrl})`;
    
    input.value = value.substring(0, start) + imageMarkdown + value.substring(input.selectionEnd);
    input.focus();
    
    document.getElementById('md-preview').innerHTML = marked.parse(input.value);
    
    closeImageModal();
    
    if (currentDraftId) {
        autoSaveCurrentDraft();
    }
    
    showToast('Image inserted successfully!', 'success');
    addToLog('Image inserted into content', 'info');
}

// Toggle preview panel
function togglePreview() {
    const previewPanel = document.getElementById('preview-panel');
    const toggleText = document.getElementById('toggle-preview-text');
    
    if (isPreviewVisible) {
        previewPanel.classList.add('hidden');
        toggleText.textContent = 'Show Preview';
        isPreviewVisible = false;
        addToLog('Preview panel hidden', 'info');
    } else {
        previewPanel.classList.remove('hidden');
        toggleText.textContent = 'Hide Preview';
        isPreviewVisible = true;
        addToLog('Preview panel shown', 'info');
    }
}

// Update filename based on title
function updateFilename() {
    const title = document.getElementById('post-title').value.trim();
    if (title && !isEditing) {
        const filename = title.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)+/g, '') + '.md';
        document.getElementById('post-filename').value = filename;
    }
}

// Draft management system
function loadDrafts() {
    const draftsData = localStorage.getItem('editor-drafts');
    if (draftsData) {
        drafts = JSON.parse(draftsData);
    } else {
        drafts = [];
    }
}

function saveDrafts() {
    localStorage.setItem('editor-drafts', JSON.stringify(drafts));
}

function showSaveDraftModal() {
    const title = document.getElementById('post-title').value.trim();
    const draftNameInput = document.getElementById('draft-name');
    
    if (title && !draftNameInput.value) {
        draftNameInput.value = title;
    }
    
    document.getElementById('save-draft-modal').classList.remove('hidden');
}

function closeSaveDraftModal() {
    document.getElementById('save-draft-modal').classList.add('hidden');
    document.getElementById('draft-name').value = '';
}

function saveDraftWithName() {
    const draftName = document.getElementById('draft-name').value.trim();
    if (!draftName) {
        showToast('Please enter a name for your draft', 'error');
        return;
    }
    
    const draftData = getCurrentEditorData();
    
    if (currentDraftId) {
        const draftIndex = drafts.findIndex(d => d.id === currentDraftId);
        if (draftIndex !== -1) {
            drafts[draftIndex] = {
                ...drafts[draftIndex],
                name: draftName,
                data: draftData,
                updatedAt: new Date().toISOString()
            };
            showToast(`Draft "${draftName}" updated successfully!`, 'success');
            addToLog(`Draft updated: ${draftName}`, 'info');
        }
    } else {
        const newDraft = {
            id: 'draft-' + Date.now(),
            name: draftName,
            data: draftData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        drafts.unshift(newDraft);
        currentDraftId = newDraft.id;
        showToast(`Draft "${draftName}" saved successfully!`, 'success');
        addToLog(`New draft saved: ${draftName}`, 'info');
    }
    
    saveDrafts();
    updateCurrentDraftInfo();
    closeSaveDraftModal();
}

function autoSaveCurrentDraft() {
    if (!currentDraftId) return;
    
    const draftData = getCurrentEditorData();
    const draftIndex = drafts.findIndex(d => d.id === currentDraftId);
    
    if (draftIndex !== -1) {
        drafts[draftIndex] = {
            ...drafts[draftIndex],
            data: draftData,
            updatedAt: new Date().toISOString()
        };
        saveDrafts();
    }
}

function getCurrentEditorData() {
    return {
        title: document.getElementById('post-title').value,
        date: document.getElementById('post-date').value,
        content: document.getElementById('md-input').value,
        imageOption: currentImageOption,
        imageUrl: document.getElementById('post-image-url').value,
        croppedImageData: croppedImageData,
        filename: document.getElementById('post-filename').value,
        isEditing: isEditing,
        postSha: currentPostSha,
        imageSha: currentImageSha
    };
}

function showLoadDraftModal() {
    document.getElementById('load-draft-modal').classList.remove('hidden');
    displayDraftsList();
}

function closeLoadDraftModal() {
    document.getElementById('load-draft-modal').classList.add('hidden');
    document.getElementById('drafts-search').value = '';
}

function displayDraftsList() {
    const draftsList = document.getElementById('drafts-list');
    const searchTerm = document.getElementById('drafts-search').value.toLowerCase();
    
    const filteredDrafts = drafts.filter(draft => 
        draft.name.toLowerCase().includes(searchTerm) ||
        (draft.data.title && draft.data.title.toLowerCase().includes(searchTerm))
    );
    
    if (filteredDrafts.length === 0) {
        draftsList.innerHTML = `
            <div class="empty-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="2"/>
                    <polyline points="14,2 14,8 20,8" stroke="currentColor" stroke-width="2"/>
                    <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" stroke-width="2"/>
                    <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" stroke-width="2"/>
                    <polyline points="10,9 9,9 8,9" stroke="currentColor" stroke-width="2"/>
                </svg>
                <h4>No drafts found</h4>
                <p>${searchTerm ? 'No drafts match your search' : 'Save your first draft to get started'}</p>
            </div>
        `;
        return;
    }
    
    draftsList.innerHTML = '';
    
    filteredDrafts.forEach(draft => {
        const draftItem = document.createElement('div');
        draftItem.className = `draft-item ${draft.id === currentDraftId ? 'active' : ''}`;
        draftItem.innerHTML = `
            <div class="draft-header">
                <div class="draft-title">${draft.name}</div>
                <div class="draft-actions">
                    <button class="btn-small btn-secondary" onclick="loadDraft('${draft.id}')">Load</button>
                    <button class="btn-small btn-secondary" onclick="deleteDraft('${draft.id}')">Delete</button>
                </div>
            </div>
            <div class="draft-meta">
                <span>Created: ${new Date(draft.createdAt).toLocaleDateString()}</span>
                <span>Updated: ${new Date(draft.updatedAt).toLocaleDateString()}</span>
                <span>Title: ${draft.data.title || 'Untitled'}</span>
            </div>
            <div class="draft-preview">
                ${draft.data.content ? draft.data.content.substring(0, 100) + '...' : 'No content'}
            </div>
        `;
        draftsList.appendChild(draftItem);
    });
}

function searchDrafts() {
    displayDraftsList();
}

function loadDraft(draftId) {
    const draft = drafts.find(d => d.id === draftId);
    if (!draft) {
        showToast('Draft not found', 'error');
        return;
    }
    
    const data = draft.data;
    
    // Populate form
    document.getElementById('post-title').value = data.title || '';
    document.getElementById('post-date').value = data.date || new Date().toISOString().split('T')[0];
    document.getElementById('md-input').value = data.content || '';
    document.getElementById('post-image-url').value = data.imageUrl || '';
    document.getElementById('post-filename').value = data.filename || '';
    
    // Handle image
    if (data.imageOption) {
        switchImageTab(data.imageOption);
        
        if (data.imageOption === 'upload' && data.croppedImageData) {
            croppedImageData = data.croppedImageData;
            document.getElementById('cropped-image').src = croppedImageData;
            document.getElementById('cropped-preview').classList.remove('hidden');
        } else if (data.imageOption === 'url' && data.imageUrl) {
            document.getElementById('post-image-url').value = data.imageUrl;
            document.getElementById('url-preview').src = data.imageUrl;
            document.getElementById('url-preview').classList.remove('hidden');
        }
    }
    
    // Update editing state
    isEditing = data.isEditing || false;
    currentPostSha = data.postSha || null;
    currentImageSha = data.imageSha || null;
    document.getElementById('save-btn-text').textContent = isEditing ? 'Update Writing' : 'Publish Writing';
    document.getElementById('filename-group').classList.toggle('hidden', !isEditing);
    
    // Update preview
    document.getElementById('md-preview').innerHTML = marked.parse(data.content || '*Start writing to see preview...*');
    
    // Set current draft
    currentDraftId = draftId;
    updateCurrentDraftInfo();
    
    closeLoadDraftModal();
    
    showToast(`Loaded draft "${draft.name}"`, 'success');
    addToLog(`Draft loaded: ${draft.name}`, 'info');
}

function deleteDraft(draftId) {
    if (!confirm('Are you sure you want to delete this draft? This action cannot be undone.')) {
        return;
    }
    
    const draft = drafts.find(d => d.id === draftId);
    drafts = drafts.filter(d => d.id !== draftId);
    
    if (currentDraftId === draftId) {
        clearCurrentDraft();
    }
    
    saveDrafts();
    displayDraftsList();
    
    showToast(`Draft "${draft.name}" deleted`, 'success');
    addToLog(`Draft deleted: ${draft.name}`, 'info');
}

function deleteAllDrafts() {
    if (!confirm('Are you sure you want to delete ALL drafts? This action cannot be undone.')) {
        return;
    }
    
    drafts = [];
    saveDrafts();
    clearCurrentDraft();
    displayDraftsList();
    
    showToast('All drafts deleted', 'success');
    addToLog('All drafts deleted', 'info');
}

function clearCurrentDraft() {
    currentDraftId = null;
    updateCurrentDraftInfo();
    showToast('Current draft cleared', 'info');
    addToLog('Current draft cleared', 'info');
}

function updateCurrentDraftInfo() {
    const draftInfo = document.getElementById('current-draft-info');
    const draftName = document.getElementById('current-draft-name');
    const draftIndicator = document.getElementById('current-draft-indicator');
    const draftTitle = document.getElementById('current-draft-title');
    
    if (currentDraftId) {
        const draft = drafts.find(d => d.id === currentDraftId);
        if (draft) {
            draftName.textContent = draft.name;
            draftTitle.textContent = draft.name;
            draftInfo.classList.remove('hidden');
            draftIndicator.classList.remove('hidden');
            return;
        }
    }
    
    draftInfo.classList.add('hidden');
    draftIndicator.classList.add('hidden');
}

// Clear form
function clearForm() {
    if (!confirm('Are you sure you want to clear the form? Any unsaved changes will be lost.')) {
        return;
    }
    
    document.getElementById('post-title').value = '';
    document.getElementById('post-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('post-image').value = '';
    document.getElementById('post-image-url').value = '';
    document.getElementById('md-input').value = '';
    document.getElementById('url-preview').classList.add('hidden');
    document.getElementById('md-preview').innerHTML = marked.parse('*Start writing to see preview...*');
    document.getElementById('post-filename').value = '';
    document.getElementById('filename-group').classList.add('hidden');
    
    // Clear image cropper
    document.getElementById('image-cropper').classList.add('hidden');
    document.getElementById('cropped-preview').classList.add('hidden');
    croppedImageData = null;
    
    if (cropper) {
        cropper.destroy();
        cropper = null;
    }
    
    // Reset image option
    switchImageTab('upload');
    
    // Reset editing state
    isEditing = false;
    currentPostSha = null;
    currentImageSha = null;
    document.getElementById('save-btn-text').textContent = 'Publish Writing';
    
    // Clear current draft
    clearCurrentDraft();
    
    showToast('Form cleared', 'success');
    addToLog('Editor form cleared', 'info');
}

// Export markdown
function exportMarkdown() {
    const title = document.getElementById('post-title').value.trim();
    const date = document.getElementById('post-date').value;
    const content = document.getElementById('md-input').value.trim();
    
    if (!content) {
        showToast('No content to export', 'error');
        return;
    }
    
    const frontmatter = [
        '---',
        `title: "${title || 'Untitled'}"`,
        `date: "${date}"`,
        '---',
        ''
    ].join('\n');
    
    const fullContent = frontmatter + content;
    
    const blob = new Blob([fullContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title || 'untitled'}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('Markdown exported successfully!', 'success');
    addToLog(`Markdown exported: ${title || 'untitled'}`, 'info');
}

// Load and edit existing posts
async function showPostsModal() {
    const token = document.getElementById('github-token').value.trim();
    if (!token) {
        showToast('Please enter your GitHub Personal Access Token first', 'error');
        return;
    }
    
    document.getElementById('posts-modal').classList.remove('hidden');
    await loadPostsList(token);
}

async function loadPostsList(token) {
    const postsList = document.getElementById('posts-list');
    postsList.innerHTML = '<div class="loading-text">Loading posts...</div>';
    
    try {
        const repo = 'ikenith/ikenith.github.io';
        const response = await fetch(
            `https://api.github.com/repos/${repo}/contents/posts`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            }
        );
        
        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status}`);
        }
        
        const files = await response.json();
        const markdownFiles = files.filter(file => file.name.endsWith('.md'));
        
        if (markdownFiles.length === 0) {
            postsList.innerHTML = '<div class="loading-text">No posts found.</div>';
            return;
        }
        
        const posts = [];
        for (const file of markdownFiles) {
            try {
                const postResponse = await fetch(file.download_url);
                const content = await postResponse.text();
                
                const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
                if (frontmatterMatch) {
                    const frontmatter = frontmatterMatch[1];
                    const titleMatch = frontmatter.match(/title:\s*["']?([^"']+)["']?/);
                    const dateMatch = frontmatter.match(/date:\s*["']?([^"']+)["']?/);
                    const imageMatch = frontmatter.match(/image:\s*["']?([^"'\n]+)["']?/);
                    
                    posts.push({
                        name: file.name,
                        title: titleMatch ? titleMatch[1] : file.name,
                        date: dateMatch ? dateMatch[1] : 'Unknown date',
                        image: imageMatch ? imageMatch[1] : null,
                        sha: file.sha,
                        content: content
                    });
                }
            } catch (error) {
                console.error('Error loading post:', file.name, error);
            }
        }
        
        displayPostsList(posts);
        
    } catch (error) {
        console.error('Error loading posts:', error);
        postsList.innerHTML = `<div class="loading-text">Error loading posts: ${error.message}</div>`;
        showToast('Error loading posts: ' + error.message, 'error');
    }
}

function displayPostsList(posts) {
    const postsList = document.getElementById('posts-list');
    const searchTerm = document.getElementById('posts-search').value.toLowerCase();
    
    const filteredPosts = posts.filter(post => 
        post.title.toLowerCase().includes(searchTerm) ||
        post.date.toLowerCase().includes(searchTerm)
    );
    
    if (filteredPosts.length === 0) {
        postsList.innerHTML = '<div class="loading-text">No posts match your search.</div>';
        return;
    }
    
    postsList.innerHTML = '';
    
    filteredPosts.forEach(post => {
        const postItem = document.createElement('div');
        postItem.className = 'post-item';
        postItem.innerHTML = `
            <div class="post-title">${post.title}</div>
            <div class="post-meta">
                <span>${post.date}</span>
                <span>${post.name}</span>
                ${post.image ? '<span class="has-image">📷 Has Image</span>' : ''}
            </div>
        `;
        postItem.addEventListener('click', () => loadPostForEditing(post));
        postsList.appendChild(postItem);
    });
}

function loadPostForEditing(post) {
    // Extract content (remove frontmatter)
    const content = post.content.replace(/^---\n[\s\S]*?\n---\n/, '');
    
    // Populate form
    document.getElementById('post-title').value = post.title;
    document.getElementById('post-date').value = post.date;
    document.getElementById('md-input').value = content;
    document.getElementById('post-filename').value = post.name;
    
    // Reset image SHA - always start with null for new images
    currentImageSha = null;
    
    // Handle image
    if (post.image) {
        // Check if it's a GitHub raw URL (uploaded image)
        if (post.image.includes('raw.githubusercontent.com')) {
            switchImageTab('upload');
            // For uploaded images, we can't get the cropped data back, so we show the URL
            document.getElementById('post-image-url').value = post.image;
            document.getElementById('url-preview').src = post.image;
            document.getElementById('url-preview').classList.remove('hidden');
            
            // Store the image URL for potential updating
            croppedImageData = null;
            
            // Try to get the image SHA for future updates
            getImageShaFromUrl(post.image);
        } else {
            // External URL
            switchImageTab('url');
            document.getElementById('post-image-url').value = post.image;
            document.getElementById('url-preview').src = post.image;
            document.getElementById('url-preview').classList.remove('hidden');
            currentImageSha = null;
        }
    } else {
        switchImageTab('none');
        currentImageSha = null;
    }
    
    // Update preview
    document.getElementById('md-preview').innerHTML = marked.parse(content);
    
    // Set editing state
    isEditing = true;
    currentPostSha = post.sha;
    document.getElementById('save-btn-text').textContent = 'Update Writing';
    document.getElementById('filename-group').classList.remove('hidden');
    
    // Clear current draft when loading a post
    clearCurrentDraft();
    
    closePostsModal();
    
    showToast(`Loaded post "${post.title}" for editing`, 'success');
    addToLog(`Post loaded for editing: ${post.title}`, 'info');
}

// Get image SHA from GitHub URL
async function getImageShaFromUrl(imageUrl) {
    const token = document.getElementById('github-token').value.trim();
    if (!token) return;
    
    try {
        // Extract image path from URL
        // URL format: https://raw.githubusercontent.com/ikenith/ikenith.github.io/main/images/filename.jpg
        const urlParts = imageUrl.split('/');
        const filename = urlParts[urlParts.length - 1];
        const imagePath = `images/${filename}`;
        
        const repo = 'ikenith/ikenith.github.io';
        const response = await fetch(
            `https://api.github.com/repos/${repo}/contents/${imagePath}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            }
        );
        
        if (response.ok) {
            const imageData = await response.json();
            currentImageSha = imageData.sha;
            addToLog(`Retrieved image SHA for: ${filename}`, 'info');
        } else {
            currentImageSha = null;
            addToLog(`Could not retrieve image SHA for: ${filename}`, 'warning');
        }
    } catch (error) {
        console.error('Error getting image SHA:', error);
        currentImageSha = null;
        addToLog(`Error getting image SHA: ${error.message}`, 'error');
    }
}

function searchPosts() {
    const postsList = document.getElementById('posts-list');
    const existingPosts = Array.from(postsList.querySelectorAll('.post-item')).map(item => {
        return {
            title: item.querySelector('.post-title').textContent,
            date: item.querySelector('.post-meta span:first-child').textContent,
            name: item.querySelector('.post-meta span:nth-child(2)').textContent
        };
    });
    
    if (existingPosts.length > 0) {
        displayPostsList(existingPosts);
    }
}

function closePostsModal() {
    document.getElementById('posts-modal').classList.add('hidden');
}

// Activity logs
function loadActivityLogs() {
    const logsData = localStorage.getItem('editor-activity-logs');
    if (logsData) {
        activityLogs = JSON.parse(logsData);
    } else {
        activityLogs = [];
    }
    updateLogsDisplay();
}

function addToLog(message, type = 'info') {
    const logEntry = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        message,
        type
    };
    
    activityLogs.unshift(logEntry);
    
    if (activityLogs.length > 100) {
        activityLogs.pop();
    }
    
    localStorage.setItem('editor-activity-logs', JSON.stringify(activityLogs));
    
    if (!document.getElementById('logs-modal').classList.contains('hidden')) {
        updateLogsDisplay();
    }
}

function updateLogsDisplay() {
    const logsList = document.getElementById('logs-list');
    logsList.innerHTML = '';
    
    if (activityLogs.length === 0) {
        logsList.innerHTML = '<div class="loading-text">No activity logs yet.</div>';
        return;
    }
    
    activityLogs.forEach(log => {
        const logItem = document.createElement('div');
        logItem.className = `log-item log-${log.type}`;
        logItem.innerHTML = `
            <div class="log-time">${new Date(log.timestamp).toLocaleString()}</div>
            <div class="log-message">${log.message}</div>
        `;
        logsList.appendChild(logItem);
    });
}

function showLogsModal() {
    document.getElementById('logs-modal').classList.remove('hidden');
    updateLogsDisplay();
}

function closeLogsModal() {
    document.getElementById('logs-modal').classList.add('hidden');
}

function exportLogs() {
    if (activityLogs.length === 0) {
        showToast('No logs to export', 'warning');
        return;
    }
    
    const logText = activityLogs.map(log => 
        `[${new Date(log.timestamp).toLocaleString()}] ${log.type.toUpperCase()}: ${log.message}`
    ).join('\n');
    
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `editor-logs-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('Logs exported successfully!', 'success');
    addToLog('Activity logs exported', 'info');
}

function clearLogs() {
    if (!confirm('Are you sure you want to clear all activity logs? This action cannot be undone.')) {
        return;
    }
    
    activityLogs = [];
    localStorage.removeItem('editor-activity-logs');
    updateLogsDisplay();
    showToast('Activity logs cleared', 'success');
}

// Save post to GitHub - FIXED: Better SHA handling
async function savePost() {
    const token = document.getElementById('github-token').value.trim();
    const title = document.getElementById('post-title').value.trim();
    const date = document.getElementById('post-date').value;
    const markdown = document.getElementById('md-input').value.trim();

    // Validation
    if (!token) {
        showToast('Please enter your GitHub Personal Access Token', 'error');
        return;
    }

    if (!title) {
        showToast('Please enter a post title', 'error');
        return;
    }

    if (!date) {
        showToast('Please select a publication date', 'error');
        return;
    }

    if (!markdown) {
        showToast('Please write some content for your post', 'error');
        return;
    }

    try {
        showToast(isEditing ? 'Updating post...' : 'Saving post...', 'info');
        
        // Handle image based on selected option
        let imageUrl = '';
        let imageSha = currentImageSha;
        
        // Only use imageSha if it's a valid string
        if (!imageSha || imageSha === 'null' || imageSha === 'undefined') {
            imageSha = null;
        }
        
        if (currentImageOption === 'upload' && croppedImageData) {
            showToast('Uploading image...', 'info');
            console.log('Starting image upload with SHA:', imageSha);
            const imageResult = await uploadImageToGitHub(token, title, croppedImageData, imageSha);
            imageUrl = imageResult.url;
            imageSha = imageResult.sha;
            currentImageSha = imageSha; // Update the current image SHA
        } else if (currentImageOption === 'url') {
            const urlInput = document.getElementById('post-image-url').value.trim();
            if (urlInput && isValidUrl(urlInput)) {
                imageUrl = urlInput;
            }
        } else if (currentImageOption === 'none') {
            // Explicitly no image
            imageUrl = '';
        }

        // Create filename
        const filename = isEditing ? 
            document.getElementById('post-filename').value :
            title.toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)+/g, '') + '.md';

        // Create frontmatter
        const frontmatter = [
            '---',
            `title: "${title.replace(/"/g, '\\"')}"`,
            `date: "${date}"`,
            imageUrl && `image: "${imageUrl}"`,
            '---',
            ''
        ].filter(line => line !== false && line !== null).join('\n');

        const content = frontmatter + markdown;
        const filePath = `posts/${filename}`;
        const repo = 'ikenith/ikenith.github.io';

        // Prepare post request body
        const postRequestBody = {
            message: isEditing ? `Update post: ${title}` : `Add post: ${title}`,
            content: btoa(unescape(encodeURIComponent(content)))
        };

        // Only include SHA if we have a valid one for post updates
        if (currentPostSha && currentPostSha !== 'null' && currentPostSha !== 'undefined') {
            postRequestBody.sha = currentPostSha;
        }

        console.log('Post request body:', JSON.stringify(postRequestBody, null, 2));

        // Create or update file
        const response = await fetch(
            `https://api.github.com/repos/${repo}/contents/${filePath}`,
            {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(postRequestBody)
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `GitHub API error: ${response.status}`);
        }

        const result = await response.json();
        currentPostSha = result.content.sha;

        showToast(`✨ Writing "${title}" ${isEditing ? 'updated' : 'saved'} successfully!`, 'success');
        addToLog(`Post ${isEditing ? 'updated' : 'published'}: ${title}`, 'success');
        
        if (!isEditing) {
            setTimeout(() => {
                clearForm();
            }, 2000);
        }
        
    } catch (error) {
        console.error('Error saving post:', error);
        
        let errorMessage = `Failed to ${isEditing ? 'update' : 'save'} writing: `;
        if (error.message.includes('401') || error.message.includes('Bad credentials')) {
            errorMessage += 'Invalid token. Please check your GitHub Personal Access Token.';
        } else if (error.message.includes('403')) {
            errorMessage += 'Token does not have write permissions or repository access.';
        } else if (error.message.includes('422')) {
            errorMessage += 'File already exists or validation failed.';
        } else {
            errorMessage += error.message;
        }
        
        showToast(errorMessage, 'error');
        addToLog(`Error ${isEditing ? 'updating' : 'saving'} post: ${error.message}`, 'error');
    }
}

// Upload image to GitHub - FIXED: Check if image exists and get SHA if needed
async function uploadImageToGitHub(token, title, imageData, existingSha = null) {
    const repo = 'ikenith/ikenith.github.io';
    
    const response = await fetch(imageData);
    const blob = await response.blob();
    
    const base64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(blob);
    });

    const imageFilename = title.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '') + '.jpg';

    const imagePath = `images/${imageFilename}`;

    // First, check if the image already exists to get its SHA
    let finalSha = existingSha;
    
    // If we don't have a SHA but we're in editing mode, try to get the SHA
    if (!finalSha && isEditing) {
        try {
            const checkResponse = await fetch(
                `https://api.github.com/repos/${repo}/contents/${imagePath}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );
            
            if (checkResponse.ok) {
                const existingImageData = await checkResponse.json();
                finalSha = existingImageData.sha;
                console.log('Found existing image SHA:', finalSha);
            }
        } catch (error) {
            console.log('No existing image found or error checking:', error);
            // If we can't check or image doesn't exist, finalSha remains null
        }
    }

    // Prepare the request body
    const requestBody = {
        message: isEditing ? `Update image for post: ${title}` : `Add image for post: ${title}`,
        content: base64
    };

    // Only include SHA if we have a valid one (not null or undefined)
    if (finalSha && finalSha !== 'null' && finalSha !== 'undefined') {
        requestBody.sha = finalSha;
        console.log('Using SHA for image:', finalSha);
    } else {
        console.log('No SHA available, creating new image file');
    }

    console.log('Image upload request body:', JSON.stringify({...requestBody, content: '[BASE64_DATA]'}, null, 2));

    const imageResponse = await fetch(
        `https://api.github.com/repos/${repo}/contents/${imagePath}`,
        {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        }
    );

    if (!imageResponse.ok) {
        const errorData = await imageResponse.json();
        console.error('Image upload error details:', errorData);
        
        // If we get a SHA error and we're trying to update, try creating as new instead
        if (errorData.message && errorData.message.includes('sha') && finalSha) {
            console.log('SHA error detected, retrying as new file creation...');
            
            // Retry without SHA to create a new file
            const retryBody = {
                message: `Add new image for post: ${title}`,
                content: base64
            };
            
            console.log('Retry request body:', JSON.stringify({...retryBody, content: '[BASE64_DATA]'}, null, 2));
            
            const retryResponse = await fetch(
                `https://api.github.com/repos/${repo}/contents/${imagePath}`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(retryBody)
                }
            );
            
            if (!retryResponse.ok) {
                const retryErrorData = await retryResponse.json();
                console.error('Retry failed:', retryErrorData);
                throw new Error(`Image upload failed: ${retryErrorData.message}`);
            }
            
            const retryResult = await retryResponse.json();
            return {
                url: `https://raw.githubusercontent.com/${repo}/main/${imagePath}`,
                sha: retryResult.content.sha
            };
        }
        
        throw new Error(`Image upload failed: ${errorData.message}`);
    }

    const result = await imageResponse.json();
    
    return {
        url: `https://raw.githubusercontent.com/${repo}/main/${imagePath}`,
        sha: result.content.sha
    };
}
