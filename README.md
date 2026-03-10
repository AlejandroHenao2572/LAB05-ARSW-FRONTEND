# LAB5 - Collaborative Whiteboard — React Frontend

A real-time collaborative drawing application built with React. Multiple users can draw simultaneously on a shared canvas, each assigned a unique color. All drawing actions and canvas clearing are broadcast instantly to every connected client via WebSockets using the STOMP protocol over SockJS.

## Project Description

This frontend is a React application that interfaces with a Spring Boot WebSocket backend. It uses **P5.js** (in instance mode) to render drawing operations and **@stomp/stompjs** with **SockJS** to maintain a persistent, full-duplex connection to the server.

When a user draws on the canvas, the coordinates and color are published to the backend via STOMP. The backend broadcasts the message to all subscribers, so every connected client renders the same stroke in real time. The same mechanism handles global canvas clearing.


## Key Features

- **Real-time synchronization** — Drawing strokes appear on all connected clients simultaneously via WebSocket messaging (STOMP over SockJS).
- **Random user color assignment** — Each user is assigned a unique random hex color on page load, making it easy to distinguish contributors.
- **Global canvas clearing** — Any user can clear the board for all connected clients with a single button press.
- **Modular architecture** — Canvas rendering, WebSocket logic, and application state are cleanly separated into components and custom hooks.

---

## Project Structure

```
src/
├── App.js                  # Root component. Owns application state, color assignment,
│                           # and coordinates communication between Canvas and useSocket.
├── components/
│   └── Canvas.jsx          # Creates a P5.js sketch. Handles mouse events for drawing.
│                           # Exposes drawPoint() and clearCanvas() via forwardRef + useImperativeHandle
│                           # so App.js can invoke them when server messages arrive.
└── hooks/
    └── useSocket.js        # Custom hook that manages the STOMP client lifecycle.
                            # Connects to the backend on mount, subscribes to /topic/draw,
                            # and exposes a sendMessage() function for publishing draw events.
```


## AzureDeploy link
[FrontEnd Azure Deploy Link](collaborativeboardfront-dba4g4cjfjgkgbfr.eastus2-01.azurewebsites.net)

### Responsibilities by file

| File | Responsibility |
|---|---|
| `App.js` | Color generation, message routing, callback wiring |
| `Canvas.jsx` | P5.js sketch setup, mouse event handling, imperative API |
| `useSocket.js` | STOMP client setup, subscription, publish, cleanup |

---

## Prerequisites

