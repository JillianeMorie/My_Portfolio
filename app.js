const canvas = document.getElementById('nature-canvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const particles = [];
const branches = [];
const palette = {
    pink: ['#f3d1d6', '#e8b4bc', '#fad2e1'],
    green: ['#cbdacb', '#b3cbb3', '#a3bba3'],
    wood: '74, 83, 75' // Stored as RGB values so we can manipulate transparency (alpha)
};

// ==========================================
// 1. GENERATIVE TREE WITH LIFETIME & FADE LOGIC
// ==========================================
class Branch {
    constructor(startX, startY, angle, length, thickness, depth) {
        this.startX = startX;
        this.startY = startY;
        this.angle = angle; 
        this.maxLength = length;
        this.thickness = thickness;
        this.depth = depth; 
        
        this.currentLength = 0;
        this.growthSpeed = Math.random() * 2 + 2;
        this.childGenerated = false;

        this.endX = startX;
        this.endY = startY;

        // --- LIFETIME CONFIGURATION ---
        this.isFullyGrown = false;
        this.lifeDuration = 4000; // Time in milliseconds the branch stays fully visible (4 seconds)
        this.fadeDuration = 2000; // Time in milliseconds it takes to fade to 0 opacity (2 seconds)
        this.timeFinished = null; // Stamped when growth reaches maximum length
        this.opacity = 1;
        this.shouldRemove = false;
    }

    update() {
        // Step A: Handle growth phase
        if (this.currentLength < this.maxLength) {
            this.currentLength += this.growthSpeed;
            this.endX = this.startX + Math.cos(this.angle) * this.currentLength;
            this.endY = this.startY + Math.sin(this.angle) * this.currentLength;
        } else {
            // Once growth completes, track the timestamp
            if (!this.isFullyGrown) {
                this.isFullyGrown = true;
                this.timeFinished = Date.now();
            }

            // Trigger child branch splits
            if (!this.childGenerated && this.depth > 0) {
                this.childGenerated = true;
                this.spawnChildren();
            }

            // Step B: Manage lifetime countdown and fading
            const timeElapsedSinceGrowth = Date.now() - this.timeFinished;
            
            if (timeElapsedSinceGrowth > this.lifeDuration) {
                // Begin fading calculation
                const fadeProgress = (timeElapsedSinceGrowth - this.lifeDuration) / this.fadeDuration;
                this.opacity = 1 - fadeProgress;

                // Signal removal once completely transparent
                if (this.opacity <= 0) {
                    this.opacity = 0;
                    this.shouldRemove = true;
                }
            }
        }
    }

    draw() {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(this.startX, this.startY);
        ctx.lineTo(this.endX, this.endY);
        
        // Dynamic stroke using rgba layout with active opacity tracker
        ctx.strokeStyle = `rgba(${palette.wood}, ${this.opacity})`;
        ctx.lineWidth = this.thickness * (1 - this.currentLength / this.maxLength * 0.3);
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.restore();

        // Bloom drifting ambient elements off active branch tips
        if (this.currentLength >= this.maxLength && this.thickness < 2 && this.opacity > 0.5) {
            this.bloom();
        }
    }

    spawnChildren() {
        const numBranches = Math.random() > 0.3 ? 2 : 1;
        for (let i = 0; i < numBranches; i++) {
            const changeAngle = (Math.random() * 0.6 - 0.3); 
            const nextAngle = this.angle + changeAngle;
            const nextLength = this.maxLength * (Math.random() * 0.2 + 0.65);
            const nextThickness = this.thickness * 0.65;

            if (nextThickness > 0.5) {
                branches.push(new Branch(this.endX, this.endY, nextAngle, nextLength, nextThickness, this.depth - 1));
            }
        }
    }

    bloom() {
        if (Math.random() < 0.01) {
            particles.push(new Petal(this.endX, this.endY));
        }
    }
}

function plantTree(x, y, baseAngle, baseLength, maxDepth) {
    branches.push(new Branch(x, y, baseAngle, baseLength, 5, maxDepth));
}

// Sprout a subtle starter tree on page initialization
plantTree(window.innerWidth * 0.85, window.innerHeight, -Math.PI / 2, 90, 5);

// Plant structural branches towards user mouse click target points
window.addEventListener('click', (e) => {
    const startX = e.clientX + (Math.random() * 40 - 20);
    const startY = window.innerHeight;
    const angle = Math.atan2(e.clientY - startY, e.clientX - startX);
    const customLength = Math.max(50, Math.min(120, (startY - e.clientY) * 0.3));

    plantTree(startX, startY, angle, customLength, 4);
});


// ==========================================
// 2. DRIFTING BLOSSOM PETALS SYSTEM
// ==========================================
class Petal {
    constructor(x, y) {
        this.reset(x, y);
    }

    reset(x = null, y = null) {
        this.x = x !== null ? x : Math.random() * canvas.width;
        this.y = y !== null ? y : Math.random() * -canvas.height - 20;
        this.size = Math.random() * 5 + 3;
        this.speedY = Math.random() * 0.8 + 0.4;
        this.speedX = Math.random() * 1 - 0.3; 
        
        const isPink = Math.random() > 0.4;
        const colorArray = isPink ? palette.pink : palette.green;
        this.color = colorArray[Math.floor(Math.random() * colorArray.length)];
        
        this.angle = Math.random() * 360;
        this.spin = Math.random() * 1.5 - 0.75;
    }

    update() {
        this.y += this.speedY;
        this.x += this.speedX;
        this.angle += this.spin;

        if (this.y > canvas.height || this.x < 0 || this.x > canvas.width) {
            this.reset();
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate((this.angle * Math.PI) / 180);
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, this.size, this.size / 1.8, 0, 0, 2 * Math.PI);
        ctx.fill();
        ctx.restore();
    }
}

for (let i = 0; i < 30; i++) {
    particles.push(new Petal());
}

window.addEventListener('mousemove', (e) => {
    particles.forEach(p => {
        p.speedX += (e.clientX / window.innerWidth - 0.5) * 0.05;
        if (p.speedX > 1.5) p.speedX = 1.5;
        if (p.speedX < -1.5) p.speedX = -1.5;
    });
});


// ==========================================
// 3. MAIN RENDER LOOP (WITH GARBAGE COLLECTION)
// ==========================================
function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Reverse loop iteration to safely drop dead branches without indices snapping
    for (let i = branches.length - 1; i >= 0; i--) {
        branches[i].update();
        branches[i].draw();

        if (branches[i].shouldRemove) {
            branches.splice(i, 1);
        }
    }

    particles.forEach(petal => {
        petal.update();
        petal.draw();
    });

    requestAnimationFrame(animate);
}

