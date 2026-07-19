const BIRD_COUNT = 4;
const BIRD_WALL_MARGIN = 10;
const BIRD_WALL_WEIGHT = 0.8;

const Settings = {
    bird_size: 12,
    bird_speed: 6,

    bird_vision: 100,
    bird_separation: 60,

    bird_alignment_weight: 1,
    bird_cohesion_weight: 1,
    bird_separation_weight: 4,

    line_thickness: 2,
}

const BIRD_COLOR = [
    "#FFADAD",
    "#FFD6A5",
    "#FDFFB6",
    "#CAFFBF",
    "#9BF6FF",
    "#A0C4FF",
    "#BDB2FF",
    "#FFC6FF",
    "#CDEAC0",
    "#E2F0CB",
    "#B5EAD7",
    "#C7CEEA",
];
const BACKGROUND_COLOR = "#222";
const LINE_COLOR = "gray";

let running = true;

class Bird {
    public x: number;
    public y: number;
    public vx: number;
    public vy: number;

    public color: string;

    public constructor(x: number, y: number, angle: number, color: string) {
        this.x = x;
        this.y = y;
        this.vx = Math.cos(angle);
        this.vy = Math.sin(angle);
        this.color = color;

    }

    public draw(ctx: CanvasRenderingContext2D) {

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(Math.atan2(this.vy, this.vx))

        ctx.beginPath();
        ctx.moveTo(Settings.bird_size + 2, 0);

        ctx.lineTo(-Settings.bird_size, -Settings.bird_size);
        ctx.lineTo(-Settings.bird_size, Settings.bird_size);

        ctx.closePath();

        ctx.fillStyle = this.color;
        ctx.fill();

        ctx.restore();

    }

    private find_neighbors(flock: Bird[], radius: number): Bird[] {
        const neighbors: Bird[] = []

        for (const bird of flock) {
            if (bird == this) {
                continue
            }

            const dx = bird.x - this.x
            const dy = bird.y - this.y

            const distance = (dx * dx) + (dy * dy);

            if (distance <= Math.pow(radius, 2)) {
                neighbors.push(bird);
            }
        }

        return neighbors;

    }

    private align(neighbors: Bird[]): void {

        if (neighbors.length === 0) {
            return;
        }

        let sumVX = 0;
        let sumVY = 0;

        for (const bird of neighbors) {
            sumVX += bird.vx;
            sumVY += bird.vy;
        }

        if (neighbors.length === 0) {
            return;
        }

        const averageVX = sumVX / neighbors.length;
        const averageVY = sumVY / neighbors.length;

        const steerX = averageVX - this.vx;
        const steerY = averageVY - this.vy;

        this.vx += steerX * (Settings.bird_alignment_weight / 10);
        this.vy += steerY * (Settings.bird_alignment_weight / 10);
    }


    public normalize_velocity(): void {
        const length = Math.sqrt(this.vx * this.vx + this.vy * this.vy);

        if (length === 0) {
            return;
        }

        this.vx = (this.vx / length) * Settings.bird_speed;
        this.vy = (this.vy / length) * Settings.bird_speed;
    }

    public move(): void {
        this.x += this.vx;
        this.y += this.vy;
    }

    private cohesion(neighbors: Bird[]) {

        let sum_x = 0;
        let sum_y = 0;

        for (const bird of neighbors) {
            sum_x += bird.x;
            sum_y += bird.y;
        }

        if (neighbors.length === 0) {
            return;
        }

        const center_x = sum_x / neighbors.length;
        const center_y = sum_y / neighbors.length;

        const desired_x = center_x - this.x;
        const desired_y = center_y - this.y;

        this.vx += desired_x * (Settings.bird_cohesion_weight / 1000);
        this.vy += desired_y * (Settings.bird_cohesion_weight / 1000);
    }

    private separation(neighbors: Bird[]) {

        let steer_x = 0;
        let steer_y = 0;

        const seperation_radius_squared = Settings.bird_separation * Settings.bird_separation;

        for (const bird of neighbors) {
            if (bird === this) {
                continue;
            }

            const dx = this.x - bird.x;
            const dy = this.y - bird.y;

            const distance_squared = (dx * dx) + (dy * dy);

            if (distance_squared === 0 || distance_squared > seperation_radius_squared) {
                continue;
            }

            steer_x += dx / distance_squared;
            steer_y += dy / distance_squared;
        }

        this.vx += steer_x * (Settings.bird_separation_weight / 10);
        this.vy += steer_y * (Settings.bird_separation_weight / 10);

    }

    private avoid_wall(canvas: HTMLCanvasElement): void {
        const margin = BIRD_WALL_MARGIN + Settings.bird_size;

        if (this.x < margin && this.vx < 0) {
            const strength = (margin - this.x) / margin;
            this.vx += strength * BIRD_WALL_WEIGHT;
        }

        if (this.x > canvas.width - margin && this.vx > 0) {
            const strength = (margin - (canvas.width - this.x)) / margin;
            this.vx -= strength * BIRD_WALL_WEIGHT;
        }

        if (this.y < margin && this.vy < 0) {
            const strength = (margin - this.y) / margin;
            this.vy += strength * BIRD_WALL_WEIGHT;
        }

        if (this.y > canvas.height - margin && this.vy > 0) {
            const strength = (margin - (canvas.height - this.y)) / margin;
            this.vy -= strength * BIRD_WALL_WEIGHT;
        }
    }

