#! /usr/bin/env python
import sys, lexjs;



# Execute
def main():
	f = open("test1.js", "rb");
	s = f.read().decode("utf-8");
	f.close();

	lexer = lexjs.Lexer(s);

	while (True):
		t = lexer.get_token();
		if (t is None): break;
		sys.stdout.write("{0:s}\n".format(str(t)));

	return 0;



# Run
if (__name__ == "__main__"): sys.exit(main());

