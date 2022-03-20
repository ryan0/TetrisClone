const canvas = {
    ctx: null,
    width: 0,
    height: 0
}

const musicAudio = new Audio("./assets/tetris-music.mp3");
const clearAudio = new Audio("./assets/tetris-clear.wav");
const fallAudio = new Audio("./assets/tetris-fall.wav");

let gameRunning = false;

const Empty = 0;
const CyanBrick = 1;
const BlueBrick = 2;
const OrangeBrick = 3;
const YellowBrick = 4;
const GreenBrick = 5;
const purpleBrick = 6;
const RedBrick = 7;               //cyan     blue       orange     yellow     green      purple     red
const brickFillStyles = ["black", "#00F0F0", "#0000F0", "#F0A000", "#F0F000", "#00F000", "#A000F0", "#F00000"];
const grid = Array(10).fill(0).map(() => Array(20).fill(0));
let brickSize = 0;

let currBlock;
let stashedBlock;

let softDrop = false;
let canHardDrop = true;

let gameSpeed = 500
let lastRender = 0;

function initialize() {
    let target = document.getElementById("canvas");
    canvas.ctx = target.getContext("2d")
    canvas.width = target.width;
    canvas.height = target.height;
    brickSize = canvas.width / 10;
}

function start() {
    if(!gameRunning) {
        console.log("start");
        gameRunning = true;
        window.requestAnimationFrame(gameLoop);
        document.getElementById("play-button").classList.add('hide');
        document.getElementById("mobile-interface").classList.remove('hide');
        musicAudio.loop = true;
        musicAudio.play()
    }
}

function gameLoop(timestamp) {
    if(lastRender === 0) {
        lastRender = timestamp;
    }
    let delta = timestamp - lastRender;
    currBlock.update(delta);
    draw();
    if(gameRunning) {
        lastRender = timestamp;
        window.requestAnimationFrame(gameLoop);
    }
}

function draw() {
    canvas.ctx.clearRect(0, 0, canvas.width, canvas.height)
    drawGrid();
    currBlock.draw();
    if(stashedBlock) {
        stashedBlock.drawInStash();
    }
    canvas.ctx.fillStyle = "red";
}

function drawGrid() {
    for(let x = 0; x < 10; x++) {
        for(let y = 0; y < 20; y++) {
            canvas.ctx.fillStyle = brickFillStyles[grid[x][y]];
            canvas.ctx.fillRect(x * brickSize, y * brickSize, brickSize, brickSize);
        }
    }
}

document.onkeydown = function (e) {
    if(e.key === 'd') {
        currBlock.shiftRightIfValid();
    } else if (e.key === 'a') {
        currBlock.shiftLeftIfValid();
    } else if (e.key === 's') {
        console.log('soft drop on');
        softDrop = true;
    } else if (e.key === 'w' && canHardDrop) {
        currBlock.hardDrop();
        canHardDrop = false
    } else if (e.key === 'ArrowRight') {
        currBlock.rotateRightIfValid();
    } else if (e.key === 'ArrowLeft') {
        currBlock.rotateLeftIfValid();
    } else if (e.key === ' ') {
        stashTetremino();
    }
}
document.onkeyup = function (e) {
    if(e.key === 's') {
        console.log('soft drop off');
        softDrop = false;
    } else if (e.key === 'w') {
        console.log('can hard drop');
        canHardDrop = true;
    }
}
function touchStartRotateLeft() {
    currBlock.rotateLeftIfValid();
}
function touchStartRotateRight() {
    currBlock.rotateRightIfValid();
}
function touchStartShiftLeft() {
    currBlock.shiftLeftIfValid();
}
function touchStartShiftRight() {
    currBlock.shiftRightIfValid();
}
function touchStartStash() {
    stashTetremino();
}
function touchStartHardDrop() {
    currBlock.hardDrop();
}

class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y
    }
    isWithinGrid() {
        let withinX = this.x >= 0 && this.x < 10;
        let withinY = this.y >= 0 && this.y < 20;
        return withinX && withinY;
    }
}

