/*

JS GameBoy Emulator v.1.0
Copyright (C) 2013 Alejandro Aladrén <alex@alexaladren.net> 

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.

 */

var GameBoy = function(rom, canvas){
   
   var _this = this;
   
   this.COLORS = [
      [255, 255, 255],
      [204, 204, 204],
      [153, 153, 153],
      [0, 0, 0]
   ];

   this.LCD_WIDTH = 160;
   this.LCD_HEIGHT = 144;
   
   this.canvas = canvas;
   this.onFPS = null;
   
   var rommap = new Uint8Array(rom);
   this.rom8bit = new Array(rommap.length);
   for(var i = 0; i < rommap.length; i++){
      this.rom8bit[i] = rommap[i];
   }

   this.romBanks = 2*Math.pow(2,this.rom8bit[0x0148]);
   this.activeRomBank = 1;
   
   switch(this.rom8bit[0x0149]){
      case 0: this.ramSpace = 0; this.ramBanks = 0; break;
      case 1: this.ramSpace = 2048; this.ramBanks = 1; break;
      case 2: this.ramSpace = 8192; this.ramBanks = 1; break;
      case 3: this.ramSpace = 32768; this.ramBanks = 4;break;
      default: this.ramSpace = 0;
   }
   this.activeRamBank = 0;
   this.ramEnabled = 0;
   
   this.romRamMode = 0; // 0 = ROM mode, 1 = RAM mode
   
   this.cartram8bit = new Array(this.ramSpace);
   this.cartram8bit.fill(0);
   this.vram8bit = new Array(8192);
   this.vram8bit.fill(0);
   this.wram8bit = new Array(8192);
   this.wram8bit.fill(0);
   this.spriteram8bit = new Array(160);
   this.spriteram8bit.fill(0);
   this.io8bit = new Array(127);
   this.io8bit.fill(0);
   this.hram8bit = new Array(126);
   this.hram8bit.fill(0);

   this.lcd = new Int8Array(this.LCD_WIDTH * this.LCD_HEIGHT);
   this.lcd.fill(0);
   
   this.intEnable = 0;
   
   this.lcdLine = 0;
   this.lcdMode = 0;
   this.lcdStatus = 0;
   
   this.divider = 0;
   this.timer = 0;
   
   this.paused = false;
   this.fps = 0;
   
   this.keys = 255;
   
   this.transfer = 0;
   this.transferByte = 0xFF;
   this.transferIncoming = -1;
   this.transferClockOrigin = 1;
   this.transferOut = null;

   this.init = function(){
      var _this = this;
      this.interval = requestAnimationFrame(function(){_this.execute()});
      this.fpstime = new Date();
   }

   this.pause = function(){
      if(!this.paused){
         this.paused = true;
      }else{
         this.paused = false;
      }
   }
   
   this.setCartridgeRam = function(datastring){
      this.cartram = new ArrayBuffer(datastring.length);
      this.cartram8bit = new Uint8Array(this.cartram);
      for(var i = 0; i < datastring.length; i++){
         this.cartram8bit[i] = datastring.charCodeAt(i);
      }
   }

   this.execute = function(){
      var _this = this;
      this.interval = requestAnimationFrame(function(){_this.execute()});
      // 4213440 ticks per second
      if(this.paused) return;
      //console.time("frame");
      this.transferClock();
      for(var i = 0; i < 144; i++){
         this.LCDStatusSet(i, 2);
         this.z80.execute(80);

         this.LCDStatusSet(i, 3);
         this.z80.execute(172);

         this.LCDStatusSet(i, 0);
         this.z80.execute(204);
      }
      for(var i = 144; i < 154; i++){
         this.LCDStatusSet(i, 1);
         this.z80.execute(456);
      }
      //console.timeEnd("frame");
   }

   this.LCDStatusSet = function(line, mode){
      this.lcdLine = line;
      this.lcdMode = mode;

      if(this.lcdLine == this.io8bit[0x45]){ // LYC == LY ?
         this.lcdStatus |= 4;
         if(this.lcdMode == 0 && this.lcdStatus & 64){
            this.LCDInt();
         };
      }else{
         this.lcdStatus &= ~4;
      }
      
      this.lcdStatus &= ~3;
      this.lcdStatus |= mode;

      if (this.lcdMode == 0) {
         if(this.io8bit[0x40] & 128) this.drawLine(this.lcdLine);
      }

      if (this.lcdLine == 144) {

         this.drawScreenCanvas2D();

         this.fps++;
         if(this.fps == 60){
            if(this.onFPS != null) this.onFPS("FPS: "+Math.round(1000/((new Date()) - this.fpstime)));
            this.fps = 0;
         }
         this.fpstime = new Date();
         this.vblankInt();
         if(this.lcdStatus & 16){
            this.LCDInt()
         };
      }
   }

   this.timerDividerIncrement = function () {
      this.divider = (this.divider + 1) % 256;
   }
   
   this.timerCounterIncrement = function () {
      this.timer++;
      if(this.timer >= 256){
         this.timerInt();
         this.timer = this.io8bit[0x06] ?? 0;
      }
   }
   
   this.keyPressed = function(key){
      this.z80.resume();
      if(this.keys & key){
         this.keys &= ~key;
         this.joypadInt();
      }
   }
   
   this.keyReleased = function(key){
      this.keys |= key;
   }
   
   this.transferIn = function(data){
      this.transferIncoming = data;
      /*if(external) this.transferClockOrigin = 0;
      else this.transferClockOrigin = 1;
      return this.transferByte;*/
   }
   
   this.transferClock = function(){
      if(this.transfer && this.transferIncoming != -1){
         this.transferByte = this.transferIncoming;
         this.transfer = 0;
         this.transferIncoming = -1;
         /*if(this.transferOut != undefined) */this.serialInt();
      }
   }
   
   this.vblankInt = function(){
      this.io8bit[0x0F] |= 1;
      this.checkForInterrupts();
   }
   this.LCDInt = function(){
      this.io8bit[0x0F] |= 2;
      this.checkForInterrupts();
   }
   this.timerInt = function(){
      this.io8bit[0x0F] |= 4;
      this.checkForInterrupts();
   }
   this.serialInt = function(){
      this.io8bit[0x0F] |= 8;
      this.checkForInterrupts();
   }
   this.joypadInt = function(){
      this.io8bit[0x0F] |= 16;
      this.checkForInterrupts();
   }
   
   this.checkForInterrupts = function(){
      var intvector = this.io8bit[0x0F];
      if(intvector & 1 && this.intEnable & 1) {
         this.z80.resume();
         if (this.z80.getIME()) {
            intvector &= ~1;
            this.z80.interrupt(0x40);
         }
      } else if (intvector & 2 && this.intEnable & 2) {
         this.z80.resume();
         if (this.z80.getIME()) {
            intvector &= ~2;
            this.z80.interrupt(0x48)
         }
      } else if (intvector & 4 && this.intEnable & 4) {
         this.z80.resume();
         if (this.z80.getIME()) {
            intvector &= ~4;
            this.z80.interrupt(0x50)
         }
      } else if (intvector & 8 && this.intEnable & 8) {
         this.z80.resume();
         if (this.z80.getIME()) {
            intvector &= ~8;
            this.z80.interrupt(0x58)
         }
      } else if (intvector & 16 && this.intEnable & 16) {
         this.z80.resume();
         if (this.z80.getIME()) {
            intvector &= ~16;
            this.z80.interrupt(0x60)
         }
      }
      this.io8bit[0x0F] = intvector;
   }

   /*this.interruptHandled = function (address) {

   }*/
   
   this.getAddress = function(address){
      //console.log("Lee memoria", address);
      if(address >= 0 && address < 0x4000){ // Cartridge ROM Bank 00 (0000-3FFF)
         return this.rom8bit[address];
      }else if(address >= 0x4000 && address < 0x8000){ // Cartridge ROM Bank 01..nn (4000-7FFF)
         return this.rom8bit[address+0x4000*(this.activeRomBank-1)];
      }else if(address >= 0x8000 && address < 0xA000){ // Video RAM (8000-9FFF)
         return this.vram8bit[address-0x8000];
      }else if(address >= 0xA000 && address < 0xC000){ // Cartridge RAM Bank (A000-BFFF)
         if(this.cartram == undefined || this.ramEnabled == 0) return 0;
         if((address - 0xA000 + this.activeRamBank*8192) >= this.cartram8bit.length) return 0;
         return this.cartram8bit[address - 0xA000 + this.activeRamBank*8192];
      }else if(address >= 0xC000 && address < 0xE000){ // Work RAM Banks (C000-DFFF)
         return this.wram8bit[address-0xC000];
      }else if(address >= 0xE000 && address < 0xFE00){ // Same as C000-DDFF (E000-FDFF)
         return this.wram8bit[address-0xE000];
      }else if(address >= 0xFE00 && address < 0xFEA0){ // Sprite Attribute Table (OAM) (FE00-FE9F)
         return this.spriteram8bit[address-0xFE00];
      }else if(address >= 0xFF00 && address < 0xFF80){ // I/O (FF00-FF7F)
         return this.getIO(address % 0xFF00);
      }else if(address >= 0xFF80 && address <= 0xFFFE){ // High RAM / Stack (HRAM) (FF80-FFFE)
         return this.hram8bit[address-0xFF80];
      }else if(address == 0xFFFF){ // Interrupt Enable Register
         return this.intEnable;
      }else{
         return 0;
      }
   }
   
   this.putAddress = function(address, data){
      if(address >= 0 && address < 0x2000){ // RAM enable
         if(data == 0) this.ramEnabled = 0;
         if(data == 0x0A) this.ramEnabled = 1;
      }else if(address >= 0x2000 && address < 0x4000){ // Cambio de banco ROM
         this.activeRomBank = data % 32;
      }else if(address >= 0x4000 && address < 0x6000){ // RAM Bank Number / Upper Bits of ROM Bank Number
         if(this.romRamMode == 0){ // ROM Mode
            this.activeRomBank = (this.activeRomBank & 0x1F) | ((data % 4) << 5); 
         }else if(this.romRamMode == 1){ // RAM Mode
            this.activeRamBank = data % 4;
         }
      }else if(address >= 0x6000 && address < 0x8000){ // ROM/RAM Mode Select
         this.romRamMode = data & 1;
      }else if(address >= 0x8000 && address < 0xA000){ // Video RAM (8000-9FFF)
         this.vram8bit[address-0x8000] = data;
      }else if(address >= 0xA000 && address < 0xC000){ // Cartridge RAM Bank (A000-BFFF)
         if(this.cartram == undefined || this.ramEnabled == 0) return;
         if((address - 0xA000 + this.activeRamBank*8192) >= this.cartram8bit.length) return;
         this.cartram8bit[address - 0xA000 + this.activeRamBank*8192] = data;
      }else if(address >= 0xC000 && address < 0xE000){ // Work RAM Banks (C000-DFFF)
         this.wram8bit[address-0xC000] = data;
      }else if(address >= 0xE000 && address < 0xFE00){ // Same as C000-DDFF
         this.wram8bit[address-0xE000] = data;
      }else if(address >= 0xFE00 && address < 0xFEA0){ // Sprite Attribute Table (OAM) (FE00-FE9F)
         this.spriteram8bit[address-0xFE00] = data;
      }else if(address >= 0xFF00 && address < 0xFF80){ // I/O (FF00-FF7F)
         this.putIO(address % 0xFF00, data);
      }else if(address >= 0xFF80 && address <= 0xFFFE){ // High RAM / Stack (HRAM) (FF80-FFFE)
         this.hram8bit[address-0xFF80] = data;
      }else if(address == 0xFFFF){ // Interrupt Enable Register
         this.intEnable = data;
      }
   }
   
   this.getIO = function(address){
      //console.log("get", address, this.io8bit[address]);
      if(address == 0){
         if((this.io8bit[0] & 48) == 48){
            return this.io8bit[0] & ~15;
         }else if((this.io8bit[0] & 48) == 32){ // Direction keys
            return (this.io8bit[0] & ~15) | (this.keys & 15);
         }else if((this.io8bit[0] & 48) == 16){ // Button keys
            return (this.io8bit[0] & ~15) | (this.keys >> 4);
         }
         return this.io8bit[0] | 15;
      }else if(address == 0x01){
         return this.transferByte;
      }else if(address == 0x02){
         return (this.transfer << 7) | this.transferClockOrigin;
      }else if(address == 0x04){
         return this.divider;
      }else if(address == 0x05){
         return this.timer;
      }else if(address == 0x41){
         return this.lcdStatus;
      }else if(address == 0x44){
         return this.lcdLine;
      }else{
         return this.io8bit[address];
      }
   }
   
   this.putIO = function(address, data){
      //console.log("put", address, data);
      if(address == 0x01){
         this.transferByte = data;
      }else if(address == 0x02){
         this.transferClockOrigin = data & 1;
         if(this.transfer == 0 && data & 0x80){
            this.transfer = 1;
            //if(this.transferOut == undefined){
               if(this.transferClockOrigin) this.transferIn(0xFF);
            /*}else{
               this.transferOut(this.transferByte);
            }*/
         }
      }else if(address == 0x04){
         this.divider = 0;
      }else if(address == 0x05){
         this.timer = 0;
      }else if(address == 0x07){
         this.io8bit[0x07] = data;
         if (data & 0x04) {
            if ((data & 0x03) == 0) {
               this.z80.setTimerCounterFrequency(1024);
            } else if ((data & 0x03) == 1) {
               this.z80.setTimerCounterFrequency(16);
            } else if ((data & 0x03) == 2) {
               this.z80.setTimerCounterFrequency(64);
            } else if ((data & 0x03) == 3) {
               this.z80.setTimerCounterFrequency(256);
            }
         } else {
            this.z80.setTimerCounterFrequency(0);
         }
      }else if(address == 0x0F){
         this.io8bit[address] = data;
         this.checkForInterrupts();
      }else if(address == 0x41){
         this.lcdStatus &= ~ 120;
         this.lcdStatus |= (data & ~135);
      }else if(address == 0x46){
         for(var i = 0; i < 160; i++){
            this.putAddress(0xFE00 + i, this.getAddress((data << 8) + i));
         }
      } else if (address == 0x0F) {
         this.io8bit[0x0F] = data;
         this.checkForInterrupts();
      }else{
         this.io8bit[address] = data;
      }
   }

   this.drawLine = function (line) {
      var lcdControl = this.io8bit[0x40];

      if ((lcdControl & 0x80) == 0) {
         return;
      }

      let bgTileMapArea = (lcdControl & 0x08 ? 0x9C00 : 0x9800) - 0x8000;
      let winTileMapArea = (lcdControl & 0x40 ? 0x9C00 : 0x9800) - 0x8000;

      let bigSprites = lcdControl & 0x04 ? true : false;
      let spritesInLine = [];
      if (lcdControl & 0x01) {
         for (let i = 0; i < 40; i++) {
            let spriteTop = this.spriteram8bit[i * 4] - 16;
            if (line >= spriteTop && line < (spriteTop + (bigSprites ? 16 : 8))) {
               spritesInLine.push(i);
            }
         }
      }

      for (let x = 0; x < this.LCD_WIDTH; x++) {

         let color = -1;
         let spriteUnderColor = -1;

         // Sprites
         for (let i = 0; i < spritesInLine.length; i++) {
            let idx = spritesInLine[i];
            let spriteX = this.spriteram8bit[idx * 4 + 1] - 8;
            if (x < spriteX || x > (spriteX + 8)) {
               continue;
            }
            let spriteY = this.spriteram8bit[idx * 4] - 16;
            let spriteTile = this.spriteram8bit[idx * 4 + 2];
            let spriteAttrs = this.spriteram8bit[idx * 4 + 3];

            let tileDataAddress = bigSprites ? (spriteTile & 0xFE) * 16 : spriteTile * 16;
            let tileX = spriteAttrs & 0x20 ? spriteX - x + 8 : x - spriteX;
            let tileY = spriteAttrs & 0x40 ? spriteY - line + 16 : line - spriteY;

            if (tileY >= 8) {
               tileY -= 8;
               tileDataAddress += 16;
            }

            let firstByte = this.vram8bit[tileDataAddress + (tileY * 2)];
            let secondByte = this.vram8bit[tileDataAddress + (tileY * 2) + 1];
            let bit0 = (firstByte & (1 << (7 - tileX))) > 0 ? 0x01 : 0;
            let bit1 = (secondByte & (1 << (7 - tileX))) > 0 ? 0x02 : 0;
            let spriteColor = bit0 | bit1;

            if (spriteColor > 0) {
               if (spriteAttrs & 0x08) {
                  spriteColor |= 0x0C;
               } else {
                  spriteColor |= 0x08;
               }

               if (spriteAttrs & 0x80) {
                  spriteUnderColor = spriteColor;
               } else {
                  color = spriteColor;
               }
               break;
            }
         }

         // Window
         if(color == -1 && lcdControl & 0x20 && line >= this.io8bit[0x4A] && this.io8bit[0x4A] < 143 && this.io8bit[0x4B] < 166){

            let winPixelX = (x - this.io8bit[0x4B] + 7);
            let winPixelY = (line - this.io8bit[0x4A]);

            if (winPixelX > 0 && winPixelY > 0) {
               let winTileX = Math.floor(winPixelX / 8);
               let winTileY = Math.floor(winPixelY / 8);
               let tileId = this.vram8bit[winTileMapArea + winTileY * 32 + winTileX];
   
               let tileDataAddress;
               if (lcdControl & 0x10) {
                  tileDataAddress = tileId * 16; // $8000–$87FF, $8800–$8FFF
               } else {
                  if (tileId >= 128) tileId -= 256;
                  tileDataAddress = 0x1000 + tileId * 16; // $9000–$97FF, $8800–$8FFF
               }
               let tileX = winPixelX - winTileX * 8;
               let tileY = winPixelY - winTileY * 8;
               
               let firstByte = this.vram8bit[tileDataAddress + (tileY * 2)];
               let secondByte = this.vram8bit[tileDataAddress + (tileY * 2) + 1];
               let bit0 = (firstByte & (1 << (7 - tileX))) > 0 ? 0x01 : 0;
               let bit1 = (secondByte & (1 << (7 - tileX))) > 0 ? 0x02 : 0;
               if (Math.random() < 0.02) debugger;
               color = bit0 | bit1;
            }
         }

         // BG
         if(color == -1 && lcdControl & 0x01){
            let bgPixelX = (x + this.io8bit[0x43] + 256) % 256;
            let bgPixelY = (line + this.io8bit[0x42] + 256) % 256;
            let bgTileX = Math.floor(bgPixelX / 8);
            let bgTileY = Math.floor(bgPixelY / 8);
            let tileId = this.vram8bit[bgTileMapArea + bgTileY * 32 + bgTileX];

            let tileDataAddress;
            if (lcdControl & 0x10) {
               tileDataAddress = tileId * 16; // $8000–$87FF, $8800–$8FFF
            } else {
               if (tileId >= 128) tileId -= 256;
               tileDataAddress = 0x1000 + tileId * 16; // $9000–$97FF, $8800–$8FFF
            }
            let tileX = bgPixelX - bgTileX * 8;
            let tileY = bgPixelY - bgTileY * 8;
            
            let firstByte = this.vram8bit[tileDataAddress + (tileY * 2)];
            let secondByte = this.vram8bit[tileDataAddress + (tileY * 2) + 1];
            let bit0 = (firstByte & (1 << (7 - tileX))) > 0 ? 0x01 : 0;
            let bit1 = (secondByte & (1 << (7 - tileX))) > 0 ? 0x02 : 0;
            color = bit0 | bit1;
         }

         if (color == 0 && spriteUnderColor != -1) {
            color = spriteUnderColor;
         }

         this.lcd[line * this.LCD_WIDTH + x] = color;
      }
   }

   this.drawScreenCanvas2D = function () {

      let paletteBg = this.io8bit[0x47];
      let paletteObj0 = this.io8bit[0x48];
      let paletteObj1 = this.io8bit[0x49];

      let ctx = /** @type {CanvasRenderingContext2D} */ (this.canvas.getContext("2d"));
      let imageData = ctx.getImageData(0, 0, this.LCD_WIDTH, this.LCD_HEIGHT);
      for (let i = 0; i < this.lcd.length; i++) {
         let color = this.lcd[i];
         let value = 0;
         if (color == -1) {
            value = 0;
         } else if (color & 0x08) {
            if (color & 0x04) {
               color &= 0x03;
               value = (paletteObj1 >> (color * 2)) & 0x03;
            } else {
               color &= 0x03;
               value = (paletteObj0 >> (color * 2)) & 0x03;
            }
         } else {
            value = (paletteBg >> (color * 2)) & 0x03;
         }
         /*imageData.data[i * 4] = this.COLORS[value][0];
         imageData.data[i * 4 + 1] = this.COLORS[value][1];
         imageData.data[i * 4 + 2] = this.COLORS[value][2];*/
         imageData.data[i * 4] = this.COLORS[color & 0x03][0];
         imageData.data[i * 4 + 1] = this.COLORS[color & 0x03][1];
         imageData.data[i * 4 + 2] = this.COLORS[color & 0x03][2];
         imageData.data[i * 4 + 3] = 255;
      }
      ctx.putImageData(imageData, 0, 0);
   }
   
   this.z80 = Z80(window, {
      getAddress: function(){
         return _this.getAddress.apply(_this, arguments);
      },
      putAddress: function(){
         _this.putAddress.apply(_this, arguments);
      },
      checkForInterrupts: function(){
         _this.checkForInterrupts.apply(_this, arguments);
      },
      timerDividerIncrement: function () {
         return _this.timerDividerIncrement.apply(_this, arguments);
      },
      timerCounterIncrement: function () {
         return _this.timerCounterIncrement.apply(_this, arguments);
      },
      start: 256
   });
   
}
