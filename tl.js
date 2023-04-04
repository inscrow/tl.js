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

function close() {
	process.stdin.setRawMode(false);
	console.log("\x1b[?25h"); // show cursor again
	fs.writeFileSync(DATAFILE, JSON.stringify(status), (err) => {
		if (err) {
			console.log(err);
			console.log(JSON.stringify(status)); // log `status` to `stdout` on error
		}
	})
}

function startup() {
	process.stdin.setRawMode(true);
	process.on('exit', close);
	process.stdin.setEncoding("utf8");
	console.log("\x1b[?25l"); // hide cursor

	status = JSON.parse(fs.readFileSync(DATAFILE));
}

function draw() {
	console.clear();
	console.log("\x1b[32;1m*TODO LIST*\x1b[0m");
	if (status.list !== undefined && status.list.length > 0 && status.cursor !== undefined) {
		for (let i = 0; i < status.cursor; i++) {
			console.log(`\n* ${status.list[i]}`)
		}
		console.log(`\n\x1b[45;30m* ${status.list[status.cursor]}\x1b[0m`);
		for (let i = status.cursor+1; i < status.list.length; i++) {
			console.log(`\n* ${status.list[i]}`)
		}
	}
}

function moveUp() {
	if (status.cursor !== undefined && status.cursor > 0)
		status.cursor--;
}

function moveDown() {
	if (status.cursor !== undefined && status.list !== undefined && status.cursor < status.list.length-1)
		status.cursor++;
}

function prompt() {
	process.stdin.setRawMode(false);
	console.log("\x1b[?25h"); // show cursor again
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
}

function remove() {
	if (status.list !== undefined && status.cursor !== undefined)
		status.list.splice(status.cursor, 1);
	if (status.cursor >= status.list.length)
		status.cursor = status.list.length - 1;
	if (status.list.length === 0)
		status.cursor = undefined;
}

function change() {
	if (status.list !== undefined && status.cursor !== undefined)
		status.list.splice(status.cursor, 1, prompt());
}

// FIXME: sometimes app lags a bit, I don't know if it's because of redrawing
// or because of this switch statement
function handleKey(key) {
	var validKey = true;
	switch (key) {
		// exit
		case '\u0003':
		case '\u0004':
		case '\u0011':
			process.exit();
			break; // leaving here just in case `process.exit()` fails for some reason

		// move cursor
		case 'j':
			moveDown();
			break;
		case 'k':
			moveUp();
			break;

		// change the list
		case 'a':
			append();
			break;
		case 'r':
		case 'c':
		case 's':
			change();
			break;
		case '\u0020':
		case '\u000d':
			remove();
			break;

		default:
			validKey = false;
			break;
	}
	if (validKey)
		draw();
}

function run() {
	process.stdin.resume(); // this is necessary to listen to key events
	draw(); // initial draw, then draw when a valid key is inserted
	// I don't need a loop, because this is a event handler, and it doesn't get
	// dispactched all the times
	process.stdin.on('data', handleKey);
}

bootstrap();
startup();
run();
