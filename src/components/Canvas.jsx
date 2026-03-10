import {
  useRef,
  useEffect,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from 'react';

/**
 * Canvas.jsx — Component to dwaw on a shared canvas using WebSockets.
 *
 * Renders the canvas element
 * Detect mouse events to allow drawing
 * Exposes drawPoint and clearCanvas functions to be called from App.js when messages arrive from the server.
 */
const Canvas = forwardRef(({ onDraw, onClear, color }, ref) => {

  // Reference to the canvas DOM element, used for drawing and getting mouse coordinates.
  const canvasRef = useRef(null);

  // Ref to track whether the user is currently drawing (mouse button is pressed).
  const isDrawing = useRef(false);


  /**
    * Draws a point on the canvas at the specified coordinates with the given color.
    * This function is called both when the local user draws and when a message is received from the server indicating that any user has drawn.
   */
  const drawPoint = useCallback((x, y, color) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d'); // 2D context 

    //Draw a filled circle (point) at (x, y) with the specified color
    ctx.beginPath();                  
    ctx.arc(x, y, 5, 0, Math.PI * 2); 
    ctx.fillStyle = color;            
    ctx.fill();                       
    ctx.closePath();                  
  }, []);

  /**
    * Clears the entire canvas
   */
  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

 
  /**
   * useImperativeHandle define what the parent component (App.js) can access when it uses a ref to this Canvas component.
   *
   * Flow:
   *   App.js gets remote msg → canvasRef.current.drawPoint(msg)
   *                            
   */
  useImperativeHandle(ref, () => ({

    // drawPoint get the draw object from the server and calls the local drawPoint function to render it on the canvas.
    drawPoint: (message) => {
      drawPoint(message.x, message.y, message.color);
    },

    // clearCanvas is called when a CLEAR message is received from the server, which indicates that all users should clear their canvas.
    clearCanvas: () => {
      clearCanvas();
    },

  }), [drawPoint, clearCanvas]);


  useEffect(() => {
    // Pintamos el fondo blanco inicial al montar el componente
    clearCanvas();
  }, [clearCanvas]);


  /**
   * Get the mouse coordinates relative to the canvas element.
   */
  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  /**
   * onMouseDown: the user starts drawing.
   * We activate the isDrawing flag and draw the first point.
   */
  const handleMouseDown = (e) => {
    isDrawing.current = true;
    const { x, y } = getCanvasCoords(e);

    // We draw locally for immediate response (without waiting for the server)
    // This makes the app feel instant for the local user
    drawPoint(x, y, color);

    // We notify the parent to send the message to the server
    // The server will retransmit it to ALL users
    onDraw(x, y);
  };

  /**
   * onMouseMove: the user drags the mouse while drawing.
   * We only act if isDrawing is true.
   */
  const handleMouseMove = (e) => {
    if (!isDrawing.current) return;

    const { x, y } = getCanvasCoords(e);

    // Same pattern: immediate local drawing + sending to the server
    drawPoint(x, y, color);
    onDraw(x, y);
  };

  /**
   * onMouseUp / onMouseLeave: the user stops drawing.
   * We deactivate the isDrawing flag.
   */
  const handleMouseUp = () => {
    isDrawing.current = false;
  };


  return (
    <div>
      <canvas
        ref={canvasRef}
        width={800}
        height={500}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp} 
        style={styles.canvas}
      />
      <div style={styles.toolbar}>
        <button onClick={onClear} style={styles.button}>
          Clean Board for all
        </button>
      </div>
    </div>
  );
});


const styles = {
  canvas: {
    border: '2px solid #333',
    borderRadius: '8px',
    cursor: 'crosshair',    
    display: 'block',
    backgroundColor: '#fff',
  },
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