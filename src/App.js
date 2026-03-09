import { useRef, useEffect } from 'react';
import p5 from 'p5';

function App() {

  // Definimos el "sketch": todo lo que P5.js va a dibujar
  const sketch = function (p) {

    // setup() se ejecuta UNA SOLA VEZ al inicio
    p.setup = function () {
      p.createCanvas(640, 480); // Crea el canvas dentro del contenedor
      p.background(255);        // Fondo blanco inicial
    };

    // draw() se ejecuta en LOOP continuamente
    p.draw = function () {
      if (p.mouseIsPressed === true) {
        p.fill(0, 0, 0);                        // Color negro
        p.ellipse(p.mouseX, p.mouseY, 20, 20); // Dibuja círculo en posición del mouse
      }
      if (p.mouseIsPressed === false) {
        p.fill(255, 255, 255);                  // Color blanco cuando no hay clic
      }
    };
  };

  // useRef guarda la instancia de p5 sin causar re-renders
  const myp5 = useRef(new p5(sketch, 'container'));

  return (
    <div>
      <hr />
      {/* Este div con id="container" es donde P5.js inyecta el canvas */}
      <div id="container"></div>
      <hr />
    </div>
  );
}

export default App;