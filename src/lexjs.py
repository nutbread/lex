# Libaries
import re;



# Generator function
def gen(lex):
	# Language descriptor
	descriptor = lex.Descriptor([
		u"IGNORE",
		u"MEMBER",
		u"NEXT_IS_MEMBER",
		u"NEXT_NOT_REGEX",
		u"NEXT_NOT_REGEX_CHECK",
		u"NEXT_NO_OP_PREFIX",
		u"START_REGEX",
		u"START_STRING",
		u"START_COMMENT",
		u"BRACKET",
		u"BRACKET_CLOSE",
		u"FUTURE",
		u"STRICT_REQUIRED",
	], u"IGNORE");
	flags = descriptor.flags;
	descriptor.define_types({
		u"INVALID": flags.NEXT_NOT_REGEX,
		u"KEYWORD": 0,
		u"IDENTIFIER": flags.NEXT_NO_OP_PREFIX | flags.NEXT_NOT_REGEX,
		u"NUMBER": flags.NEXT_NO_OP_PREFIX | flags.NEXT_NOT_REGEX,
		u"STRING": flags.NEXT_NO_OP_PREFIX | flags.NEXT_NOT_REGEX,
		u"REGEX": flags.NEXT_NO_OP_PREFIX | flags.NEXT_NOT_REGEX,
		u"OPERATOR": 0,
		u"WHITESPACE": flags.IGNORE,
		u"COMMENT": flags.IGNORE,
	});
	keywords = {
		u"break":      flags.NEXT_NOT_REGEX,
		u"case":       0,
		u"class":      flags.NEXT_NOT_REGEX,
		u"catch":      flags.NEXT_NOT_REGEX,
		u"const":      flags.NEXT_NOT_REGEX,
		u"continue":   flags.NEXT_NOT_REGEX,
		u"debugger":   flags.NEXT_NOT_REGEX,
		u"default":    flags.NEXT_NOT_REGEX,
		u"delete":     0,
		u"do":         0,
		u"else":       0,
		u"export":     flags.NEXT_NOT_REGEX,
		u"extends":    flags.NEXT_NOT_REGEX,
		u"finally":    flags.NEXT_NOT_REGEX,
		u"for":        flags.NEXT_NOT_REGEX,
		u"function":   flags.NEXT_NOT_REGEX,
		u"if":         flags.NEXT_NOT_REGEX,
		u"import":     flags.NEXT_NOT_REGEX,
		u"in":         0,
		u"instanceof": 0,
		u"let":        flags.NEXT_NOT_REGEX,
		u"new":        0,
		u"return":     0,
		u"super":      flags.NEXT_NOT_REGEX,
		u"switch":     flags.NEXT_NOT_REGEX,
		u"this":       flags.NEXT_NOT_REGEX | flags.NEXT_NO_OP_PREFIX,
		u"throw":      0,
		u"try":        flags.NEXT_NOT_REGEX,
		u"typeof":     0,
		u"var":        flags.NEXT_NOT_REGEX,
		u"void":       0,
		u"while":      flags.NEXT_NOT_REGEX,
		u"with":       flags.NEXT_NOT_REGEX,
		u"yield":      0,

		u"await": flags.NEXT_NOT_REGEX | flags.FUTURE,
		u"enum":  flags.NEXT_NOT_REGEX | flags.FUTURE,

		u"implements": flags.NEXT_NOT_REGEX | flags.FUTURE | flags.STRICT_REQUIRED,
		u"interface":  flags.NEXT_NOT_REGEX | flags.FUTURE | flags.STRICT_REQUIRED,
		u"public":     flags.NEXT_NOT_REGEX | flags.FUTURE | flags.STRICT_REQUIRED,
		u"private":    flags.NEXT_NOT_REGEX | flags.FUTURE | flags.STRICT_REQUIRED,
		u"package":    flags.NEXT_NOT_REGEX | flags.FUTURE | flags.STRICT_REQUIRED,
		u"protected":  flags.NEXT_NOT_REGEX | flags.FUTURE | flags.STRICT_REQUIRED,
		u"static":     flags.NEXT_NOT_REGEX | flags.FUTURE | flags.STRICT_REQUIRED,

		# u"abstract":     flags.NEXT_NOT_REGEX | flags.PAST,
		# u"boolean":      flags.NEXT_NOT_REGEX | flags.PAST,
		# u"byte":         flags.NEXT_NOT_REGEX | flags.PAST,
		# u"char":         flags.NEXT_NOT_REGEX | flags.PAST,
		# u"double":       flags.NEXT_NOT_REGEX | flags.PAST,
		# u"final":        flags.NEXT_NOT_REGEX | flags.PAST,
		# u"float":        flags.NEXT_NOT_REGEX | flags.PAST,
		# u"goto":         flags.NEXT_NOT_REGEX | flags.PAST,
		# u"int":          flags.NEXT_NOT_REGEX | flags.PAST,
		# u"long":         flags.NEXT_NOT_REGEX | flags.PAST,
		# u"native":       flags.NEXT_NOT_REGEX | flags.PAST,
		# u"short":        flags.NEXT_NOT_REGEX | flags.PAST,
		# u"synchronized": flags.NEXT_NOT_REGEX | flags.PAST,
		# u"transient":    flags.NEXT_NOT_REGEX | flags.PAST,
		# u"volatile":     flags.NEXT_NOT_REGEX | flags.PAST,

		u"null":  flags.NEXT_NOT_REGEX | flags.NEXT_NO_OP_PREFIX,
		u"true":  flags.NEXT_NOT_REGEX | flags.NEXT_NO_OP_PREFIX,
		u"false": flags.NEXT_NOT_REGEX | flags.NEXT_NO_OP_PREFIX,
	};
	operators = lex.tree({
		u">>>": 0,
		u">>=": 0,
		u">>": 0,
		u">=": 0,
		u">": 0,

		u"<<=": 0,
		u"<<": 0,
		u"<=": 0,
		u"<": 0,

		u"===": 0,
		u"==": 0,
		u"=": 0,

		u"!==": 0,
		u"!=": 0,
		u"!": 0,

		u"&&": 0,
		u"&=": 0,
		u"&": 0,

		u"||": 0,
		u"|=": 0,
		u"|": 0,

		u"++": 0 | flags.NEXT_NOT_REGEX | flags.NEXT_NO_OP_PREFIX,
		u"+=": 0,
		u"+": 0,

		u"--": 0 | flags.NEXT_NOT_REGEX | flags.NEXT_NO_OP_PREFIX,
		u"-=": 0,
		u"-": 0,

		u"*=": 0,
		u"*": 0,

		u"/=": flags.START_REGEX,
		u"/": flags.START_REGEX,

		u"%=": 0,
		u"%": 0,

		u"^=": 0,
		u"^": 0,

		u"~": 0,
		u"?": 0,
		u":": 0,
		u";": 0,
		u",": 0,
		u".": flags.NEXT_IS_MEMBER | flags.NEXT_NOT_REGEX | flags.NEXT_NO_OP_PREFIX,

		u"(": flags.BRACKET,
		u"[": flags.BRACKET,
		u"{": flags.BRACKET,
		u")": flags.BRACKET | flags.BRACKET_CLOSE | flags.NEXT_NOT_REGEX | flags.NEXT_NOT_REGEX_CHECK | flags.NEXT_NO_OP_PREFIX,
		u"]": flags.BRACKET | flags.BRACKET_CLOSE | flags.NEXT_NOT_REGEX | flags.NEXT_NO_OP_PREFIX,
		u"}": flags.BRACKET | flags.BRACKET_CLOSE,

		u"//": flags.START_COMMENT,
		u"/*": flags.START_COMMENT,
		u"\"": flags.START_STRING,
		u"\'": flags.START_STRING,
	});

	# Matching logic
	re_comment = re.compile(u"[^\\r\\n\u2028\u2029]*");
	re_comment_multi = re.compile(u".*?(?:\\*/|$)", re.DOTALL);
	re_regex_flags = re.compile(u"[a-z]*");
	re_newlines_search = re.compile(u"[\\r\\n\u2028\u2029]");
	re_newlines_split = re.compile(u"[\\n\u2028\u2029]|\\r\\n?");

	def match_string(self, t_info):
		# Match to end of string
		escaped = False;
		p = t_info[2];
		p_max = len(self.text);
		quote = self.text[self.pos]

		while (p < p_max):
			c = self.text[p];
			if (escaped):
				escaped = False;
				if (c == u"\r" and p + 1 < p_max and self.text[p + 1] == u"\n"):
					p += 1;
			else:
				if (c == quote):
					p += 1;
					break;
				elif (c == u"\\"):
					escaped = True;
				elif (string_contains_newline(c)):
					break;

			p += 1;

		t_info[0] = self.descriptor.STRING;
		t_info[2] = p;

	def match_comment(self, t_info):
		# Check which type
		p = t_info[2];
		re_pattern = re_comment;
		if (self.text[self.pos : p] != u"//"):
			re_pattern = re_comment_multi;

		# Match the comment
		m = re_pattern.match(self.text, p);

		# Create the token
		t_info[0] = self.descriptor.COMMENT;
		t_info[2] = m.end();

	def match_regex(self, t_info):
		# Check if regex is allowed
		if ((self.previous.flags & self.descriptor.flags.NEXT_NOT_REGEX) != 0 and ((self.previous.flags & self.descriptor.flags.NEXT_NOT_REGEX_CHECK) == 0 or not check_if_regex_valid(self))):
			return;

		# Match the regex
		escaped = False;
		bracketed = False;
		p = t_info[2];
		p_max = len(self.text);

		while (p < p_max):
			c = self.text[p];
			if (escaped):
				if (string_contains_newline(c)):
					break;
				escaped = False;
			else:
				if (c == u"\\"):
					escaped = True;
				elif (c == u"/"):
					if (not bracketed):
						# Match flags and end
						m = re_regex_flags.match(self.text, p + 1);
						p = m.end();
						break;
				elif (c == u"["):
					bracketed = True;
				elif (c == u"]"):
					bracketed = False;
				elif (string_contains_newline(c)):
					break;

			p += 1;

		# Create the token
		t_info[0] = self.descriptor.REGEX;
		t_info[2] = p;

	def check_if_regex_valid(self):
		# Check for an if, for, or while statement
		if (len(self.brackets) > 0):
			b = self.brackets[-1];

			if (b.token_id == self.token_id - 1 and not b.opener):
				t = b.other.before;
				if (t.type == self.descriptor.KEYWORD and t.text in [ u"if" , u"for" , u"while" ]):
					# Probably valid
					return True;

		# Invalid
		return False;

	# Token creation functions
	def create_token_number(self, flags, p):
		if ((self.previous.flags & self.descriptor.flags.NEXT_NO_OP_PREFIX) == 0 or self.match_tree(operators, self.pos, self.pos + 1) is None):
			return self.create_token(descriptor.NUMBER, flags, p);

		return None;

	def create_token_word(self, flags, p):
		token_type = self.descriptor.IDENTIFIER;

		if ((self.previous.flags & self.descriptor.flags.NEXT_IS_MEMBER) != 0):
			# Member
			flags |= self.descriptor.flags.MEMBER;
		else:
			# Check if keyword
			word = self.text[self.pos : p];
			if (word in keywords):
				token_type = self.descriptor.KEYWORD;
				flags |= keywords[word];

		return self.create_token(token_type, flags, p);

	def create_token_operator(self, flags, p):
		t_info = [ self.descriptor.OPERATOR , flags , p ];

		if ((flags & self.descriptor.flags.START_STRING) != 0):
			# String
			match_string(self, t_info);
		elif ((flags & self.descriptor.flags.START_COMMENT) != 0):
			# Comment
			match_comment(self, t_info);
		elif ((flags & self.descriptor.flags.START_REGEX) != 0):
			# Regex
			match_regex(self, t_info);

		# Bracket tracking
		if ((flags & self.descriptor.flags.BRACKET) != 0):
			self.bracket_track((flags & self.descriptor.flags.BRACKET_CLOSE) == 0);

		return self.create_token(t_info[0], t_info[1], t_info[2]);

	# Create descriptor
	descriptor.define_state_names([ u"DEFAULT" ]);
	descriptor.define_state([ # state 0
		[
			lex.check_regex(u"\\s+"), # whitespace
			lex.create_token(descriptor.WHITESPACE),
		],
		[
			lex.check_regex(u"[+-]?(?:0[xX](?:[0-9a-fA-F]+)|[0-9]+(?:\\.[0-9]*)?(?:[eE][+-]?[0-9]+)?|\\.[0-9]+(?:[eE][+-]?[0-9]+)?)"), # number
			create_token_number,
		],
		[
			lex.check_regex(u"[\\w\\$]+"), # word
			create_token_word,
		],
		[
			lex.check_tree(operators), # operator
			create_token_operator,
		],
		[
			lex.check_regex(u"[^\\s\\w\\$" + re.escape(lex.to_regex_class(operators)) + u"]+"), # invalid
			lex.create_token(descriptor.INVALID),
		],
	], 0);

	# Additional functions
	def string_contains_newline(text):
		return re_newlines_search.search(text) is not None;

	def string_splitlines(text):
		return re_newlines_split.split(text);

	setattr(descriptor, u"string_contains_newline", string_contains_newline);
	setattr(descriptor, u"string_splitlines", string_splitlines);

	# Complete
	return descriptor;


