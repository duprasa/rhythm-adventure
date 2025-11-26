import Phaser from 'phaser';

export class BeatManager extends Phaser.Events.EventEmitter {
    private bpm: number;
    private beatDuration: number; // ms per beat
    private accumulatedTime: number = 0;
    private totalBeats: number = 0;

    constructor(scene: Phaser.Scene, bpm: number) {
        super();
        this.bpm = bpm;
        this.beatDuration = 60000 / this.bpm;
    }

    public update(delta: number) {
        this.accumulatedTime += delta;

        if (this.accumulatedTime >= this.beatDuration) {
            this.accumulatedTime -= this.beatDuration;
            this.totalBeats++;
            this.emit('beat', this.totalBeats);
            this.emit('halfbeat', this.totalBeats * 2);
        } else if (this.accumulatedTime >= this.beatDuration / 2 && this.accumulatedTime - delta < this.beatDuration / 2) {
             this.emit('halfbeat', this.totalBeats * 2 + 1);
        }
    }

    public isBeat(tolerance: number): boolean {
        // Check distance to closest beat (either previous or next)
        const timeSinceLastBeat = this.accumulatedTime;
        const timeToNextBeat = this.beatDuration - this.accumulatedTime;
        
        return timeSinceLastBeat <= tolerance || timeToNextBeat <= tolerance;
    }

    public isHalfBeat(tolerance: number): boolean {
        // Half beat is at beatDuration / 2
        const halfBeatTime = this.beatDuration / 2;
        const diff = Math.abs(this.accumulatedTime - halfBeatTime);
        
        return diff <= tolerance || this.isBeat(tolerance);
    }

    public getBeatProgress(): number {
        return this.accumulatedTime / this.beatDuration;
    }

    public getBPM(): number {
        return this.bpm;
    }
    
    public getBeatDuration(): number {
        return this.beatDuration;
    }

    public getTotalBeats(): number {
        return this.totalBeats;
    }
}