window.addEventListener('load', () => {
    let isInterrupted = false;

    // Detect if the user tries to scroll up or down manually
    const interruptCheck = () => {
        isInterrupted = true;
        // Clean up listeners immediately once interrupted so we aren't wasting performance
        window.removeEventListener('wheel', interruptCheck);
        window.removeEventListener('touchmove', interruptCheck);
        window.removeEventListener('keydown', interruptCheck);
    };

    // Listen for any manual mouse wheels, mobile swipes, or keyboard hits
    window.addEventListener('wheel', interruptCheck);
    window.addEventListener('touchmove', interruptCheck);
    window.addEventListener('keydown', interruptCheck);

    // 1. Wait 3.5 seconds on the landing page
    setTimeout(() => {
        // If the user hasn't touched anything, glide to About
        if (!isInterrupted) {
            const aboutSection = document.getElementById('about');
            if (aboutSection) {
                aboutSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }

            // 2. Wait another 4.5 seconds on the About page
            setTimeout(() => {
                // Double check they still haven't manually scrolled away before moving to Work
                if (!isInterrupted) {
                    const workSection = document.getElementById('work');
                    if (workSection) {
                        workSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                    // Clean up after natural completion
                    interruptCheck();
                }
            }, 4500);
        }
    }, 3500);
});

animate();