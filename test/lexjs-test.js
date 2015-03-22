// Testing with node
(function () {
	"use strict";

	// Import
	var fs = require("fs"),
		lexjs = require("./lexjs");



	// Main
	var main = function () {
		var s = fs.readFileSync("test1.js", {
			encoding: "utf8",
			flag: "r",
		});

		var lexer = new lexjs.Lexer(s),
			t;

		while (true) {
			t = lexer.get_token();
			if (t === null) break;
			process.stdout.write(t.to_string() + "\n");
		}

		return 0;
	};



	// Execute
	if (require.main === process.mainModule) process.exit(main());

}).call(this);


