# Libaries
import re;



# Descriptor class
class Descriptor(object):
	class __Flags(object):
		def __init__(self):
			self.NONE = 0;

	def __init__(self, flags, flag_ignore):
		self.flags = self.__Flags();
		self.flag_names = [ "NONE" ];
		self.flag_ignore = -1;
		self.type_flags = [];
		self.type_names = [];
		self.states = [];

		for i in range(len(flags)):
			f = flags[i];
			setattr(self.flags, f, 1 << i);
			self.flag_names.append(f);

		self.flag_ignore = getattr(self.flags, flag_ignore);

	def define_types(self, types):
		i = 0;
		for k in types:
			self.type_flags.append(types[k]);
			self.type_names.append(k);
			setattr(self, k, i);
			i += 1;

	def define_state(self, state):
		self.states.append(state);

	def type_to_string(self, token_type):
		if (token_type >= 0 and token_type < len(self.type_names)):
			return self.type_names[token_type];
		return "";

	def flags_to_string(self, flags):
		if (flags == 0):
			return self.flag_names[0];

		s = "";
		f = 0x1;

		for i in range(1, len(self.flag_names)):
			if ((flags & f) != 0):
				if (len(s) > 0):
					s += " | ";
				s += self.flag_names[i];

			f <<= 1;

		return s;



# Token class
class Token(object):
	def __init__(self, text, type, flags):
		self.text = text;
		self.type = type;
		self.flags = flags;

	@classmethod
	def dummy(cls):
		return cls("", -1, 0);



# Bracketed class
class Bracket(object):
	def __init__(self, before, tid, id, opener):
		self.before = before;
		self.token_id = tid;
		self.id = id;
		self.opener = opener;
		self.other = None;



# Tokenizer class
class Lexer(object):
	def __init__(self, descriptor, text):
		self.descriptor = descriptor;
		self.pos = 0;
		self.text = text;
		self.state = 0;
		self.brackets = [];
		self.bracket_stack = [];
		self.previous = Token.dummy();
		self.token_id = 0;

	def bracket_track(self, opener):
		# Bracket matching
		if (opener):
			b = Bracket(self.previous, self.token_id, len(self.brackets), True);
			self.brackets.append(b);

			self.bracket_stack.append(b);
		elif (len(self.bracket_stack) > 0):
			b = Bracket(None, self.token_id, len(self.brackets), False);
			self.brackets.append(b);

			b.other = self.bracket_stack.pop();
			b.other.other = b;
		# else: # syntax error

	def create_token(self, token_type, flags, end):
		token = Token(self.text[self.pos : end], token_type, self.descriptor.type_flags[token_type] | flags);

		self.pos = end;

		if ((token.flags & self.descriptor.flag_ignore) != self.descriptor.flag_ignore):
			self.previous = token;
			self.token_id += 1;

		return token;

	def repr_token(self, token):
		return "Token(text=" + repr(token.text) + ", type=" + self.descriptor.type_to_string(token.type) + ", flags=" + self.descriptor.flags_to_string(token.flags) + ")";

	def match_tree(self, obj, p, p_max):
		value = None;
		o = obj;

		while (True):
			c = self.text[p];
			if (c not in o): break;
			p += 1;

			f = o[c][0];
			if (f is not None):
				value = [ f , p ];

			o = o[c][1];
			if (o is None or p >= p_max): break;

		# Should return [ flags , end ], or None
		return value;

	def get_token(self):
		# Complete?
		if (self.pos >= len(self.text)): return None;

		checks = self.descriptor.states[self.state];
		p = self.pos;
		i_max = len(checks) - 1;

		# Check formations
		for i in range(i_max):
			c = checks[i];
			m = c[0](self, p);
			if (m is not None):
				t = c[1](self, m[0], m[1]);
				if (t is not None):
					return t;

		# Default type
		p += 1;
		flags = 0;

		c = checks[i_max];
		m = c[0](self, p);
		if (m is not None):
			flags = m[0];
			p = m[1];

		return c[1](self, flags, p);



# Useful functions
def tree(obj):
	obj_new = {};

	for k in obj:
		o = obj_new;
		i_max = len(k) - 1;
		for i in range(i_max):
			c = k[i];
			if (c in o):
				if (o[c][1] is None):
					o[c][1] = {};
			else:
				o[c] = [ None , {} ];

			o = o[c][1];

		c = k[i_max];
		if (c in o):
			o[c][0] = obj[k];
		else:
			o[c] = [ obj[k] , None ];

	return obj_new;

def check_regex(pattern):
	re_pattern = re.compile(pattern, re.DOTALL | re.U);
	return (lambda self,p: __check_regex_lambda(self, p, re_pattern));

def __check_regex_lambda(self, p, re_pattern):
	m = re_pattern.match(self.text, p);
	if (m is None): return None;
	return [ 0 , m.end() ];

def check_tree(obj):
	return (lambda self,p: self.match_tree(obj, p, len(self.text)));

def create_token(token_type):
	return (lambda self,f,p: self.create_token(token_type, f, p));

def to_regex_class(obj):
	s = [];
	o = {};

	for k in obj:
		for c in k:
			o[c] = True;

	for k in o:
		s.append(k);

	return "".join(s);


