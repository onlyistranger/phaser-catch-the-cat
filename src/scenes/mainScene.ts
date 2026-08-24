import data from "../data";
import CatchTheCatGame from "../game";
import Cat from "../sprites/cat";
import Block from "../sprites/block";
import ResetButton from "../sprites/resetButton";
import UndoButton from "../sprites/undoButton";
import StatusBar from "../sprites/statusBar";
import CreditText from "../sprites/creditText";
import _ from "../i18n";
import nearestSolver, { getOptimalPath } from "../solvers/nearestSolver";
import RawSVGFile from "../lib/RawSVGFile";

declare type NeighbourData = {
    i?: number,
    j?: number,
    x?: number,
    y?: number,
}

declare type RecordCoord = {
    cat: {i:number, j:number}[],
    wall: {i:number, j:number}[],
}

enum GameState {
    PLAYING = "playing",
    WIN = "win",
    LOSE = "lose",
}

export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
    backgroundColor: number;
    blockNormal: number;
    blockNormalStroke: number;
    blockWall: number;
    blockWallStroke: number;
    textColor: string;
}

export const THEMES: Record<ThemeMode, ThemeColors> = {
    light: {
        backgroundColor: 0xf8fafc,
        blockNormal: 0xdbeafe,
        blockNormalStroke: 0x3b82f6,
        blockWall: 0x1e3a8a,
        blockWallStroke: 0x172554,
        textColor: "#1e293b",
    },
    dark: {
        backgroundColor: 0x0f172a,
        blockNormal: 0x1e293b,
        blockNormalStroke: 0x475569,
        blockWall: 0x38bdf8,
        blockWallStroke: 0xbae6fd,
        textColor: "#f8fafc",
    },
};

export default class MainScene extends Phaser.Scene {
    public readonly w: number;
    public readonly h: number;
    public readonly r: number;
    public readonly initialWallCount: number;
    public readonly dx: number;
    public readonly dy: number;
    public game: CatchTheCatGame;
    public currentTheme: ThemeMode = "light";
    public isDebug: boolean = false;
    public debugGraphics: Phaser.GameObjects.Graphics;
    private recordCoord: RecordCoord;

    constructor(w: number, h: number, r: number, initialWallCount: number) {
        super({
            key: "MainScene",
        });
        this.w = w;
        this.h = h;
        this.r = r;
        this.initialWallCount = initialWallCount;
        this.dx = this.r * 2;
        this.dy = this.r * Math.sqrt(3);
    }

    get blocks(): Block[][] {
        return this.data.get("blocks");
    }

    set blocks(value: Block[][]) {
        this.data.set("blocks", value);
    }

    get blocksData(): boolean[][] {
        let result: boolean[][] = [];
        this.blocks.forEach((column, i) => {
            result[i] = [];
            column.forEach((block, j) => {
                result[i][j] = block.isWall;
            });
        });
        return result;
    }

    get cat(): Cat {
        return this.data.get("cat");
    }

    set cat(value: Cat) {
        this.data.set("cat", value);
    }

    get statusBar(): Phaser.GameObjects.Text {
        return this.data.get("status_bar");
    }

    set statusBar(value: Phaser.GameObjects.Text) {
        this.data.set("status_bar", value);
    }

    get creditText(): CreditText {
        return this.data.get("credit_text");
    }

    set creditText(value: CreditText) {
        this.data.set("credit_text", value);
    }

    get resetButton(): ResetButton {
        return this.data.get("reset_button");
    }

    set resetButton(value: ResetButton) {
        this.data.set("reset_button", value);
    }

    get undoButton(): UndoButton {
        return this.data.get("undo_button");
    }

    set undoButton(value: UndoButton) {
        this.data.set("undo_button", value);
    }

    public getThemeColors(): ThemeColors {
        return THEMES[this.currentTheme] || THEMES.light;
    }

    public setTheme(theme: ThemeMode): void {
        this.currentTheme = theme;
        const colors = this.getThemeColors();
        this.cameras.main.setBackgroundColor(colors.backgroundColor);
        if (this.blocks) {
            this.blocks.forEach(column => {
                column.forEach(block => {
                    block.updateColor();
                });
            });
        }
        if (this.statusBar) {
            this.statusBar.setColor(colors.textColor);
        }
        if (this.creditText) {
            this.creditText.setColor(colors.textColor);
        }
        if (this.resetButton) {
            this.resetButton.setColor(colors.textColor);
        }
        if (this.undoButton) {
            this.undoButton.setColor(colors.textColor);
        }
        this.drawDebugRoute();
    }

    get state(): GameState {
        return this.data.get("state");
    }

