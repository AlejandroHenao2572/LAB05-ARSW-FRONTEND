import { useRef, useCallback } from 'react';
import Canvas from './components/Canvas';
import useSocket from './hooks/useSocket';

const generateRandomColor = () => {
  return '#' + Math.floor(Math.random() * 0xFFFFFF)
    .toString(16)
    .padStart(6, '0');
};

// Each user gets a random color when they load the app, which is used for their drawings.
const USER_COLOR = generateRandomColor();

function App() {

  // Ref to access Canvas methods (like drawPoint and clearCanvas) from the onMessageReceived callback, which is called by the WebSocket hook when a message arrives.
  const canvasRef = useRef(null);

  /**
   * onMessageReceived: excecuted when a message is received from the WebSocket connection.
   *
   * The messae can be:
   * - type "DRAW"  → draws a point on the canvas with the provided coordinates and color
   * - type "CLEAR" → clears the entire canvas
   */
  const onMessageReceived = useCallback((message) => {
    if (!canvasRef.current) return;

    if (message.type === 'DRAW') {
      canvasRef.current.drawPoint(message);
    } else if (message.type === 'CLEAR') {
      canvasRef.current.clearCanvas();
    }
  }, []);

  // Conect to the WebSocket server and get the sendMessage function to send drawing updates when the user interacts with the canvas.
  const { sendMessage } = useSocket(onMessageReceived);

  /**
   * onDraw: callback that calls Canvas when the user draws on it. It sends a message to the server with the drawing data (coordinates and color) using the sendMessage function from the WebSocket hook.
   */
  const onDraw = useCallback((x, y) => {
    sendMessage({ x, y, color: USER_COLOR, type: 'DRAW' });
  }, [sendMessage]);

  /**
   * onClear: callback that calls Canvas when the user presses "Clear".
   * The type CLEAR indicates to the server that it should broadcast the clear action to all users.
   */
  const onClear = useCallback(() => {
    sendMessage({ x: 0, y: 0, color: USER_COLOR, type: 'CLEAR' });
  }, [sendMessage]);

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Shared Board</h2>
      <p style={styles.colorInfo}>
        Your color: <strong style={{ color: USER_COLOR }}>{USER_COLOR}</strong>
      </p>
      <Canvas
        ref={canvasRef}
        onDraw={onDraw}
        onClear={onClear}
      />
    </div>
  );
}

// Simple inline styles for the app layout and user color display.
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    fontFamily: 'sans-serif',
    padding: '20px',
  },
  title: { marginBottom: '4px' },
  colorInfo: { marginBottom: '12px', fontSize: '14px' },
};

export default App;