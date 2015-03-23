#!/usr/bin/env python
import sys, lexjs;



# Class
class X(object):
	def __init__(self):
		pass;



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

	if (
		True and \
		False
	):
		return None;


	"test" + str(0)
	u"test" + str(0)
	ur"test" + str(0)
	'test' + str(0)
	u'test' + str(0)
	ur'test' + str(0)
	u"""te"st""" + str(0)
	ur"""te"st""" + str(0)
	u'''te'st''' + str(0)
	ur'''te'st''' + str(0)
	'''asdf\'''' + str(0)
	'''multi
	li\'''ne
	string'''


	return 0;



# Run
if (__name__ == "__main__"): sys.exit(main());