    set state(value: GameState) {
        switch (value) {
            case GameState.PLAYING:
                break;
            case GameState.LOSE:
                this.setStatusText(_("猫已经跑到地图边缘了，你输了"));
                break;
            case GameState.WIN:
                this.setStatusText(_("猫已经无路可走，你赢了"));
                break;
            default:
                return;
        }
        this.data.set("state", value);
        this.drawDebugRoute();
    }

    static getNeighbours(i: number, j: number): NeighbourData[] {
        let left = {i: i - 1, j: j};
        let right = {i: i + 1, j: j};
        let top_left;
        let top_right;
        let bottom_left;
        let bottom_right;
        if ((j & 1) === 0) {
            top_left = {i: i - 1, j: j - 1};
            top_right = {i: i, j: j - 1};
            bottom_left = {i: i - 1, j: j + 1};
            bottom_right = {i: i, j: j + 1};
        } else {
            top_left = {i: i, j: j - 1};
            top_right = {i: i + 1, j: j - 1};
            bottom_left = {i: i, j: j + 1};
            bottom_right = {i: i + 1, j: j + 1};
        }
        let neighbours = [];
        neighbours[0] = left;
        neighbours[1] = top_left;
        neighbours[2] = top_right;
        neighbours[3] = right;
        neighbours[4] = bottom_right;
        neighbours[5] = bottom_left;
        return neighbours;
    }

    preload(): void {
        let textureScale = this.r / data.catStepLength;
        for (let key in data.textures) {
            this.load.addFile(new RawSVGFile(this.load, key, data.textures[key], {scale: textureScale}));
        }
    }

    create(): void {
        if (this.game.myConfig && this.game.myConfig.theme) {
            this.currentTheme = this.game.myConfig.theme as ThemeMode;
        }
        this.cameras.main.setBackgroundColor(this.getThemeColors().backgroundColor);
        this.createAnimations();
        this.createBlocks();
        this.createCat();
        this.debugGraphics = this.add.graphics();
        this.debugGraphics.setDepth(10);
        this.createStatusText();
        this.createResetButton();
        this.createUndoButton();
        this.createCreditText();
        this.reset();
        if (this.game.solver) {
            this.cat.solver = this.game.solver;
        }
    }

    public setDebug(enabled: boolean): void {
        this.isDebug = enabled;
        this.drawDebugRoute();
    }

    public drawDebugRoute(): void {
        if (!this.debugGraphics) return;
        this.debugGraphics.clear();
        if (!this.isDebug || this.state !== GameState.PLAYING) {
            return;
        }

        const path = getOptimalPath(this.blocksData, this.cat.i, this.cat.j);
        if (path.length <= 1) {
            return;
        }

        // Draw connecting route line
        this.debugGraphics.lineStyle(4, 0xff5722, 0.85);
        this.debugGraphics.beginPath();
        for (let idx = 0; idx < path.length; idx++) {
            const pos = this.getPosition(path[idx].i, path[idx].j);
            if (idx === 0) {
                this.debugGraphics.moveTo(pos.x, pos.y);
            } else {
                this.debugGraphics.lineTo(pos.x, pos.y);
            }
        }
        this.debugGraphics.strokePath();

        // Draw route waypoints
        for (let idx = 1; idx < path.length; idx++) {
            const pos = this.getPosition(path[idx].i, path[idx].j);
            const isDestination = (idx === path.length - 1);
            this.debugGraphics.fillStyle(isDestination ? 0x4caf50 : 0xff9800, 0.95);
            this.debugGraphics.fillCircle(pos.x, pos.y, isDestination ? this.r * 0.38 : this.r * 0.25);
            this.debugGraphics.fillStyle(0xffffff, 1);
            this.debugGraphics.fillCircle(pos.x, pos.y, this.r * 0.1);
        }
    }

    getPosition(i: number, j: number): NeighbourData {
        return {
            x: this.r * 0.5 + ((j & 1) === 0 ? this.r : this.dx) + i * this.dx,
            y: this.r * 1.8 + j * this.dy,
        };
    }

    getBlock(i: number, j: number): Block | null {
        if (!(i >= 0 && i < this.w && j >= 0 && j < this.h)) {
            return null;
        }
        return this.blocks[i][j];
    }

