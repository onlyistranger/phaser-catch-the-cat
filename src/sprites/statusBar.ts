import MainScene from "../scenes/mainScene";

export default class StatusBar extends Phaser.GameObjects.Text {
    constructor(scene: MainScene) {
        super(scene, 0, 0, "", {});
        this.setColor(scene.getThemeColors().textColor);
        let r = scene.r;
        this.setFontSize(r * 0.85);
        if (scene.game.myConfig.statusBarAlign === "center") {
            this.setX(scene.game.canvas.width / 2);
            this.setOrigin(0.5, 0);
        }
        this.setPadding(r * 0.5, r * 0.3, r * 0.5, r * 0.3);
    }
}

