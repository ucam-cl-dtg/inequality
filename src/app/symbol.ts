import { Widget, Rect } from './widget.ts'

export
class Symbol extends Widget {
	letter = "NULL";
	bounds: Rect = null;

	get dockingPoint(): p5.Vector {
		var p = this.p.createVector(this.position.x, this.boundingBox().y + this.boundingBox().h/2);
		return p;
	}

	constructor(p: any, private s: any, letter: string) {
		super(p, s);
		this.letter = letter;

		this.dockingPoints = _.map(_.range(0, 3), (n) => { return this.defaultDockingPointForIndex(n); });
		this.dockingPointScales = [1.0, 0.6, 0.6];
		this.dockingPointTypes = ['operator', 'exponent', 'subscript'];
		this.docksTo = ['symbol', 'operator', 'exponent', 'subscript'];
		this.children = [null, null, null];
	}

	defaultDockingPointForIndex(index: number): p5.Vector {
		var box = this.boundingBox();
		switch(index) {
			case 0:
				return this.p.createVector(box.w, -box.h/2);
			case 1:
				return this.p.createVector(box.w * 3/4, -box.h * 5/4);
			case 2:
				return this.p.createVector(box.w * 3/4,  box.h * 1/4);
		}
	}

	boundingBox(): Rect {
		var box = this.s.font.textBounds(this.letter, 0, 1000, this.scale * 120);
		this.bounds = new Rect(-box.w/2, box.y-1000, box.w, box.h);
		return new Rect(this.position.x + this.bounds.x, this.position.y + this.bounds.y, this.bounds.w, this.bounds.h);
	}

	draw() {
		super.draw();

		this.p.fill(0).strokeWeight(0).noStroke();

		this.p.textFont(this.s.font)
			.textSize(120 * this.scale)
			.textAlign(this.p.CENTER, this.p.BASELINE)
			.text(this.letter, this.position.x, this.position.y);
		this.p.strokeWeight(1);

		if(window.location.hash === "#debug") {
			this.p.stroke(255, 0, 0).noFill();
			this.p.ellipse(this.position.x, this.position.y, 10, 10);
			this.p.ellipse(this.position.x, this.position.y, 5, 5);

			this.p.stroke(0, 0, 255).noFill();
			this.p.ellipse(this.dockingPoint.x, this.dockingPoint.y, 10, 10);
			this.p.ellipse(this.dockingPoint.x, this.dockingPoint.y, 5, 5);
		}
	}
}
