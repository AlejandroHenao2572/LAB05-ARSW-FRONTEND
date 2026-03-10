import {
  useRef,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from 'react';
import p5 from 'p5';

/**
 * Canvas.jsx — Component to draw on a shared canvas using WebSockets and P5.js.
 */

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 500;
const POINT_DIAMETER = 10;

const Canvas = forwardRef(({ onDraw, onClear, color }, ref) => {

  // Container div where P5 will mount canvas element.
  const containerRef = useRef(null);

  // Holds the P5 instance so we can call drawing methods from useImperativeHandle.
  const p5Ref = useRef(null);

  // Refs for the latest prop values so the P5 sketch closure never goes stale.
  const onDrawRef = useRef(onDraw);
  const colorRef  = useRef(color);

  useEffect(() => {
    onDrawRef.current = onDraw;
    colorRef.current  = color;
  }, [onDraw, color]);


  useEffect(() => {
    /**
     * P5 instance-mode sketch.
     * All event handlers capture props via refs to avoid recreating the
     * P5 instance whenever onDraw or color change.
     */
    const sketch = (p) => {
      p.setup = () => {
        const canvas = p.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
        canvas.parent(containerRef.current);

        // Apply visual styles directly to the P5 <canvas> element
        canvas.elt.style.border        = '2px solid #333';
        canvas.elt.style.borderRadius  = '8px';
        canvas.elt.style.cursor        = 'crosshair';
        canvas.elt.style.display       = 'block';

        p.background(255);
        p.noLoop(); // Only redraw on mouse events, not on every frame
      };

      /**
       * Helper: draw a filled circle at (x, y) with the given CSS hex color.
       */
      p.drawDot = (x, y, dotColor) => {
        p.noStroke();
        p.fill(dotColor);
        p.circle(x, y, POINT_DIAMETER);
      };

      /**
       * Returns true only when the mouse is inside the canvas bounds.
       */
      const inBounds = () =>
        p.mouseX >= 0 && p.mouseX <= CANVAS_WIDTH &&
        p.mouseY >= 0 && p.mouseY <= CANVAS_HEIGHT;

      // mousePressed  start drawing
      p.mousePressed = () => {
        if (!inBounds()) return;
        p.drawDot(p.mouseX, p.mouseY, colorRef.current);
        onDrawRef.current(p.mouseX, p.mouseY);
      };

      // mouseDragged  continue drawing while button is held
      p.mouseDragged = () => {
        if (!inBounds()) return;
        p.drawDot(p.mouseX, p.mouseY, colorRef.current);
        onDrawRef.current(p.mouseX, p.mouseY);
      };
    };

    const p5Instance = new p5(sketch);
    p5Ref.current = p5Instance;

    return () => {
      p5Instance.remove();
    };
  }, []); 


  /**
   * Expose drawPoint and clearCanvas to App.js via ref.
   *
   * Flow:
   *   App.js receives DRAW/CLEAR message → calls canvasRef.current.drawPoint / clearCanvas
   */
  useImperativeHandle(ref, () => ({
    drawPoint: (message) => {
      const p = p5Ref.current;
      if (!p) return;
      p.drawDot(message.x, message.y, message.color);
    },
    clearCanvas: () => {
      const p = p5Ref.current;
      if (!p) return;
      p.background(255);
    },
  }), []);


  return (
    <div>
      <div ref={containerRef} />
      <div style={styles.toolbar}>
        <button onClick={onClear} style={styles.button}>
          Clean Board for all
        </button>
      </div>
    </div>
  );
});


const styles = {
  toolbar: {
    marginTop: '12px',
    display: 'flex',
    justifyContent: 'center',
  },
  button: {
    padding: '8px 24px',
    fontSize: '14px',
    cursor: 'pointer',
    borderRadius: '6px',
    border: '1px solid #333',
    backgroundColor: '#ff4d4d',
    color: '#fff',
    fontWeight: 'bold',
  },
};

Canvas.displayName = 'Canvas';

export default Canvas;