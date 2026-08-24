import MainScene from "../scenes/mainScene";

function createHexagonPoints(r: number): Phaser.Geom.Point[] {
    const points: Phaser.Geom.Point[] = [];
    const R = r / Math.cos(Math.PI / 6);
    for (let k = 0; k < 6; k++) {
        const angle = Math.PI / 6 + (k * Math.PI) / 3;
        points.push(new Phaser.Geom.Point(R + R * Math.cos(angle), R + R * Math.sin(angle)));
    }
    return points;
}

export default class Block extends Phaser.GameObjects.Polygon {
    public readonly i: number;
    public readonly j: number;
    public readonly r: number;
    protected scene: MainScene;

    constructor(scene: MainScene, i: number, j: number, r: number) {
        let position = scene.getPosition(i, j);
        let points = createHexagonPoints(r);
        let colors = scene.getThemeColors();
        super(scene, position.x, position.y, points, colors.blockNormal, 1);
        this.i = i;
        this.j = j;
        this.r = r;
        this.isStroked = true;
        this.lineWidth = 3;
        this.isWall = false;

        this.setInteractive();
        this.on("pointerdown", () => {
            this.emit("player_click", this.i, this.j);
        });
    }

    private _isWall: boolean;

    get isWall(): boolean {
        return this._isWall;
    }

    set isWall(value: boolean) {
        this._isWall = value;
        this.updateColor();
    }

    public updateColor() {
        let colors = this.scene.getThemeColors();
        if (this._isWall) {
            this.fillColor = colors.blockWall;
            this.strokeColor = colors.blockWallStroke;
        } else {
            this.fillColor = colors.blockNormal;
            this.strokeColor = colors.blockNormalStroke;
        }
    }
}
