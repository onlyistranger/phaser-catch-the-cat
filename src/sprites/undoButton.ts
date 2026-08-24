import MainScene from "../scenes/mainScene";
import _ from "../i18n";

export default class UndoButton extends Phaser.GameObjects.Text {
    constructor(scene: MainScene) {
        super(scene, 0, 0, _("回退"), {});
        this.setColor(scene.getThemeColors().textColor);
        let r = scene.r;
        this.setFontSize(r * 0.85);
        this.setPadding(r * 0.4, r * 0.2, r * 0.4, r * 0.2);
        this.setPosition(scene.game.canvas.width * 0.28, scene.game.canvas.height - r * 0.2);
        this.setOrigin(0, 1);
        this.setInteractive({ useHandCursor: true });
    }
}

