import { Widget, Rect } from './Widget.ts'
import {BinaryOperation} from "./BinaryOperation";
import { DockingPoint } from "./DockingPoint.ts";

export
class Symbol extends Widget {

    protected s: any;
    private letter: string;

	get typeAsString(): string {
		return "Symbol";
	}

	/**
	 * There's a thing with the baseline and all that... this sort-of fixes it.
	 *
	 * @returns {Vector} The position to which a Symbol is meant to be docked from.
	 */
	get dockingPoint(): p5.Vector {
		var box = this.s.font_it.textBounds("x", 0, 1000, this.scale * this.s.baseFontSize);
		var p = this.p.createVector(0, - box.h / 2);
		return p;
	}

	constructor(p:any, s:any, letter:string) {
        this.letter = letter;
        this.s = s;
		super(p, s);

		this.docksTo = ['symbol', 'operator', 'exponent', 'subscript'];
	}

	/**
	 * Generates all the docking points in one go and stores them in this.dockingPoints.
	 * A Symbol has three docking points:
	 *
	 * - _right_: Binary operation (addition, subtraction), Symbol (multiplication)
	 * - _superscript_: Exponent
	 * - _subscript_: Subscript (duh?)
	 */
    generateDockingPoints() {
        var box = this.boundingBox();
        var descent = this.position.y - (box.y + box.h);

        this.dockingPoints["right"] = new DockingPoint(this, this.p.createVector(box.w / 2 + this.s.mBox.w / 4, -this.s.xBox.h / 2), 1, "operator");
        this.dockingPoints["superscript"] = new DockingPoint(this, this.p.createVector(box.w / 2 + this.scale * 20, -(box.h + descent + this.scale * 20)), 0.75, "exponent");
        this.dockingPoints["subscript"] = new DockingPoint(this, this.p.createVector(box.w / 2 + this.scale * 20, this.scale * 20), 0.75, "subscript");
    }

    /**
	 * Generates the expression corresponding to this widget and its subtree.
	 *
	 * The `subscript` format is a special one for generating symbols that will work with the sympy checker. It squashes
	 * everything together, ignoring operations and all that jazz.
	 *
	 * @param format A string to specify the output format. Supports: latex, python, subscript.
	 * @returns {string} The expression in the specified format.
	 */
	getExpression(format: string): string {
		var expression = "";
		if (format == "latex") {
			expression = this.letter;
			if (this.dockingPoints["superscript"].child != null) {
				expression += "^{" + this.dockingPoints["superscript"].child.getExpression(format) + "}";
			}
			if (this.dockingPoints["subscript"].child != null) {
				expression += "_{" + this.dockingPoints["subscript"].child.getExpression(format) + "}";
			}
			if (this.dockingPoints["right"].child != null) {
				if (this.dockingPoints["right"].child instanceof BinaryOperation) {
					expression += this.dockingPoints["right"].child.getExpression(format);
				} else {
					// WARNING This assumes it's a Symbol, hence produces a multiplication
					expression += " " + this.dockingPoints["right"].child.getExpression(format);
				}
			}
		} else if (format == "python") {
			expression = "" + this.letter;
			if (this.dockingPoints["subscript"].child != null) {
				expression += this.dockingPoints["subscript"].child.getExpression("subscript");
			}
			if (this.dockingPoints["superscript"].child != null) {
				expression += "**(" + this.dockingPoints["superscript"].child.getExpression(format) + ")";
			}
			if (this.dockingPoints["right"].child != null) {
				if (this.dockingPoints["right"].child instanceof BinaryOperation) {
					expression += this.dockingPoints["right"].child.getExpression(format);
				} else {
					// WARNING This assumes it's a Symbol, hence produces a multiplication
					expression += "*" + this.dockingPoints["right"].child.getExpression(format);
				}
			}
		} else if (format == "subscript") {
			expression = "" + this.letter;
			if (this.dockingPoints["subscript"].child != null) {
				expression += this.dockingPoints["subscript"].child.getExpression(format);
			}
			if (this.dockingPoints["superscript"].child != null) {
				expression += this.dockingPoints["superscript"].child.getExpression(format);
			}
			if (this.dockingPoints["right"].child != null) {
				expression += this.dockingPoints["right"].child.getExpression(format);
			}
		}
		return expression;
	}

	properties(): Object {
		return {
			letter: this.letter
		};
	}

	/** Paints the widget on the canvas. */
	_draw() {
		this.p.fill(0).strokeWeight(0).noStroke();

		this.p.textFont(this.s.font_it)
			.textSize(this.s.baseFontSize * this.scale)
			.textAlign(this.p.CENTER, this.p.BASELINE)
			.text(this.letter, 0, 0);
		this.p.strokeWeight(1);

		if (window.location.hash === "#debug") {
			this.p.stroke(255, 0, 0).noFill();
			this.p.ellipse(0, 0, 10, 10);
			this.p.ellipse(0, 0, 5, 5);

			this.p.stroke(0, 0, 255).noFill();
			this.p.ellipse(this.dockingPoint.x, this.dockingPoint.y, 10, 10);
			this.p.ellipse(this.dockingPoint.x, this.dockingPoint.y, 5, 5);
		}
	}

	/**
	 * This widget's tight bounding box. This is used for the cursor hit testing.
	 *
	 * @returns {Rect} The bounding box
	 */
	boundingBox(): Rect {
		var box = this.s.font_it.textBounds(this.letter || "x", 0, 1000, this.scale * this.s.baseFontSize);
		return new Rect(-box.w / 2, box.y - 1000, box.w, box.h);
	}

	/**
	 * Internal companion method to shakeIt(). This is the one that actually does the work, and the one that should be
	 * overridden by children of this class.
	 *
	 * @private
	 */
	_shakeIt() {
        // Work out the size of all our children
        var boxes: {[key:string]: Rect} = {};

        _.each(this.dockingPoints, (dockingPoint, dockingPointName) => {
            if (dockingPoint.child != null) {
                dockingPoint.child.scale = this.scale * dockingPoint.scale;
                dockingPoint.child._shakeIt();
                boxes[dockingPointName] = dockingPoint.child.boundingBox(); // NB: This only looks at the direct child!
            }
        });

        // Calculate our own geometry

        // Nothing to do for Symbol

        // Set position of all our children.

        var box = this.boundingBox();
        var descent = (box.y + box.h);

        var widestSuperOrSubScript = 0;

        if ("superscript" in boxes) {
            var p = this.dockingPoints["superscript"].child.position;
            var w = boxes["superscript"].w;
            widestSuperOrSubScript = this.scale * this.s.mBox.w / 12 + w;
            p.x = box.w / 2 + this.scale * this.s.mBox.w / 12 + w/2;
            p.y = -(box.h - descent - this.scale * this.s.mBox.w / 6);
        }

        if ("subscript" in boxes) {
            var p = this.dockingPoints["subscript"].child.position;
            var w = boxes["subscript"].w;
            widestSuperOrSubScript = Math.max(this.scale * this.s.mBox.w / 12 + w, widestSuperOrSubScript);
            p.x = box.w / 2 + w/2;
            p.y = this.scale * this.s.mBox.w / 4;
        }

        if ("right" in boxes) {
            var p = this.dockingPoints["right"].child.position;
            p.y = 0;
            p.x = box.w / 2 + boxes["right"].w / 2 + widestSuperOrSubScript; // TODO: Tweak this with kerning.
        }
	}
}