function clearRows() {
    let rowsCleared = 0;
    for(let y = 0; y < grid[0].length;) {
        let clearRow = true;
        for(let x = 0; x < grid.length; x++) {
            if(grid[x][y] === 0) {
                clearRow = false;
            }
        }
        if(clearRow) {
            rowsCleared++;
            for(let clearX = 0; clearX < grid.length; clearX++) {
                for(let clearY = y; clearY > 0; clearY--) {
                    grid[clearX][clearY] = grid[clearX][clearY - 1];
                }
            }
        } else {
            y++;
        }
    }

    if(rowsCleared > 0) {
        clearAudio.play();
    } else {
        fallAudio.play();
    }
}


function stashTetremino() {
    if(!stashedBlock) {
        stashedBlock = currBlock;
        stashedBlock.position = new Point(3, 0);
        stashedBlock.previouslyStashed = true;
        currBlock = genNewTetremino();
    } else if(!currBlock.previouslyStashed) {
        let temp = stashedBlock;
        stashedBlock = currBlock;
        stashedBlock.position = new Point(3, 0);
        stashedBlock.previouslyStashed = true;
        currBlock = temp;
    }
}

class Tetremino {
    constructor(brickType, configuration, position) {
        this.brickType = brickType;
        this.rotation = 0;
        this.position = position;
        this.configuration = configuration;
        this.previouslyStashed = false;
        this.deltaSinceUpdate = 0;
    }

    draw() {
        let shape = this.configuration[this.rotation];
        for(let brick of shape) {
            let brickPosition = new Point(brick.x + this.position.x, brick.y + this.position.y);
            canvas.ctx.fillStyle = brickFillStyles[this.brickType];
            canvas.ctx.fillRect(brickPosition.x * brickSize, brickPosition.y * brickSize, brickSize, brickSize);
        }
    }

    drawInStash() {
        let shape = this.configuration[this.rotation];
        for(let brick of shape) {
            canvas.ctx.fillStyle = brickFillStyles[this.brickType];
            canvas.ctx.fillRect(brick.x * (brickSize/2), brick.y * (brickSize/2), brickSize/2, brickSize/2);
        }
    }

    shiftRight() {
        this.position.x += 1;
    }
    shiftRightIfValid() {
        this.shiftRight();
        if(!this.isValidPosition()) {
            this.shiftLeft();
        }
    }
    shiftLeft() {
        this.position.x -= 1
    }
    shiftLeftIfValid() {
        this.shiftLeft();
        if(!this.isValidPosition()) {
            this.shiftRight();
        }
    }


    rotateRight() {
        this.rotation += 1;
        if (this.rotation >= this.configuration.length) {
            this.rotation = 0;
        }
    }
    rotateRightIfValid() {
        this.rotateRight();
        if(!this.isValidPosition()) {
            this.rotateLeft();
        }
    }
    rotateLeft() {
        this.rotation -= 1;
        if (this.rotation < 0) {
            this.rotation = this.configuration.length - 1;
        }
    }
    rotateLeftIfValid() {
        this.rotateLeft();
        if(!this.isValidPosition()) {
            this.rotateRight();
        }
    }

    isGrounded() {
        let shape = this.configuration[this.rotation];
        for(let brick of shape) {
            let brickPosition = new Point(brick.x + this.position.x, brick.y + this.position.y);
            if(brickPosition.isWithinGrid()) {
                if(brickPosition.y === 19) {
                    return true;
                } else if(grid[brickPosition.x][brickPosition.y + 1] !== 0) {
                    return true;
                }
            }
        }
        return false;
    }

    isValidPosition() {
        let shape = this.configuration[this.rotation];
        for(let brick of shape) {
            let brickPosition = new Point(brick.x + this.position.x, brick.y + this.position.y);
            if(!brickPosition.isWithinGrid()) {
                return false;
            } else if(grid[brickPosition.x][brickPosition.y] !== 0) {
                return false;
            }
        }
        return true;
    }

    hardDrop() {
        while(this.isGrounded() === false) {
            this.position.y += 1;
        }
        this.attachToGrid();
        clearRows();
        currBlock = genNewTetremino();
    }

