// script.js
document.addEventListener('DOMContentLoaded', () => {
    const spaceContainer = document.querySelector('.space');
    const starCount = 150;
    
    // Create stars
    for (let i = 0; i < starCount; i++) {
        createStar();
    }
    
    function createStar() {
        const star = document.createElement('div');
        star.classList.add('star');
        
        // Random position, avoiding center where black hole is
        let x, y;
        do {
            x = Math.random() * 100;
            y = Math.random() * 100;
        } while (isInBlackHoleZone(x, y));
        
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
        
        spaceContainer.appendChild(star);
    }
    
    function isInBlackHoleZone(x, y) {
        // Check if position is within black hole area (center 20% of screen)
        const centerX = 50;
        const centerY = 50;
        const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
        return distance < 15; // 15% radius from center
    }
    
    // Make accretion disk rotate in opposite direction
    const accretionDisk = document.querySelector('.accretion-disk');
    accretionDisk.style.animationDirection = 'reverse';
    
    // Add subtle gravitational lensing effect to stars near black hole
    const stars = document.querySelectorAll('.star');
    stars.forEach(star => {
        const x = parseFloat(star.style.left);
        const y = parseFloat(star.style.top);
        const centerX = 50;
        const centerY = 50;
        const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
        
        if (distance < 30) {
            // Stars near black hole twinkle faster
            const speed = 1 + (30 - distance) / 10;
            const currentDuration = parseFloat(star.style.animationDuration);
            star.style.animationDuration = `${currentDuration / speed}s`;
            
            // Make them slightly dimmer
            star.style.opacity = 0.1 + (distance / 30) * 0.9;
        }
    });
    
    // Update on window resize
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            spaceContainer.innerHTML = '';
            for (let i = 0; i < starCount; i++) {
                createStar();
            }
        }, 100);
    });
});