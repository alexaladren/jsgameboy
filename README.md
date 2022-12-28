# JS GameBoy Emulator

GameBoy emulator coded in JavaScript for browsers. You can see it working on http://gb.alexaladren.net

## Usage

* You can play it directly on http://gb.alexaladren.net
* You can download this repository and open index.html with any browser

## Code

The JS code is divided in 3 files:

* **emulator.js** handles the interaction with the browser and the player itself. It contains code for loading ROMs, receiving input and save games.
* **GameBoy.js** simulates the 'motherboard' of the GameBoy, including memory addressing, rendering, time control, audio, etc.
* **Z80.js** emulates the Z80 processor used in GameBoy, the instruction set and registers. It is coded in ASM.js, a subset of JavaScript that allows browsers to 'compile' the JS code for faster processing