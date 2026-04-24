class Car {
    constructor(x, y, width, height, controlType, maxSpeed = 3, color = "blue") {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;

        this.speed = 0;
        this.acceleration = 0.2;
        this.maxSpeed = maxSpeed;
        this.friction = 0.05;
        this.angle = 0;
        this.damage = false;

        this.useBrain = controlType === "AI";

        // ✅ Choose image based on controlType
        this.img = new Image();
        if (controlType === "KEYS") {
            this.img.src = "car.png"; // Player car
        } else if (controlType === "DUMMY") {
            this.img.src = "traffic.png"; // Traffic cars
        } else {
            this.img.src = "ai.png"; // AI car
        }

        // ✅ Prepare an offscreen canvas for smoother scaling
        this.imageCanvas = document.createElement("canvas");
        this.imageCanvas.width = width * 1.3;
        this.imageCanvas.height = height * 1.3;
        const imgCtx = this.imageCanvas.getContext("2d");

        this.img.onload = () => {
            imgCtx.clearRect(0, 0, this.imageCanvas.width, this.imageCanvas.height);
            imgCtx.drawImage(
                this.img,
                0,
                0,
                this.imageCanvas.width,
                this.imageCanvas.height
            );
        };

        // ✅ Sensors + Neural Net (for AI)
        if (controlType !== "DUMMY") {
            this.sensor = new Sensor(this);
            this.brain = new NeuralNetwork([this.sensor.rayCount, 6, 4]);
        }

        this.controls = new Controls(controlType);
        // track if the car is tailing/following traffic for prolonged time
        this.followingTicks = 0;
    }

    update(roadBorders, traffic, trafficLights = []) {
        if (!this.damage) {
            this.#move();
            this.polygon = this.#createPolygon();
            this.damage = this.#assessDamage(roadBorders, traffic);
        }

        // Check traffic lights and apply braking if needed
        let shouldStop = false;
        if (trafficLights.length > 0) {
            for (let light of trafficLights) {
                if (light.shouldStop(this.y, 80)) {
                    shouldStop = true;
                    break;
                }
            }
        }

        if (this.sensor) {
            this.sensor.update(roadBorders, traffic);
            const offsets = this.sensor.readings.map((s) =>
                s == null ? 0 : 1 - s.offset
            );
            const outputs = NeuralNetwork.feedForward(offsets, this.brain);

            if (this.useBrain) {
                this.controls.forward = outputs[0];
                this.controls.left = outputs[1];
                this.controls.right = outputs[2];
                this.controls.reverse = outputs[3];

                // Force stop if traffic light is red
                if (shouldStop) {
                    this.controls.forward = 0;
                    this.controls.reverse = 0.5; // Gentle braking
                }
            } else {
                // For dummy cars, apply traffic light rules
                if (shouldStop) {
                    this.controls.forward = 0;
                    this.controls.reverse = 0.3;
                }
            }

            // Detect if the car is closely following traffic in the center rays.
            // Used to penalize "following" behavior that exploits a lead vehicle.
            const centerIndex = Math.floor(this.sensor.rayCount / 2);
            const closeTrafficDetected = this.sensor.readings.some((r, idx) => {
                if (!r || !r.object) return false;
                if (Math.abs(idx - centerIndex) > 1) return false; // prefer central rays
                // small offset means the object is very close ahead on the ray
                return r.offset < 0.12 && r.object.y < this.y;
            });

            if (closeTrafficDetected) {
                this.followingTicks++;
            } else {
                this.followingTicks = Math.max(0, this.followingTicks - 1);
            }

            // If the car has been following for too long, force a crash into the leading traffic
            const FOLLOW_LIMIT = (typeof FOLLOW_TICK_LIMIT !== 'undefined') ? FOLLOW_TICK_LIMIT : 30;
            if (this.useBrain && this.followingTicks > FOLLOW_LIMIT) {
                // find the nearest traffic object among central rays
                let leading = null;
                let minOff = Infinity;
                const centerIndex = Math.floor(this.sensor.rayCount / 2);
                for (let i = 0; i < this.sensor.readings.length; i++) {
                    const r = this.sensor.readings[i];
                    if (!r || !r.object) continue;
                    if (Math.abs(i - centerIndex) > 1) continue;
                    if (r.object.y < this.y && r.offset < minOff) {
                        minOff = r.offset;
                        leading = r.object;
                    }
                }

                // If very close to the front object, push into it to guarantee collision
                if (leading && minOff < 0.15) {
                    const overlap = 5; // pixels to overlap to ensure intersect
                    this.y = leading.y + (leading.height + this.height) / 2 - overlap;
                    this.speed = 0;
                    this.controls.forward = false;
                    this.controls.left = false;
                    this.controls.right = false;
                    this.controls.reverse = false;
                    this.damage = true; // mark as crashed
                    console.log('🚨 Forced crash: AI car flagged as damaged for persistent following.');
                }
            }
        }
    }

    #assessDamage(roadBorders, traffic) {
        for (let i = 0; i < roadBorders.length; i++) {
            if (polysIntersect(this.polygon, roadBorders[i])) {
                return true;
            }
        }
        for (let i = 0; i < traffic.length; i++) {
            if (polysIntersect(this.polygon, traffic[i].polygon)) {
                return true;
            }
        }
        return false;
    }

    #createPolygon() {
        const points = [];
        const rad = Math.hypot(this.width, this.height) / 2;
        const alpha = Math.atan2(this.width, this.height);

        points.push({
            x: this.x - Math.sin(this.angle - alpha) * rad,
            y: this.y - Math.cos(this.angle - alpha) * rad,
        });
        points.push({
            x: this.x - Math.sin(this.angle + alpha) * rad,
            y: this.y - Math.cos(this.angle + alpha) * rad,
        });
        points.push({
            x: this.x - Math.sin(Math.PI + this.angle - alpha) * rad,
            y: this.y - Math.cos(Math.PI + this.angle - alpha) * rad,
        });
        points.push({
            x: this.x - Math.sin(Math.PI + this.angle + alpha) * rad,
            y: this.y - Math.cos(Math.PI + this.angle + alpha) * rad,
        });
        return points;
    }

    #move() {
        if (this.controls.forward) this.speed += this.acceleration;
        if (this.controls.reverse) this.speed -= this.acceleration;

        if (this.speed > this.maxSpeed) this.speed = this.maxSpeed;
        if (this.speed < -this.maxSpeed / 2) this.speed = -this.maxSpeed / 2;

        if (this.speed > 0) this.speed -= this.friction;
        if (this.speed < 0) this.speed += this.friction;
        if (Math.abs(this.speed) < this.friction) this.speed = 0;

        if (this.speed !== 0) {
            const flip = this.speed > 0 ? 1 : -1;
            if (this.controls.left) this.angle += 0.03 * flip;
            if (this.controls.right) this.angle -= 0.03 * flip;
        }

        this.x -= Math.sin(this.angle) * this.speed;
        this.y -= Math.cos(this.angle) * this.speed;
    }

    draw(ctx, color = "blue", drawSensor = false) {
        if (this.damage) ctx.globalAlpha = 0.5;
        else ctx.globalAlpha = 1;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(-this.angle);

        // ✅ Draw centered, shake-free
        ctx.drawImage(
            this.imageCanvas,
            -this.imageCanvas.width / 2,
            -this.imageCanvas.height / 2,
            this.imageCanvas.width,
            this.imageCanvas.height
        );

        ctx.restore();
        ctx.globalAlpha = 1;

        if (this.sensor && drawSensor) {
            this.sensor.draw(ctx);
        }
    }
}
