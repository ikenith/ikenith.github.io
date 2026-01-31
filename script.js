// script.js
document.addEventListener('DOMContentLoaded', () => {
    const starsContainer = document.querySelector('.stars');
    const starCount = 200;
    
    // Create stars
    for (let i = 0; i < starCount; i++) {
        createStar();
    }
    
    function createStar() {
        const star = document.createElement('div');
        star.classList.add('star');
        
        // Random position
        const x = Math.random() * 100;
        const y = Math.random() * 100;
        
        // Random size (0.5px to 2px)
        const size = Math.random() * 1.5 + 0.5;
        
        // Random animation duration (2s to 5s)
        const duration = Math.random() * 3 + 2;
        
        // Apply styles
        star.style.left = `${x}%`;
        star.style.top = `${y}%`;
        star.style.width = `${size}px`;
        star.style.height = `${size}px`;
        star.style.animationDuration = `${duration}s`;
        
        starsContainer.appendChild(star);
    }
    
    // Update stars on window resize
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            starsContainer.innerHTML = '';
            for (let i = 0; i < starCount; i++) {
                createStar();
            }
        }, 100);
    });
});