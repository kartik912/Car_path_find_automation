class TrafficLight {
    constructor(x, y, laneIndex, roadWidth, laneCount) {
        this.x = x;
        this.y = y;
        this.laneIndex = laneIndex;
        this.roadWidth = roadWidth;
        this.laneCount = laneCount;

        // Traffic light states
        this.state = "red"; // "red", "yellow", "green"
        this.stateTimer = 0;
        this.redDuration = 120;      // 120 frames (~2 seconds at 60fps)
        this.greenDuration = 150;    // 150 frames (~2.5 seconds)
        this.yellowDuration = 30;    // 30 frames (~0.5 seconds)

        this.size = 20;
        this.cycleStartTime = 0;
    }

    update() {
        this.stateTimer++;

        // Cycle through states
        if (this.state === "red" && this.stateTimer >= this.redDuration) {
            this.state = "green";
            this.stateTimer = 0;
        } else if (this.state === "green" && this.stateTimer >= this.greenDuration) {
            this.state = "yellow";
            this.stateTimer = 0;
        } else if (this.state === "yellow" && this.stateTimer >= this.yellowDuration) {
            this.state = "red";
            this.stateTimer = 0;
        }
    }

    // Check if a car should stop at this traffic light
    shouldStop(carY, stopDistance = 80) {
        // Only apply in the car's lane
        const laneWidth = this.roadWidth / this.laneCount;
        const laneLeft = -this.roadWidth / 2 + this.laneIndex * laneWidth;
        const laneRight = laneLeft + laneWidth;

        // Check if car is in the correct lane and approaching the light
        if (this.state === "red" && 
            carY > this.y - stopDistance && 
            carY < this.y + stopDistance) {
            return true;
        }
        return false;
    }

    draw(ctx) {
        // Determine color based on state
        let color;
        switch (this.state) {
            case "red":
                color = "#FF0000";
                break;
            case "yellow":
                color = "#FFFF00";
                break;
            case "green":
                color = "#00FF00";
                break;
            default:
                color = "#808080";
        }

        // Draw traffic light pole
        ctx.fillStyle = "#333333";
        ctx.fillRect(this.x - 3, this.y - 50, 6, 50);

        // Draw traffic light housing
        ctx.fillStyle = "#000000";
        ctx.fillRect(this.x - 20, this.y - 60, 40, 60);

        // Draw colored light
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(this.x, this.y - 40, this.size, 0, Math.PI * 2);
        ctx.fill();

        // Draw light outline
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y - 40, this.size, 0, Math.PI * 2);
        ctx.stroke();
    }
}
