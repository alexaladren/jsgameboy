<?php

if($_GET['d'] == "roms"){
	$result = array();
	$romdir = opendir("roms");
	while($romfile = readdir($romdir)){
		if($romfile == "." || $romfile == "..") continue;
		$rom = array();
		$rom["file"] = $romfile;
		$file = fopen("roms/".$romfile, "r");
		fseek($file, 0x134);
		$name = fread($file, 16);
		$namepos = strpos($name, 0);
		$rom["name"] = substr($name, 0, $namepos != false? $namepos : 16);
		array_push($result, $rom); 
	}
	echo json_encode($result);
}

?>