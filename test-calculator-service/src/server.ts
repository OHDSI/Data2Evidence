import { Application, Router } from "https://deno.land/x/oak@v12.6.1/mod.ts";

const router = new Router();

const calculatorHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>D2E Calculator</title>
  <style>
    body { font-family: Arial; display: flex; justify-content: center; padding: 50px; background: #f5f5f5; }
    .calculator { background: #333; padding: 20px; border-radius: 10px; width: 300px; }
    .display { background: #222; color: #0f0; font-size: 2em; text-align: right; padding: 15px; margin-bottom: 10px; border-radius: 5px; }
    .buttons { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
    button { padding: 20px; font-size: 1.2em; border: none; border-radius: 5px; cursor: pointer; }
    button:hover { opacity: 0.8; }
    .number { background: #666; color: white; }
    .operator { background: #f90; color: white; }
    .equals { background: #0af; color: white; }
    .clear { background: #f44; color: white; }
  </style>
</head>
<body>
  <div class="calculator">
    <div class="display" id="display">0</div>
    <div class="buttons">
      <button class="clear" onclick="clearDisplay()">C</button>
      <button class="operator" onclick="appendOp('(')">(</button>
      <button class="operator" onclick="appendOp(')')">)</button>
      <button class="operator" onclick="appendOp('/')">÷</button>
      <button class="number" onclick="append('7')">7</button>
      <button class="number" onclick="append('8')">8</button>
      <button class="number" onclick="append('9')">9</button>
      <button class="operator" onclick="appendOp('*')">×</button>
      <button class="number" onclick="append('4')">4</button>
      <button class="number" onclick="append('5')">5</button>
      <button class="number" onclick="append('6')">6</button>
      <button class="operator" onclick="appendOp('-')">-</button>
      <button class="number" onclick="append('1')">1</button>
      <button class="number" onclick="append('2')">2</button>
      <button class="number" onclick="append('3')">3</button>
      <button class="operator" onclick="appendOp('+')">+</button>
      <button class="number" onclick="append('0')">0</button>
      <button class="number" onclick="append('.')">.</button>
      <button class="equals" onclick="calculate()">=</button>
      <button class="operator" onclick="backspace()">⌫</button>
    </div>
  </div>
  <script>
    let current = '0';
    const display = document.getElementById('display');
    function updateDisplay() { display.textContent = current; }
    function clearDisplay() { current = '0'; updateDisplay(); }
    function append(val) { current = current === '0' ? val : current + val; updateDisplay(); }
    function appendOp(op) { current += op; updateDisplay(); }
    function backspace() { current = current.length > 1 ? current.slice(0, -1) : '0'; updateDisplay(); }
    function calculate() {
      try {
        current = String(eval(current));
        updateDisplay();
      } catch (e) { current = 'Error'; updateDisplay(); }
    }
  </script>
</body>
</html>
`;

router.get("/", (ctx) => {
  ctx.response.type = "text/html";
  ctx.response.body = calculatorHtml;
});

router.get("/health", (ctx) => {
  ctx.response.body = { status: "ok", service: "calculator" };
});

const app = new Application();
app.use(router.routes());
app.use(router.allowedMethods());

console.log("Calculator running on http://0.0.0.0:8080");
await app.listen({ port: 8080 });