    public static lines(flock: Bird[], ctx: CanvasRenderingContext2D) {

        for (let i = 0; i < flock.length; i++) {
            for (let j = i + 1; j < flock.length; j++) {
                const a = flock[i];
                const b = flock[j];

                const dx = a.x - b.x;
                const dy = a.y - b.y;

                const distance = (dx * dx) + (dy * dy);

                if (distance <= Math.pow(Settings.bird_vision, 2)) {
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.lineWidth = Settings.line_thickness;
                    ctx.strokeStyle = LINE_COLOR;
                    ctx.stroke();
                }
            }
        }

    };

    public update(flock: Bird[], canvas: HTMLCanvasElement) {

        const neighbors = this.find_neighbors(flock, Settings.bird_vision);

        this.align(neighbors);
        this.cohesion(neighbors);
        this.separation(neighbors);
        this.avoid_wall(canvas)

        this.normalize_velocity();
        this.move();

    }
}


function loop(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, flock: Bird[]) {

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (running) {
        for (const bird of flock)
            bird.update(flock, canvas);
    }

    if (Settings.line_thickness != 0)
        Bird.lines(flock, ctx);


    for (const bird of flock) {
        bird.draw(ctx);
    }


    requestAnimationFrame(() => loop(canvas, ctx, flock));
}

function main() {
    const canvas = document.getElementById("canvas") as HTMLCanvasElement | null;

    if (canvas == null) {
        return;
    }

    const ctx = canvas.getContext("2d")

    if (ctx == null) {
        return;
    }

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    canvas.style.backgroundColor = BACKGROUND_COLOR

    const flock: Array<Bird> = []
    for (let i = 0; i < BIRD_COUNT; ++i) {
        flock.push(new Bird(
            Math.random() * (canvas.width - 0),
            Math.random() * (canvas.height - 0),
            Math.random() * Math.PI * 2,
            BIRD_COLOR[i % BIRD_COLOR.length],
        ));
    }

    window.addEventListener("keydown", (event) => {
        if (event.code === "Space") {
            running = !running;
        }
    });

    window.addEventListener("click", (event) => {
        for (let i = 0; i < 5; i++) {
            flock.push(new Bird(event.clientX,
                event.clientY,
                Math.random() * Math.PI * 2,
                BIRD_COLOR[i % BIRD_COLOR.length],
            ));
        }
    })

    // ctx.filter = 'blur(8px) contrast(150%)';
    // ctx.globalCompositeOperation = 'screen';

    const settings_toggle = document.getElementById('settings-toggle');
    const settings_panel = document.getElementById('settings-panel');

    if (!settings_panel || !settings_toggle) {
        return;
    }

    settings_toggle.addEventListener('click', () => {
        settings_panel.classList.toggle('hidden');
    })

    const bird_size = document.getElementById('size') as HTMLInputElement;
    const bird_speed = document.getElementById('speed') as HTMLInputElement;

    const bird_vision = document.getElementById('vision') as HTMLInputElement;
    const bird_separation = document.getElementById('separation') as HTMLInputElement;

    const bird_alignment_weight = document.getElementById('alignment_weight') as HTMLInputElement;
    const bird_cohesion_weight = document.getElementById('cohesion_weight') as HTMLInputElement;
    const bird_separation_weight = document.getElementById('separation_weight') as HTMLInputElement;

    const line_thickness = document.getElementById('lines') as HTMLInputElement;

    if (!bird_size ||
        !bird_speed ||
        !bird_vision ||
        !bird_separation ||
        !bird_alignment_weight ||
        !bird_cohesion_weight ||
        !bird_separation_weight ||
        !line_thickness
    ) {
        return;
    }

    bird_size.value = String(Settings.bird_size);
    bird_speed.value = String(Settings.bird_speed);
    bird_vision.value = String(Settings.bird_vision);
    bird_separation.value = String(Settings.bird_separation);
    bird_alignment_weight.value = String(Settings.bird_alignment_weight / 10);
    bird_cohesion_weight.value = String(Settings.bird_cohesion_weight / 1000);
    bird_separation_weight.value = String(Settings.bird_separation_weight / 10);
    line_thickness.value = String(Settings.line_thickness);

    bird_size.addEventListener("input", () => {
        Settings.bird_size = Number(bird_size.value);
        const value = bird_size.nextElementSibling!;
        value.textContent = bird_size.value;
    })

    bird_speed.addEventListener("input", () => {
        Settings.bird_speed = Number(bird_speed.value);
        const value = bird_speed.nextElementSibling!;
        value.textContent = bird_speed.value;
    })

    bird_vision.addEventListener("input", () => {
        Settings.bird_vision = Number(bird_vision.value);
        const value = bird_vision.nextElementSibling!;
        value.textContent = bird_vision.value;
    })

    bird_separation.addEventListener("input", () => {
        Settings.bird_separation = Number(bird_separation.value);
        const value = bird_separation.nextElementSibling!;
        value.textContent = bird_separation.value;
    })

    bird_alignment_weight.addEventListener("input", () => {
        Settings.bird_alignment_weight = Number(bird_alignment_weight.value);
        const value = bird_alignment_weight.nextElementSibling!;
        value.textContent = bird_alignment_weight.value;
    })

    bird_cohesion_weight.addEventListener("input", () => {
        Settings.bird_cohesion_weight = Number(bird_cohesion_weight.value);
        const value = bird_cohesion_weight.nextElementSibling!;
        value.textContent = bird_cohesion_weight.value;
    })

    bird_separation_weight.addEventListener("input", () => {
        Settings.bird_separation_weight = Number(bird_separation_weight.value);
        const value = bird_separation_weight.nextElementSibling!;
        value.textContent = bird_separation_weight.value;
    })

    line_thickness.addEventListener('click', () => {
        Settings.line_thickness = Number(line_thickness.value);
        const value = line_thickness.nextElementSibling!;
        value.textContent = line_thickness.value;
    })

    loop(canvas, ctx, flock);

}

main();