    attachToGrid() {
        let shape = this.configuration[this.rotation];
        for(let brick of shape) {
            let brickPosition = new Point(brick.x + this.position.x, brick.y + this.position.y);
            if(brickPosition.isWithinGrid()) {
                grid[brickPosition.x][brickPosition.y] = this.brickType;
            }
        }
    }

    update(delta) {
        this.deltaSinceUpdate += delta;

        let dropSpeed = softDrop ? gameSpeed / 4 : gameSpeed;
        if(this.deltaSinceUpdate > dropSpeed) {
            this.deltaSinceUpdate = 0;
            if(this.isGrounded()) {
                this.attachToGrid();
                clearRows();
                currBlock = genNewTetremino();
            } else {
                this.position.y += 1;
            }
        }
    }
}

const I_BLOCK_CONFIG = [
    [new Point(0, 1), new Point(1, 1), new Point(2, 1), new Point(3, 1)],
    [new Point(2, 0), new Point(2, 1), new Point(2, 2), new Point(2, 3)],
    [new Point(0, 2), new Point(1, 2), new Point(2, 2), new Point(3, 2)],
    [new Point(1, 0), new Point(1, 1), new Point(1, 2), new Point(1, 3)],
];
const J_BLOCK_CONFIG = [
    [new Point(0, 0), new Point(0, 1), new Point(1, 1), new Point(2, 1)],
    [new Point(1, 0), new Point(1, 1), new Point(1, 2), new Point(2, 0)],
    [new Point(0, 1), new Point(1, 1), new Point(2, 1), new Point(2, 2)],
    [new Point(0, 2), new Point(1, 0), new Point(1, 1), new Point(1, 2)],
];
const L_BLOCK_CONFIG = [
    [new Point(0, 1), new Point(1, 1), new Point(2, 1), new Point(2, 0)],
    [new Point(1, 0), new Point(1, 1), new Point(1, 2), new Point(2, 2)],
    [new Point(0, 1), new Point(0, 2), new Point(1, 1), new Point(2, 1)],
    [new Point(0, 0), new Point(1, 0), new Point(1, 1), new Point(1, 2)],
];
const O_BLOCK_CONFIG = [
    [new Point(1, 0), new Point(2, 0), new Point(1, 1), new Point(2, 1)],
];
const S_BLOCK_CONFIG = [
    [new Point(0, 1), new Point(1, 0), new Point(1, 1), new Point(2, 0)],
    [new Point(1, 0), new Point(1, 1), new Point(2, 1), new Point(2, 2)],
    [new Point(0, 2), new Point(1, 2), new Point(1, 1), new Point(2, 1)],
    [new Point(0, 0), new Point(0, 1), new Point(1, 1), new Point(1, 2)],
];
const T_BLOCK_CONFIG = [
    [new Point(0, 1), new Point(1, 0), new Point(1, 1), new Point(2, 1)],
    [new Point(1, 0), new Point(1, 1), new Point(1, 2), new Point(2, 1)],
    [new Point(0, 1), new Point(1, 1), new Point(1, 2), new Point(2, 1)],
    [new Point(0, 1), new Point(1, 0), new Point(1, 1), new Point(1, 2)],
];
const Z_BLOCK_CONFIG = [
    [new Point(0, 0), new Point(1, 0), new Point(1, 1), new Point(2, 1)],
    [new Point(1, 2), new Point(1, 1), new Point(2, 1), new Point(2, 0)],
    [new Point(0, 1), new Point(1, 1), new Point(1, 2), new Point(2, 2)],
    [new Point(0, 2), new Point(0, 1), new Point(1, 1), new Point(1, 0)],
];
const TETREMINO_CONFIG_MAP = [I_BLOCK_CONFIG, J_BLOCK_CONFIG, L_BLOCK_CONFIG, O_BLOCK_CONFIG, S_BLOCK_CONFIG, T_BLOCK_CONFIG, Z_BLOCK_CONFIG];

function genNewTetremino() {
    let rand = Math.floor(Math.random() * 7);
    let brickType = rand + 1;
    let configuration = TETREMINO_CONFIG_MAP[rand];
    let position = new Point(3, 0);
    return new Tetremino(brickType, configuration, position);
}

currBlock = genNewTetremino();
