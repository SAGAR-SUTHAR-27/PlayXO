/* ==========================================================================
   NEON GRID // CANVAS CONFETTI VICTORY CELEBRATIONS
   ========================================================================== */

class Confetticelebration {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.particles = [];
    this.animationId = null;
    this.colors = [
      '#7c6cfc', // Purple
      '#f9577a', // Pink
      '#34d399', // Emerald
      '#fbbf24', // Amber
      '#60a5fa', // Blue
      '#ffffff',  // White
      '#f472b6', // Rose
      '#a78bfa', // Violet
      '#fb923c', // Orange
    ];
  }

  init() {
    this.canvas = document.getElementById('confetti-canvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  resizeCanvas() {
    if (this.canvas) {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    }
  }

  trigger() {
    this.init();
    if (!this.canvas || !this.ctx) return;

    this.stop();
    this.particles = [];

    const total = 160;
    const half = total / 2;

    // Left cannon → shoots toward center-right (upper-right arc)
    for (let i = 0; i < half; i++) {
      this.particles.push(this.createParticle('left'));
    }

    // Right cannon → shoots toward center-left (upper-left arc)
    for (let i = 0; i < half; i++) {
      this.particles.push(this.createParticle('right'));
    }

    this.animate();
  }

  createParticle(side) {
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Cannon origin: bottom-left or bottom-right
    const x = side === 'left'
      ? w * 0.05 + Math.random() * 40          // left edge area
      : w * 0.95 - Math.random() * 40;         // right edge area

    const y = h * 0.85 + Math.random() * 30;   // near bottom

    // Left side shoots right-upward: angle range -80° to -20°  (up and to the right)
    // Right side shoots left-upward: angle range -160° to -100° (up and to the left)
    let angleDeg;
    if (side === 'left') {
      angleDeg = -(Math.random() * 60 + 20);   // -20° to -80°
    } else {
      angleDeg = -(Math.random() * 60 + 100);  // -100° to -160°
    }

    const angleRad = angleDeg * Math.PI / 180;
    const speed = Math.random() * 16 + 12;

    return {
      x,
      y,
      size: Math.random() * 9 + 5,
      color: this.colors[Math.floor(Math.random() * this.colors.length)],
      vx: Math.cos(angleRad) * speed,
      vy: Math.sin(angleRad) * speed,
      gravity: 0.30,
      friction: 0.984,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 9,
      opacity: 1,
      fadeRate: Math.random() * 0.005 + 0.003,
    };
  }

  animate() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    let activeParticles = false;

    this.particles.forEach((p) => {
      // Apply gravity and friction
      p.vy += p.gravity;
      p.vx *= p.friction;

      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.rotationSpeed;

      // Fade out when falling past center height
      if (p.y > this.canvas.height * 0.5) {
        p.opacity -= p.fadeRate * 2.5;
      }

      if (
        p.opacity > 0 &&
        p.x > -100 &&
        p.x < this.canvas.width + 100 &&
        p.y < this.canvas.height + 50
      ) {
        activeParticles = true;
        this.ctx.save();
        this.ctx.translate(p.x, p.y);
        this.ctx.rotate((p.rotation * Math.PI) / 180);
        this.ctx.globalAlpha = Math.max(0, p.opacity);
        this.ctx.fillStyle = p.color;
        this.ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        this.ctx.restore();
      }
    });

    if (activeParticles) {
      this.animationId = requestAnimationFrame(() => this.animate());
    } else {
      this.stop();
    }
  }

  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    this.particles = [];
  }
}

export const Confetti = new Confetticelebration();
