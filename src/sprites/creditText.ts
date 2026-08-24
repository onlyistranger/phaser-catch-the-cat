import MainScene from "../scenes/mainScene";

export default class CreditText extends Phaser.GameObjects.Text {
    constructor(scene: MainScene) {
        super(scene, 0, 0, "", {});
        this.setColor(scene.getThemeColors().textColor);
        let r = scene.r;
        this.setFontSize(r * 0.75);
        this.setPadding(r * 0.4, r * 0.2, r * 0.4, r * 0.2);
        this.setPosition(scene.game.canvas.width - r * 0.4, scene.game.canvas.height - r * 0.2);
        this.setOrigin(1, 1);
        this.setText(scene.game.myConfig.credit);
    }
}

