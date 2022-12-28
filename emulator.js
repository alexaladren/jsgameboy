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

var title;
var rom;

function addROMfromComputer(ev){
   rominput = document.createElement("input");
   rominput.type = "file";
   rominput.onchange = loadROMfromComputer;
   rominput.click();
}

function loadROMfromComputer(ev){
   
   var reader = new FileReader();
   
   reader.onload = function(ev){
      rom = this.result;
      loadROM(rom);
   }
   
   reader.readAsArrayBuffer(ev.target.files[0]);
}

function loadROM(arraybuffer){
   
   if(window.gb != undefined){
      gb.stop();
      gb = null;
   }
   
   gb = new GameBoy(arraybuffer, document.getElementById("display"));
      
   var data = document.getElementById("data");
   title = "";
   for(var i = 0; gb.getAddress(308+i) != 0; i++){
      title += String.fromCharCode(gb.getAddress(308+i));
   }
   document.getElementById("title").innerHTML = title;
   
   switch(gb.getAddress(0x0147)){
      case 0: document.getElementById("cartridge").innerHTML = "ROM ONLY"; break;
      case 1: document.getElementById("cartridge").innerHTML = "MBC1"; break;
      case 2: document.getElementById("cartridge").innerHTML = "MBC1+RAM"; break;
      case 3: document.getElementById("cartridge").innerHTML = "MBC1+RAM+BATTERY"; break;
      case 5: document.getElementById("cartridge").innerHTML = "MBC2"; break;
      case 6: document.getElementById("cartridge").innerHTML = "MBC2+BATTERY"; break;
      case 8: document.getElementById("cartridge").innerHTML = "ROM+RAM"; break;
      case 9: document.getElementById("cartridge").innerHTML = "ROM+RAM+BATTERY"; break;
      default: document.getElementById("cartridge").innerHTML = "Unknown ("+gb.getAddress(0x0147)+")"; break;
   }
   document.getElementById("cartridge").innerHTML += "<br/>"+(2*Math.pow(2,gb.getAddress(0x0148)))*16+"KB ROM";
   switch(gb.getAddress(0x0149)){
      case 0: document.getElementById("cartridge").innerHTML += " - No RAM"; break;
      case 1: document.getElementById("cartridge").innerHTML += " - 2 KB RAM"; break;
      case 2: document.getElementById("cartridge").innerHTML += " - 8 KB RAM"; break;
      case 3: document.getElementById("cartridge").innerHTML += " - 32 KB RAM"; break;
   }
   
   document.getElementById("cartridge-data").style.display = "";
   
   if(gb.ramSpace > 0){
      document.getElementById("delete").style.display = "";
      
      if(localStorage.getItem(title) != null){
         var data = window.atob(localStorage.getItem(title));
         gb.setCartridgeRam(data);
      }
      
   }else{
      document.getElementById("delete").style.display = "none";
   }

   gb.onFPS = function(msg){
      document.getElementById("fps").innerHTML = msg;
      if (gb.ramSpace > 0) {
         saveCartridgeRam();
      }
   }
   
   gb.init();
}

function pause(){
   gb.pause();
   if(gb.paused){
      document.getElementById("pause-button").style.backgroundColor = "#ff7735";
   }else{
      document.getElementById("pause-button").style.backgroundColor = "";
   }
}

function keyPress(ev){
   if(ev.keyCode == 37){ // Izquierda
      gb.keyPressed(2);
      document.getElementById("key-left").classList.add('pressed');
   }else if(ev.keyCode == 38){ // Arriba
      gb.keyPressed(4);
      document.getElementById("key-up").classList.add('pressed');
   }else if(ev.keyCode == 39){ // Derecha
      gb.keyPressed(1);
      document.getElementById("key-right").classList.add('pressed');
   }else if(ev.keyCode == 40){ // Abajo
      gb.keyPressed(8);
      document.getElementById("key-down").classList.add('pressed');
   }else if(ev.keyCode == 65){ // B
      gb.keyPressed(32);
      document.getElementById("key-b").classList.add('pressed');
   }else if(ev.keyCode == 83){ // A
      gb.keyPressed(16);
      document.getElementById("key-a").classList.add('pressed');
   }else if(ev.keyCode == 87){ // Start
      gb.keyPressed(128);
      document.getElementById("key-start").classList.add('pressed');
   }else if(ev.keyCode == 81){ // Select
      gb.keyPressed(64);
      document.getElementById("key-select").classList.add('pressed');
   }
}

function keyRelease(ev){
   if(ev.keyCode == 37){ // Izquierda
      gb.keyReleased(2);
      document.getElementById("key-left").classList.remove('pressed');
   }else if(ev.keyCode == 38){ // Arriba
      gb.keyReleased(4);
      document.getElementById("key-up").classList.remove('pressed');
   }else if(ev.keyCode == 39){ // Derecha
      gb.keyReleased(1);
      document.getElementById("key-right").classList.remove('pressed');
   }else if(ev.keyCode == 40){ // Abajo
      gb.keyReleased(8);
      document.getElementById("key-down").classList.remove('pressed');
   }else if(ev.keyCode == 65){ // B
      gb.keyReleased(32);
      document.getElementById("key-b").classList.remove('pressed');
   }else if(ev.keyCode == 83){ // A
      gb.keyReleased(16);
      document.getElementById("key-a").classList.remove('pressed');
   }else if(ev.keyCode == 87){ // Start
      gb.keyReleased(128);
      document.getElementById("key-start").classList.remove('pressed');
   }else if(ev.keyCode == 81){ // Select
      gb.keyReleased(64);
      document.getElementById("key-select").classList.remove('pressed');
   }
}

function saveCartridgeRam(){
   var data = "";
   for(var i = 0; i < gb.cartram8bit.length; i++){
      data += String.fromCharCode(gb.cartram8bit[i]);
   }
   localStorage.setItem(title, window.btoa(data));
}

function deleteCartridgeRam(){
   if(window.confirm("Are you sure you want to delete your save and restart the game?")){
      localStorage.removeItem(title);
      loadROM(rol);
   }
}

window.onkeydown = keyPress;
window.onkeyup = keyRelease;
