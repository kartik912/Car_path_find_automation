// Road

const carCanvas = document.getElementById("carCanvas");
carCanvas.width = 200;

const networkCanvas = document.getElementById("networkCanvas");
networkCanvas.width = 300;
console.log("main.js loaded");

// Car
const carCtx = carCanvas.getContext("2d");
const networkCtx = networkCanvas.getContext("2d");

const road = new Road(carCanvas.width/2, carCanvas.width*0.9);

const N = 100;
let cars = generateCars(N);
let bestCar = cars[0];

// evolution & runtime bookkeeping
let generation = 0;
let bestOverallY = Infinity;
const FOLLOW_TICK_LIMIT = 30; // frames considered as following
const MAX_FRAMES = 10000; // safety reset
let frameCounter = 0;

if (localStorage.getItem("bestBrain")) {
    for (let i = 0; i < cars.length; i++) {
        cars[i].brain = JSON.parse(
            localStorage.getItem("bestBrain"));
        if (i != 0) {
            NeuralNetwork.mutate(cars[i].brain, 0.2);
        }
    }
}
const traffic = [
    new Car(road.getLaneCenter(1),-100,30,50,"DUMMY",2),
    new Car(road.getLaneCenter(0),-300,30,50,"DUMMY",2),
    new Car(road.getLaneCenter(2),-300,30,50,"DUMMY",2),
    new Car(road.getLaneCenter(0),-500,30,50,"DUMMY",2),
    new Car(road.getLaneCenter(1),-500,30,50,"DUMMY",2),
    new Car(road.getLaneCenter(1),-700,30,50,"DUMMY",2),
    new Car(road.getLaneCenter(2),-700,30,50,"DUMMY",2)

];
// car.draw(ctx);

updateStats();
animate();

function save(){
    localStorage.setItem("bestBrain",
        JSON.stringify(bestCar.brain));
}

function discard(){
    localStorage.removeItem("bestBrain");
}

function autoSaveIfBetter(car) {
    if (!car) return;
    // only save if car is not flagged as following and improved bestOverallY
    if (car.followingTicks <= FOLLOW_TICK_LIMIT && car.y < bestOverallY - 1) {
        save();
        bestOverallY = car.y;
        console.log(`✅ New best saved. generation=${generation}, y=${car.y.toFixed(2)}`);
        updateStats();
    }
}

function nextGeneration() {
    generation++;
    // try to pick best candidate that isn't following traffic
    const candidates = cars.filter(c => c.followingTicks <= FOLLOW_TICK_LIMIT);
    let candidate = null;
    if (candidates.length > 0) {
        candidate = candidates.reduce((a,b)=> a.y < b.y ? a : b);
    } else {
        candidate = cars.reduce((a,b)=> a.y < b.y ? a : b);
    }
    if (candidate && (!localStorage.getItem("bestBrain") || candidate.y < bestOverallY)) {
        localStorage.setItem("bestBrain", JSON.stringify(candidate.brain));
        bestOverallY = candidate.y;
    }

    // recreate population using the saved best brain
    cars = generateCars(N);
    const saved = localStorage.getItem("bestBrain");
    if (saved) {
        for (let i = 0; i < cars.length; i++) {
            cars[i].brain = JSON.parse(saved);
            if (i != 0) {
                NeuralNetwork.mutate(cars[i].brain, 0.2);
            }
        }
    }
    frameCounter = 0;
    bestCar = cars[0];
    updateStats();
}

function updateStats() {
    const el = document.getElementById("stats");
    if (!el) return;
    el.innerText = `Generation: ${generation}  Best Y: ${isFinite(bestOverallY) ? bestOverallY.toFixed(1) : "-"}`;
}

function generateCars(N){   
    const cars = [];
    for(let i=1; i<=N; i++){
        cars.push(new Car(road.getLaneCenter(1),100,30,50,"AI"));
    }
    return cars;
}

function animate(){
    try {
        frameCounter++;
        // make sure canvases have proper heights
        carCanvas.height = window.innerHeight;
        networkCanvas.height = window.innerHeight;

        // Update traffic lights
        road.updateTrafficLights();

        for(let i=0; i<traffic.length; i++){
            traffic[i].update(road.borders, []);
        }
        for(let i=0; i<cars.length; i++){
            cars[i].update(road.borders, traffic, road.trafficLights);
        }

    // choose the best car excluding ones that are clearly following traffic
    const candidates = cars.filter(c => c.followingTicks <= FOLLOW_TICK_LIMIT);
    if (candidates.length > 0) {
        bestCar = candidates.reduce((a,b) => a.y < b.y ? a : b);
    } else {
        bestCar = cars.reduce((a,b) => a.y < b.y ? a : b);
    }

    // auto-save if improved and not following
    autoSaveIfBetter(bestCar);


    carCtx.save();
    carCtx.translate(0, -bestCar.y+carCanvas.height*0.7);

    road.draw(carCtx);
    for(let i=0; i<traffic.length; i++){
        traffic[i].draw(carCtx, "red");
    }
    carCtx.globalAlpha = 0.2;
    for(let i=0; i<cars.length; i++){
        cars[i].draw(carCtx, "blue");
    }
    carCtx.globalAlpha = 1;
    bestCar.draw(carCtx, "blue", true);
    carCtx.restore();

    // draw brain of best car
    networkCtx.clearRect(0,0,networkCanvas.width, networkCanvas.height);
    Visualizer.drawNetwork(networkCtx, bestCar.brain);

    if (frameCounter % 10 === 0) updateStats();

    // if everyone is dead or we've run too long, start next generation
    const alive = cars.some(c => !c.damage);
    if (!alive || frameCounter > MAX_FRAMES) {
        console.log('Generation reset: alive=', alive, 'frame=', frameCounter);
        nextGeneration();
    }

        // update small debug box
        const dbg = document.getElementById('debug');
        if (dbg && frameCounter % 10 === 0) {
            dbg.innerText = `Frame: ${frameCounter}  Alive: ${alive ? 'yes' : 'no'}  Gen: ${generation}`;
        }

    } catch (err) {
        console.error('Error in animate:', err);
    }

    requestAnimationFrame(animate);
}