    playerClick(i: number, j: number): boolean {
        if (this.cat.anims.isPlaying) {
            this.cat.anims.stop();
        }
        if (this.state !== GameState.PLAYING) {
            this.setStatusText(_("游戏已经结束，重新开局"));
            this.reset();
            return false;
        }
        let block = this.getBlock(i, j);
        if (!block) {
            this.setStatusText(_("代码错误，当前位置不存在"));
            return false;
        }
        if (block.isWall) {
            this.setStatusText(_("点击位置已经是墙了，禁止点击"));
            return false;
        }
        if (this.cat.i === i && this.cat.j === j) {
            this.setStatusText(_("点击位置是猫当前位置，禁止点击"));
            return false;
        }
        block.isWall = true;
        if (this.cat.isCaught()) {
            this.setStatusText(_("猫已经无路可走，你赢了"));
            this.state = GameState.WIN;
            return false;
        }

        this.recordCoord.cat.push({i: this.cat.i, j:this.cat.j});
        this.recordCoord.wall.push({i, j});

        this.setStatusText(_("您点击了 ") + `(${i}, ${j})`);
        let result = this.cat.step();
        if (!result) {
            this.setStatusText(_("猫认输，你赢了！"));
            this.state = GameState.WIN;
        }
        this.drawDebugRoute();
        return true;
    }

    reset() {
        this.cat.reset();
        this.resetBlocks();
        this.randomWall();

        this.recordCoord = {
            cat: [],
            wall: []
        };
        this.state = GameState.PLAYING;
        this.setStatusText(_("点击小圆点，围住小猫"));
        this.drawDebugRoute();
    }

    undo() {
        if (this.recordCoord.cat.length) {
            if (this.state !== GameState.PLAYING) {
                this.setStatusText(_("游戏已经结束，重新开局"));
                this.reset();
            } else {
                const catCoord = this.recordCoord.cat.pop();
                const {i, j} = this.recordCoord.wall.pop();

                this.cat.undo(catCoord.i, catCoord.j);
                this.getBlock(i, j).isWall = false;
                this.drawDebugRoute();
            }
        } else {
            this.setStatusText(_("无路可退！！！"));
        }
    }
    private setStatusText(message: string) {
        this.statusBar.setText(message);
    }

    private createAnimations(): void {
        data.animations.forEach(animation => {
            let frames: AnimationFrameConfig[] = [];
            animation.textures.forEach(texture => {
                frames.push({
                    key: texture,
                    frame: 0,
                });
            });
            this.anims.create({
                key: animation.name,
                frames: frames,
                frameRate: data.frameRate,
                repeat: animation.repeat,
            });
        });
    }

    private createBlocks(): void {
        let blocks = [];
        for (let i = 0; i < this.w; i++) {
            blocks[i] = [];
            for (let j = 0; j < this.h; j++) {
                let block = new Block(this, i, j, this.r);
                blocks[i][j] = block;
                this.add.existing(block);
                block.on("player_click", this.playerClick.bind(this));
            }
        }
        this.blocks = blocks;
    }

    private createCat(): void {
        let cat = new Cat(this);
        cat.on("escaped", () => {
            this.state = GameState.LOSE;
        });
        cat.on("win", () => {
            this.state = GameState.WIN;
        });
        cat.solver = nearestSolver;
        this.cat = cat;
        this.add.existing(cat);
    }

    private createStatusText(): void {
        let statusBar = new StatusBar(this);
        this.statusBar = statusBar;
        this.add.existing(statusBar);
    }

    private createResetButton(): void {
        let resetButton = new ResetButton(this);
        this.resetButton = resetButton;
        this.add.existing(resetButton);
        resetButton.on("pointerup", () => {
            this.reset();
        });
    }

    private createUndoButton(): void {
        let undoButton = new UndoButton(this);
        this.undoButton = undoButton;
        this.add.existing(undoButton);
        undoButton.on("pointerup", () => {
            this.undo();
        });
    }

    private createCreditText(): void {
        let creditText = new CreditText(this);
        this.creditText = creditText;
        this.add.existing(creditText);
    }

    private resetBlocks() {
        this.blocks.forEach(blocks => {
            blocks.forEach(block => {
                block.isWall = false;
            });
        });
    }

    private randomWall() {
        const array = [];
        for (let j = 0; j < this.h; j++) {
            for (let i = 0; i < this.w; i++) {
                if (i !== this.cat.i || j !== this.cat.j) {
                    array.push(j * this.w + i);
                }
            }
        }
        for (let i = 0; i < array.length; i++) {
            if (i >= this.initialWallCount) {
                break;
            }
            // Shuffle array
            const j = i + Math.floor(Math.random() * (array.length - i));
            var temp = array[i];
            array[i] = array[j];
            array[j] = temp;
            // Set wall
            let wallI = array[i] % this.w;
            let wallJ = Math.floor(array[i] / this.w);
            this.getBlock(wallI, wallJ).isWall = true;
        }
    }
}
