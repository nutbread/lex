#!/usr/bin/env python
import os, sys;
sys.path.append(os.path.abspath(u"../src"));

import lex, lexjs, lexpy;
lexjs = lexjs.gen(lex);
lexpy = lexpy.gen(lex);



# Execute
def main():
	# JavaScript
	f = open(u"../test/test1.js", "rb");
	s = f.read().decode("utf-8");
	f.close();

	lexer = lex.Lexer(lexjs, s);

	while (True):
		t = lexer.get_token();
		if (t is None): break;
		sys.stdout.write("{0:s}\n".format(lexer.repr_token(t)));

	# Sep
	sys.stdout.write("\n\n\n");

	# Python
	f = open(u"../test/test1.py", "rb");
	s = f.read().decode("utf-8");
	f.close();

	lexer = lex.Lexer(lexpy, s);

	while (True):
		t = lexer.get_token();
		if (t is None): break;
		sys.stdout.write("{0:s}\n".format(lexer.repr_token(t)));

	# Done
	return 0;



# Run
if (__name__ == "__main__"): sys.exit(main());


