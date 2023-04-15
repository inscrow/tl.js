#!/usr/bin/env node
const fs = require('fs');
const prpt = require('prompt-sync')();
let status = new Object();
const DATADIR = `${process.env.HOME}/.local/share/tl.js`;
const DATAFILE = `${DATADIR}/data`;

function bootstrap() {
	if (!fs.existsSync(DATADIR))
		fs.mkdirSync(DATADIR);
	if (!fs.existsSync(DATAFILE))
		fs.appendFileSync(DATAFILE, JSON.stringify(status));
}

function writeToFile() {
	fs.writeFileSync(DATAFILE, JSON.stringify(status), (err) => {
		if (err) {
			console.log(err);
			console.log(JSON.stringify(status));
		}
	})
}

function close() {
	process.stdin.setRawMode(false);
	console.log("\x1b[?25h"); // show cursor again
	writeToFile();
}

function startup() {
	process.stdin.setRawMode(true);
	process.on('exit', close);
	process.stdin.setEncoding("utf8");
	console.log("\x1b[?25l"); // hide cursor

	status = JSON.parse(fs.readFileSync(DATAFILE));
	fs.watch(DATAFILE, (eventType, fname) => {
		if (eventType === 'change')
			status = JSON.parse(fs.readFileSync(DATAFILE));
			draw();
	});
}

// FIXME: app flickers at every redraw
function draw() {
	console.clear();
	console.log("\x1b[32;1m*TODO LIST*\x1b[0m");
	if (status.list !== undefined && status.list.length > 0 && status.cursor !== undefined) {
		for (let i = 0; i < status.list.length; i++) {
			if (i == status.cursor)
				console.log(`\n\x1b[45;30m* ${status.list[i]}\x1b[0m`);
			else
				console.log(`\n* ${status.list[i]}`)
		}
	}
}

function move(delta) {
	if (status.cursor !== undefined &&
		status.list !== undefined &&
		status.cursor+delta < status.list.length &&
		status.cursor+delta >= 0) {
		status.cursor += delta;
		draw();
	}
}

function prompt(base) {
	process.stdin.setRawMode(false);
	console.log("\x1b[?25h"); // show cursor again
	if (base !== undefined)
		var res = prpt("* ", base).trim();
	else
		var res = prpt("* ").trim();
	console.log("\x1b[?25l"); // hide cursor
	process.stdin.setRawMode(true);
	return res;
}

function append() {
	if (status.list === undefined)
		status.list = new Array();
	status.list.push(prompt());
	if (status.cursor === undefined)
		status.cursor = 0;
	// Because `prompt` function already draws the '*', I don't need to redraw
	// anything
}

function remove() {
	if (status.list !== undefined && status.cursor !== undefined)
		status.list.splice(status.cursor, 1);
	if (status.cursor >= status.list.length)
		status.cursor = status.list.length - 1;
	if (status.list.length === 0)
		status.cursor = undefined;
	draw();
}

function change() {
	if (status.list !== undefined && status.cursor !== undefined) {
		status.list.splice(status.cursor, 1, prompt(status.list[status.cursor]));
		draw();
	}
}

function handleKey(key) {
	switch (key) {
		// exit
		case '\u0003':
		case '\u0004':
		case '\u0011':
			process.exit();
			break; // leaving here just in case `process.exit()` fails for some reason

		// move cursor
		case 'j':
			move(+1);
			break;
		case 'k':
			move(-1);
			break;

		// change the list
		case 'a':
			append();
			writeToFile();
			break;
		case 'r':
		case 'c':
		case 's':
			change();
			writeToFile();
			break;
		case '\u0020':
		case '\u000d':
			remove();
			writeToFile();
			break;

		default:
			break;
	}
}

function run() {
	const args = process.argv.slice(2);
	if (args.length == 0) {
		process.stdin.resume(); // this is necessary to listen to key events
		draw(); // initial draw, then draw when a valid key is inserted
		// I don't need a loop, because this is a event handler, and it doesn't get
		// dispactched all the times
		process.stdin.on('data', handleKey);
	} else {
		const newTask = args.join(' ');
		status.list.push(newTask);
		process.exit();
	}
}

bootstrap();
startup();
run();
