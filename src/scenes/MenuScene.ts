import Phaser from 'phaser';

export class MenuScene extends Phaser.Scene {
    constructor() {
        super('MenuScene');
    }

    create() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        this.add.text(width / 2, height / 3, 'RHYTHM ADVENTURE', {
            fontSize: '48px',
            color: '#ffffff'
        }).setOrigin(0.5);

        const startText = this.add.text(width / 2, height / 2, 'Press SPACE to Start', {
            fontSize: '24px',
            color: '#ffff00'
        }).setOrigin(0.5);

        this.tweens.add({
            targets: startText,
            alpha: 0.5,
            duration: 500,
            yoyo: true,
            repeat: -1
        });

        this.input.keyboard!.on('keydown-SPACE', () => {
            this.scene.start('MainScene');
        });
    }
}

