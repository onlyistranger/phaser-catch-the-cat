import MainScene from "../scenes/mainScene";
import _ from "../i18n";

export default class ResetButton extends Phaser.GameObjects.Text {
    constructor(scene: MainScene) {
        super(scene, 0, 0, _("重置"), {});
        this.setColor(scene.getThemeColors().textColor);
        let r = scene.r;
        this.setFontSize(r * 0.85);
        this.setPadding(r * 0.4, r * 0.2, r * 0.4, r * 0.2);
        this.setPosition(r * 0.4, scene.game.canvas.height - r * 0.2);
        this.setOrigin(0, 1);
        this.setInteractive({ useHandCursor: true });
    }
}

