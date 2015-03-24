// Testing with node
(function () {
	"use strict";

	// Import
	var fs = require("fs"),
		lex = require("../src/lex"),
		lexjs = require("../src/lexjs").gen(lex),
		lexpy = require("../src/lexpy").gen(lex),
		lexcss = require("../src/lexcss").gen(lex);



	// Main
	var main = function () {
		var lexer, s, t;

		// JavaScript
		s = fs.readFileSync("test1.js", {
			encoding: "utf8",
			flag: "r",
		});

		lexer = new lex.Lexer(lexjs, s);

		while (true) {
			t = lexer.get_token();
			if (t === null) break;
			process.stdout.write(lexer.repr_token(t) + "\n");
		}

		// Sep
		process.stdout.write("\n\n\n");

		// Python
		s = fs.readFileSync("test1.py", {
			encoding: "utf8",
			flag: "r",
		});

		lexer = new lex.Lexer(lexpy, s);

		while (true) {
			t = lexer.get_token();
			if (t === null) break;
			process.stdout.write(lexer.repr_token(t) + "\n");
		}

		// Sep
		process.stdout.write("\n\n\n");

		// Python
		s = fs.readFileSync("test2.css", {
			encoding: "utf8",
			flag: "r",
		});

		lexer = new lex.Lexer(lexcss, s);

		while (true) {
			t = lexer.get_token();
			if (t === null) break;
			process.stdout.write(lexer.repr_token(t) + "\n");
		}

		// Done
		return 0;
	};



	// Execute
	if (require.main === process.mainModule) process.exit(main());

}).call(this);


