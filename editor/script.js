// Global variables
let cropper = null;
let croppedImageData = null;
let currentImageOption = 'upload';
let currentModalImageOption = 'upload';
let messages = [];

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
            // In a real implementation, you might want to use a proper syntax highlighter
            return code;
        },
        breaks: true,
        gfm: true
    });
    
    input.addEventListener('input', () => {
        preview.innerHTML = marked.parse(input.value || '*Start writing to see preview...*');
        // Auto-save draft on content change
        autoSaveDraft();
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
    
    // Load any existing draft
    loadDraft();
    
    // Show welcome message
    showMessage('Welcome to the Advanced Editor! Start writing your content.', 'info');
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
    
    // Draft management
    document.getElementById('save-draft').addEventListener('click', saveDraft);
    document.getElementById('load-draft').addEventListener('click', loadDraft);
    
    // Preview toggle
    document.getElementById('toggle-preview').addEventListener('click', togglePreview);
    
    // Form actions
    document.getElementById('save-btn').addEventListener('click', savePost);
    document.getElementById('clear-btn').addEventListener('click', clearForm);
    document.getElementById('export-btn').addEventListener('click', exportMarkdown);
    
    // Image modal
    document.getElementById('close-modal').addEventListener('click', closeImageModal);
    document.getElementById('cancel-image').addEventListener('click', closeImageModal);
    document.getElementById('insert-image').addEventListener('click', insertImageFromModal);
    
    // Inline image upload
    document.getElementById('inline-image-upload').addEventListener('change', handleInlineImageUpload);
}

// Switch between image options for featured image
function switchImageTab(option) {
    currentImageOption = option;
    
    // Update tabs
    document.querySelectorAll('.image-tab:not([data-modal-option])').forEach(tab => {
        tab.classList.remove('active');
        if (tab.getAttribute('data-option') === option) {
            tab.classList.add('active');
        }
    });
    
    // Show/hide options
    document.getElementById('upload-option').classList.toggle('hidden', option !== 'upload');
    document.getElementById('url-option').classList.toggle('hidden', option !== 'url');
}

// Switch between image options in modal
function switchModalImageTab(option) {
    currentModalImageOption = option;
    
    // Update tabs
    document.querySelectorAll('[data-modal-option]').forEach(tab => {
        tab.classList.remove('active');
        if (tab.getAttribute('data-modal-option') === option) {
            tab.classList.add('active');
        }
    });
    
    // Show/hide options
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

        // Check if file is an image
        if (!file.type.match('image.*')) {
            showMessage('Please select an image file', 'error');
            return;
        }

        // Check file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            showMessage('Image size should be less than 10MB', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = function(event) {
            cropImage.src = event.target.result;
            imageCropper.classList.remove('hidden');
            
            // Destroy existing cropper
            if (cropper) {
                cropper.destroy();
            }
            
            // Initialize cropper
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

        // Get cropped canvas
        const canvas = cropper.getCroppedCanvas({
            width: 1200,
            height: 675,
            imageSmoothingQuality: 'high'
        });

        // Convert to data URL
        croppedImageData = canvas.toDataURL('image/jpeg', 0.85);
        
        // Show preview
        document.getElementById('cropped-image').src = croppedImageData;
        croppedPreview.classList.remove('hidden');
        
        // Hide cropper
        imageCropper.classList.add('hidden');
        
        showMessage('Image cropped successfully!', 'success');
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
            cursorOffset = -5; // Position cursor inside the URL placeholder
            break;
        case 'image':
            before = '![';
            after = '](image-url)';
            cursorOffset = -12; // Position cursor inside the alt text
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
    
    // If nothing is selected and we're adding a list/heading/quote, just add the prefix
    if (!selected && (type === 'ul' || type === 'ol' || type === 'h1' || type === 'h2' || type === 'h3' || type === 'quote')) {
        insertText = before;
    }
    
    input.value = value.substring(0, start) + insertText + value.substring(end);
    input.focus();
    
    // Set cursor position
    let cursorPos = start + insertText.length;
    if (cursorOffset) {
        cursorPos += cursorOffset;
    }
    input.setSelectionRange(cursorPos, cursorPos);
    
    // Update preview
    document.getElementById('md-preview').innerHTML = marked.parse(input.value);
    
    // Auto-save draft
    autoSaveDraft();
}

// Open image insertion modal
function insertImage() {
    document.getElementById('image-modal').classList.remove('hidden');
}

// Close image modal
function closeImageModal() {
    document.getElementById('image-modal').classList.add('hidden');
    // Reset modal fields
    document.getElementById('inline-image-url').value = '';
    document.getElementById('image-alt').value = '';
    document.getElementById('inline-image-upload').value = '';
}

// Handle inline image upload in modal
function handleInlineImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Check if file is an image
    if (!file.type.match('image.*')) {
        showMessage('Please select an image file', 'error');
        return;
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
        showMessage('Image size should be less than 10MB', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(event) {
        // Store the image data for insertion
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
            showMessage('Please select an image to upload', 'error');
            return;
        }
        
        // In a real implementation, you would upload the image and get a URL
        // For now, we'll use a data URL (not recommended for production)
        imageUrl = imageData;
        showMessage('Note: For production use, upload images to a proper hosting service', 'warning');
    } else {
        imageUrl = document.getElementById('inline-image-url').value.trim();
        if (!imageUrl || !isValidUrl(imageUrl)) {
            showMessage('Please enter a valid image URL', 'error');
            return;
        }
    }
    
    // Insert markdown for image
    const input = document.getElementById('md-input');
    const start = input.selectionStart;
    const value = input.value;
    
    const imageMarkdown = `![${altText}](${imageUrl})`;
    
    input.value = value.substring(0, start) + imageMarkdown + value.substring(input.selectionEnd);
    input.focus();
    
    // Update preview
    document.getElementById('md-preview').innerHTML = marked.parse(input.value);
    
    // Close modal
    closeImageModal();
    
    // Auto-save draft
    autoSaveDraft();
    
    showMessage('Image inserted successfully!', 'success');
}

// Message system
function showMessage(message, type = 'info') {
    const messageObj = {
        id: Date.now(),
        message,
        type,
        timestamp: new Date().toLocaleTimeString()
    };
    
    messages.unshift(messageObj);
    
    // Limit messages to 10
    if (messages.length > 10) {
        messages.pop();
    }
    
    // Update message list
    updateMessageList();
    
    // Auto-remove message after 5 seconds (except for errors)
    if (type !== 'error') {
        setTimeout(() => {
            removeMessage(messageObj.id);
        }, 5000);
    }
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
        `;
        messageList.appendChild(messageEl);
    });
}

function removeMessage(id) {
    messages = messages.filter(msg => msg.id !== id);
    updateMessageList();
}

function toggleMessageSidebar() {
    document.getElementById('message-sidebar').classList.toggle('active');
}

// Draft management
function autoSaveDraft() {
    const draft = {
        title: document.getElementById('post-title').value,
        date: document.getElementById('post-date').value,
        content: document.getElementById('md-input').value,
        imageOption: currentImageOption,
        imageUrl: document.getElementById('post-image-url').value,
        timestamp: new Date().toISOString()
    };
    
    localStorage.setItem('editor-draft', JSON.stringify(draft));
}

function saveDraft() {
    autoSaveDraft();
    showMessage('Draft saved successfully!', 'success');
}

function loadDraft() {
    const draftData = localStorage.getItem('editor-draft');
    if (!draftData) {
        showMessage('No draft found to load', 'info');
        return;
    }
    
    try {
        const draft = JSON.parse(draftData);
        
        document.getElementById('post-title').value = draft.title || '';
        document.getElementById('post-date').value = draft.date || new Date().toISOString().split('T')[0];
        document.getElementById('md-input').value = draft.content || '';
        document.getElementById('post-image-url').value = draft.imageUrl || '';
        
        if (draft.imageOption) {
            switchImageTab(draft.imageOption);
        }
        
        // Update preview
        document.getElementById('md-preview').innerHTML = marked.parse(draft.content || '*Start writing to see preview...*');
        
        showMessage('Draft loaded successfully!', 'success');
    } catch (error) {
        showMessage('Error loading draft: ' + error.message, 'error');
    }
}

// Toggle preview panel
function togglePreview() {
    const previewPanel = document.querySelector('.preview-panel');
    previewPanel.classList.toggle('hidden');
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
    
    // Clear image cropper
    document.getElementById('image-cropper').classList.add('hidden');
    document.getElementById('cropped-preview').classList.add('hidden');
    croppedImageData = null;
    
    if (cropper) {
        cropper.destroy();
        cropper = null;
    }
    
    // Clear draft
    localStorage.removeItem('editor-draft');
    
    showMessage('Form cleared', 'success');
}

// Export markdown
function exportMarkdown() {
    const title = document.getElementById('post-title').value.trim();
    const date = document.getElementById('post-date').value;
    const content = document.getElementById('md-input').value.trim();
    
    if (!content) {
        showMessage('No content to export', 'error');
        return;
    }
    
    // Create frontmatter
    const frontmatter = [
        '---',
        `title: "${title || 'Untitled'}"`,
        `date: "${date}"`,
        '---',
        ''
    ].join('\n');
    
    const fullContent = frontmatter + content;
    
    // Create download
    const blob = new Blob([fullContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title || 'untitled'}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showMessage('Markdown exported successfully!', 'success');
}

// Save post to GitHub
async function savePost() {
    const token = document.getElementById('github-token').value.trim();
    const title = document.getElementById('post-title').value.trim();
    const date = document.getElementById('post-date').value;
    const markdown = document.getElementById('md-input').value.trim();

    // Validation
    if (!token) {
        showMessage('Please enter your GitHub Personal Access Token', 'error');
        return;
    }

    if (!title) {
        showMessage('Please enter a post title', 'error');
        return;
    }

    if (!date) {
        showMessage('Please select a publication date', 'error');
        return;
    }

    if (!markdown) {
        showMessage('Please write some content for your post', 'error');
        return;
    }

    try {
        showMessage('Saving post...', 'info');
        
        // Handle image based on selected option
        let imageUrl = '';
        
        if (currentImageOption === 'upload' && croppedImageData) {
            showMessage('Uploading image...', 'info');
            // Upload cropped image to GitHub
            imageUrl = await uploadImageToGitHub(token, title, croppedImageData);
        } else if (currentImageOption === 'url') {
            // Use provided URL
            const urlInput = document.getElementById('post-image-url').value.trim();
            if (urlInput && isValidUrl(urlInput)) {
                imageUrl = urlInput;
            }
        }

        // Create filename from title
        const filename = title.toLowerCase()
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

        // Check if file exists to get SHA (for updates)
        let sha = null;
        try {
            const existingFile = await fetch(
                `https://api.github.com/repos/${repo}/contents/${filePath}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );
            
            if (existingFile.ok) {
                const fileData = await existingFile.json();
                sha = fileData.sha;
            }
        } catch (error) {
            // File doesn't exist, which is fine for new posts
        }

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
                body: JSON.stringify({
                    message: `Add post: ${title}`,
                    content: btoa(unescape(encodeURIComponent(content))),
                    sha: sha
                })
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `GitHub API error: ${response.status}`);
        }

        showMessage(`✨ Writing "${title}" saved successfully!`, 'success');
        
        // Clear form on success
        setTimeout(() => {
            clearForm();
            // Clear draft after successful publish
            localStorage.removeItem('editor-draft');
        }, 2000);
        
    } catch (error) {
        console.error('Error saving post:', error);
        
        let errorMessage = 'Failed to save writing: ';
        if (error.message.includes('401') || error.message.includes('Bad credentials')) {
            errorMessage += 'Invalid token. Please check your GitHub Personal Access Token.';
        } else if (error.message.includes('403')) {
            errorMessage += 'Token does not have write permissions or repository access.';
        } else if (error.message.includes('422')) {
            errorMessage += 'File already exists or validation failed.';
        } else {
            errorMessage += error.message;
        }
        
        showMessage(errorMessage, 'error');
    }
}

// Upload image to GitHub
async function uploadImageToGitHub(token, title, imageData) {
    const repo = 'ikenith/ikenith.github.io';
    
    // Convert data URL to blob
    const response = await fetch(imageData);
    const blob = await response.blob();
    
    // Convert blob to base64
    const base64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(blob);
    });

    // Create filename for image
    const imageFilename = title.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '') + '.jpg';

    const imagePath = `images/${imageFilename}`;

    // Upload image
    const imageResponse = await fetch(
        `https://api.github.com/repos/${repo}/contents/${imagePath}`,
        {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: `Add image for post: ${title}`,
                content: base64
            })
        }
    );

    if (!imageResponse.ok) {
        const errorData = await imageResponse.json();
        throw new Error(`Image upload failed: ${errorData.message}`);
    }

    // Return the raw GitHub URL for the image
    return `https://raw.githubusercontent.com/${repo}/main/${imagePath}`;
}
