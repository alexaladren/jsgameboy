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

function getROMlist(){
   var http = new XMLHttpRequest();
   http.open("GET","data.php?d=roms");
   http.onreadystatechange = function(){
      if(http.readyState == 4 && http.status == 200){
         var romlist = document.getElementById("romlist");
         var data = JSON.parse(http.responseText);
         for(var i = 0; i < data.length; i++){
            var div = document.createElement("div");
            div.data = data[i];
            div.innerHTML = data[i].name;
            div.onclick = function(){
               downloadROM(this.data.file);
            }
            romlist.appendChild(div);
         }
      }
   }
   http.send();
}

function downloadROM(name){
   var http = new XMLHttpRequest();
   http.open("GET","roms/"+name);
   http.responseType = "arraybuffer";
   http.onreadystatechange = function(){
      if(http.readyState == 4 && http.status == 200){
         loadROM(http.response);
      }
   }
   http.send();
}

function addROMfromComputer(ev){
   rominput = document.createElement("input");
   rominput.type = "file";
   rominput.onchange = loadROMfromComputer;
   rominput.click();
}

function loadROMfromComputer(ev){
   
   var reader = new FileReader();
   
   reader.onload = function(ev){
      loadROM(this.result);
   }
   
   reader.readAsArrayBuffer(ev.target.files[0]);
}

function loadROM(arraybuffer){
   
   if(window.gb != undefined){
      clearInterval(gb.interval);
      document.getElementById("display").getContext("2d").setTransform(1,0,0,1,0,0);
   }
   
   gb = new GameBoy(arraybuffer);
   gb.displaycanvas = document.getElementById("display").getContext("2d");
   
   document.getElementById("display").getContext("2d").scale(2,2);
   
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
      document.getElementById("save").style.display = "";
      document.getElementById("delete").style.display = "none";
      
      if(localStorage.getItem(title) != null){
         document.getElementById("delete").style.display = "";
         
         var data = window.atob(localStorage.getItem(title));
         gb.setCartridgeRam(data);
      }
      
   }else{
      document.getElementById("save").style.display = "none";
      document.getElementById("delete").style.display = "none";
   }

   gb.onFPS = function(msg){
      document.getElementById("fps").innerHTML = msg;
   }
   
   gb.init();
}

function pause(){
   gb.pause();
   if(gb.paused){
      document.getElementById("display").style.opacity = 0.5;
   }else{
      document.getElementById("display").style.opacity = 1;
   }
}

function keyPress(ev){
   if(ev.keyCode == 37){ // Izquierda
      gb.keyPressed(2);
   }else if(ev.keyCode == 38){ // Arriba
      gb.keyPressed(4);
   }else if(ev.keyCode == 39){ // Derecha
      gb.keyPressed(1);
   }else if(ev.keyCode == 40){ // Abajo
      gb.keyPressed(8);
   }else if(ev.keyCode == 65){ // B
      gb.keyPressed(32);
   }else if(ev.keyCode == 83){ // A
      gb.keyPressed(16);
   }else if(ev.keyCode == 87){ // Start
      gb.keyPressed(128);
   }else if(ev.keyCode == 81){ // Select
      gb.keyPressed(64);
   }
}

function keyRelease(ev){
   if(ev.keyCode == 37){ // Izquierda
      gb.keyReleased(2);
   }else if(ev.keyCode == 38){ // Arriba
      gb.keyReleased(4);
   }else if(ev.keyCode == 39){ // Derecha
      gb.keyReleased(1);
   }else if(ev.keyCode == 40){ // Abajo
      gb.keyReleased(8);
   }else if(ev.keyCode == 65){ // B
      gb.keyReleased(32);
   }else if(ev.keyCode == 83){ // A
      gb.keyReleased(16);
   }else if(ev.keyCode == 81){ // Start
      gb.keyReleased(128);
   }else if(ev.keyCode == 87){ // Select
      gb.keyReleased(64);
   }
}

function toHex(number){
   var result = "";
   if(number == 0) result = "0";
   while(number != 0){
      switch(number % 16){
         case 10: result += "A"; break;
         case 11: result += "B"; break;
         case 12: result += "C"; break;
         case 13: result += "D"; break;
         case 14: result += "E"; break;
         case 15: result += "F"; break;
         default: result += number % 16;
      }
      number = Math.floor(number/16);
   }
   var result2 = "";
   for(var i = result.length; i > 0; i--){
      result2 += result.charAt(i-1);
   }
   return result2;
}

function saveCartridgeRam(){
   var data = "";
   for(var i = 0; i < gb.cartram8bit.length; i++){
      data += String.fromCharCode(gb.cartram8bit[i]);
   }
   localStorage.setItem(title, window.btoa(data));
}

function deleteCartridgeRam(){
   if(window.confirm("¿Estás seguro de que quieres eliminar tu partida guardada y reiniciar el juego?")){
      localStorage.removeItem(title);
      loadROM(rommap);
   }
}

window.onload = getROMlist;
window.onkeydown = keyPress;
window.onkeyup = keyRelease;
