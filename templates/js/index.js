const canvas = document.getElementById("neural-canvas");
const ctx = canvas.getContext("2d");
let particles = [];
let animationId;
const mouse = { x: null, y: null, radius: 180 };

window.addEventListener("mousemove", (e) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});

window.addEventListener("mouseleave", () => {
  mouse.x = null;
  mouse.y = null;
});

class Particle {
  constructor() {
    this.init();
  }
  init() {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    this.size = Math.random() * 1.5 + 0.5;
    this.speedX = (Math.random() - 0.5) * 0.5;
    this.speedY = (Math.random() - 0.5) * 0.5;
    this.baseX = this.x;
    this.baseY = this.y;
    this.density = Math.random() * 30 + 1;
  }
  update() {
    // Movement
    this.x += this.speedX;
    this.y += this.speedY;

    // Boundary check
    if (this.x > canvas.width || this.x < 0) this.speedX *= -1;
    if (this.y > canvas.height || this.y < 0) this.speedY *= -1;

    // Mouse interaction
    if (mouse.x != null) {
      let dx = mouse.x - this.x;
      let dy = mouse.y - this.y;
      let distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < mouse.radius) {
        const force = (mouse.radius - distance) / mouse.radius;
        const directionX = dx / distance;
        const directionY = dy / distance;
        // Multiplicador aumentado a 8 para una respuesta casi instantánea
        this.x += directionX * force * 8;
        this.y += directionY * force * 8;
      }
    }
  }
  draw() {
    ctx.fillStyle = "rgba(25, 127, 230, 0.8)";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

function init() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  particles = [];
  const numberOfParticles = Math.floor((canvas.width * canvas.height) / 9000);
  for (let i = 0; i < numberOfParticles; i++) {
    particles.push(new Particle());
  }
}

function connect() {
  let opacityValue = 1;
  for (let a = 0; a < particles.length; a++) {
    for (let b = a; b < particles.length; b++) {
      let dx = particles[a].x - particles[b].x;
      let dy = particles[a].y - particles[b].y;
      let distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 150) {
        opacityValue = 1 - distance / 150;
        ctx.strokeStyle = `rgba(25, 127, 230, ${opacityValue * 0.4})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(particles[a].x, particles[a].y);
        ctx.lineTo(particles[b].x, particles[b].y);
        ctx.stroke();
      }
    }
  }
}

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < particles.length; i++) {
    particles[i].update();
    particles[i].draw();
  }
  connect();
  animationId = requestAnimationFrame(animate);
}

window.addEventListener("resize", () => {
  init();
});

init();
animate();