- [Node.js](https://nodejs.org/) v16 or higher
- npm v8 or higher
- The Spring Boot backend running and accessible (default: `http://localhost:8080`)

---

## Installation

**1. Clone the repository**

```bash
git clone <repository-url>
cd lab05-arsw-frontend
```

**2. Install dependencies**

```bash
npm install
```

**3. Install required libraries** (if not already present in `package.json`)

```bash
npm install @stomp/stompjs sockjs-client p5
```

| Package | Purpose |
|---|---|
| `@stomp/stompjs` | STOMP protocol client for WebSocket messaging |
| `sockjs-client` | SockJS transport layer, provides WebSocket fallback support |
| `p5` | P5.js creative coding library used for canvas rendering |

---

## Environment Variables

By default, the backend URL is hardcoded in `src/hooks/useSocket.js`:

```js
webSocketFactory: () => new SockJS('http://localhost:8080/ws-board'),
```

To make this configurable without modifying source code, create a `.env` file at the project root:

```
REACT_APP_WS_URL=http://localhost:8080/ws-board
```

Then update `useSocket.js` to read the variable:

```js
webSocketFactory: () => new SockJS(process.env.REACT_APP_WS_URL),
```

---

## How App.js Works

`src/App.js` is the root component and the central coordinator of the application. 

### User Color Assignment

A random hex color is generated once at module level, outside the component function. This means the color is assigned when the JavaScript module is first loaded and never changes for the lifetime of the session, even across re-renders.

```js
const USER_COLOR = generateRandomColor(); // Runs once on page load

function App() { ... } // USER_COLOR is stable across all renders
```

Placing it outside the component is intentional: if it were inside, a new color would be generated on every re-render.

### Connecting the Layers

`App.js` initializes the WebSocket hook and the canvas ref, then passes the right callbacks down to `Canvas`:

```
useSocket(onMessageReceived)  →  gives back sendMessage()
                                         │
                           ┌─────────────┴─────────────┐
                       onDraw(x,y)               onClear()
                           │                         │
                     sendMessage(DRAW)        sendMessage(CLEAR)
```

The `canvasRef` points to the `Canvas` component instance, which exposes `drawPoint()` and `clearCanvas()`.

### Message Routing

`onMessageReceived` is the single entry point for all incoming WebSocket messages. It inspects the `type` field and delegates to the appropriate canvas method:

```js
const onMessageReceived = useCallback((message) => {
  if (!canvasRef.current) return;

  if (message.type === 'DRAW') {
    canvasRef.current.drawPoint(message);   // Renders the remote stroke
  } else if (message.type === 'CLEAR') {
    canvasRef.current.clearCanvas();        // Wipes the canvas for all users
  }
}, []);
```


### Callback Memoization

Both `onDraw` and `onClear` are memoized with `useCallback` to avoid passing new function references to `Canvas` on every render, which would defeat React's `memo` optimizations on child components.

```js
const onDraw = useCallback((x, y) => {
  sendMessage({ x, y, color: USER_COLOR, type: 'DRAW' });
}, [sendMessage]);

const onClear = useCallback(() => {
  sendMessage({ x: 0, y: 0, color: USER_COLOR, type: 'CLEAR' });
}, [sendMessage]);
```


## How the Canvas Component Works

`src/components/Canvas.jsx` is a controlled React component responsible for all drawing operations.

### Props

| Prop | Type | Description |
|---|---|---|
| `onDraw` | function | Called with `(x, y)` whenever the user draws a point. Triggers a message send in `App.js`. |
| `onClear` | function | Called when the user clicks the clear button. Triggers a CLEAR message send in `App.js`. |
| `color` | string | The hex color assigned to this user, used for all drawing strokes. |

### P5 Instance 

The sketch is created once on mount using `new p5(sketch, container)`. `p.noLoop()` is called in `setup` so P5 does not run a continuous animation frame — drawing only happens in response to mouse events, which is more efficient for a whiteboard use case.

```js
useEffect(() => {
  const sketch = (p) => {
    p.setup = () => {
      const canvas = p.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
      canvas.parent(containerRef.current);
      p.background(255);
      p.noLoop();
    };
    // mouse handlers and drawDot defined here...
  };

  const p5Instance = new p5(sketch);
  p5Ref.current = p5Instance;

  return () => p5Instance.remove(); // Cleanup on unmount
}, []);
```

### Drawing Flow

Every mouse interaction follows the same two-step pattern:

**1. Local render** — The point is drawn immediately on the local canvas without waiting for the server, making the experience feel instant.

**2. Publish to server** — `onDraw(x, y)` is called, which propagates up to `App.js` and then to `useSocket.sendMessage()`, broadcasting the stroke to all other clients.

P5's `mousePressed` fires on click and `mouseDragged` fires while the button is held, replacing the previous React `onMouseDown`/`onMouseMove`/`onMouseUp` handler chain:

```js
p.mousePressed = () => {
  if (!inBounds()) return;
  p.drawDot(p.mouseX, p.mouseY, colorRef.current); // Step 1: local render
  onDrawRef.current(p.mouseX, p.mouseY);           // Step 2: publish to server
};

p.mouseDragged = () => {
  if (!inBounds()) return;
  p.drawDot(p.mouseX, p.mouseY, colorRef.current);
  onDrawRef.current(p.mouseX, p.mouseY);
};
```

### Coordinate Calculation

P5 automatically tracks the mouse position relative to the canvas via `p.mouseX` and `p.mouseY`. No manual `getBoundingClientRect()` conversion is needed. An `inBounds()` guard ensures drawing is ignored when the mouse is outside the canvas area, since P5 mouse events fire globally on the page:

```js
const inBounds = () =>
  p.mouseX >= 0 && p.mouseX <= CANVAS_WIDTH &&
  p.mouseY >= 0 && p.mouseY <= CANVAS_HEIGHT;
```

### Canvas Initialization

The white background is painted inside P5's `setup` function using `p.background(255)`

```js
p.setup = () => {
  p.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
  p.background(255); // White background on mount
  p.noLoop();
};
```

## How the useSocket Hook Works

`src/hooks/useSocket.js` is a custom React hook that encapsulates the entire WebSocket lifecycle. It accepts a single argument — `onMessageReceived`, a callback function — and returns `{ sendMessage }` for the caller to publish messages.


The hook uses `useEffect` with an empty dependency array `[]`, which means the connection is established once when the component mounts and torn down when it unmounts.

```js
useEffect(() => {
  const stompClient = new Client({ ... });
  stompClient.activate();
  clientRef.current = stompClient;

  return () => {
    stompClient.deactivate(); // Cleanup on unmount
  };
}, []);
```


### Connection and Subscription

Inside `onConnect`, the client subscribes to the `/topic/draw` destination. Every message published to that topic by the backend is received here, parsed from JSON, and forwarded to the `onMessageReceived` callback provided by `App.js`.

```js
onConnect: () => {
  stompClient.subscribe('/topic/draw', (stompMessage) => {
    const drawMessage = JSON.parse(stompMessage.body);
    onMessageReceived(drawMessage); // Delegates to App.js
  });
}
```

### Publishing Messages

`sendMessage` checks that the client exists and is currently connected before publishing. If the connection is not ready (e.g., still establishing), it logs a warning and drops the message rather than throwing.

```js
const sendMessage = (drawMessage) => {
  if (clientRef.current && clientRef.current.connected) {
    clientRef.current.publish({
      destination: '/app/draw',
      body: JSON.stringify(drawMessage),
    });
  } else {
    console.warn('Failed to send message: STOMP client is not connected.');
  }
};
```

Messages are sent to `/app/draw`, which maps to the `@MessageMapping("/draw")` method in the Spring Boot controller. The controller then broadcasts the message to all `/topic/draw` subscribers.

### Message Shape

All messages — both sent and received — share the same structure:

| Field | Type | Description |
|---|---|---|
| `x` | number | X coordinate on the canvas |
| `y` | number | Y coordinate on the canvas |
| `color` | string | Hex color of the drawing user (e.g. `#a3f21c`) |
| `type` | string | `"DRAW"` to render a point, `"CLEAR"` to wipe the canvas |

---
