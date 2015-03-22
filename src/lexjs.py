#! /usr/bin/env python
import re;



# Types
INVALID = 0;
KEYWORD = 1;
LITERAL = 2;
IDENTIFIER = 3;
NUMBER = 4;
STRING = 5;
REGEX = 6;
OPERATOR = 7;
WHITESPACE = 8;
COMMENT = 9;

token_type_names = (
	"invalid",
	"keyword",
	"literal",
	"identifier",
	"number",
	"string",
	"regex",
	"operator",
	"whitespace",
	"comment",
);

def token_type_to_string(token_type):
	try:
		return token_type_names[token_type];
	except (IndexError, TypeError):
		return "";

# Flags
FLAG_NONE = 0x0;
FLAG_REGEX = 0x1;
FLAG_STRING = 0x2;
FLAG_COMMENT = 0x4;
FLAG_BRACKET = 0x8;
FLAG_BRACKET_CLOSE = 0x10;
FLAG_MEMBER = 0x20;
FLAG_NO_REGEX_AFTER = 0x40; # indicates regex expressions can not start after this token
FLAG_NO_REGEX_AFTER_EXT = 0x80; # indicates that there could potentially be regex after under certain circumstances; additional checking required
FLAG_STRICT_REQUIRED = 0x100; # not used yet, but has potential to be used
FLAG_VERSION_FUTURE = 0x200;
FLAG_VERSION_PAST = 0x400; # these will be skipped when converting to keywords
FLAG_IGNORE = 0x800; # internally "ignore" certain characters such as whitespace and comments
FLAG_NO_OP_PREFIX_AFTER = 0x1000; # indicates numeric values beginning with "operator" characters (+ or -) should not be matched
FLAG_NEXT_IS_MEMBER = 0x2000;

token_flag_names = (
	"NONE",
	"REGEX",
	"STRING",
	"COMMENT",
	"BRACKET",
	"BRACKET_CLOSE",
	"MEMBER",
	"NO_REGEX_AFTER",
	"NO_REGEX_AFTER_EXT",
	"STRICT_REQUIRED",
	"VERSION_FUTURE",
	"VERSION_PAST",
	"IGNORE",
	"NO_OP_PREFIX_AFTER",
);

def token_flags_to_string(flags):
	if (flags == 0):
		return token_flag_names[0];

	s = [];
	f = 0x1;
	for i in range(1, len(token_flag_names)):
		if ((flags & f) != 0):
			s.append(token_flag_names[i]);
		f <<= 1;

	return " | ".join(s);



# Token class
class Token(object):
	def __init__(self, text, type, flags):
		self.text = text;
		self.type = type;
		self.flags = flags;

	def __str__(self):
		return "{0:s}(text={1:s}, type={2:s}, flags={3:s})".format(self.__class__.__name__, repr(self.text), token_type_to_string(self.type), token_flags_to_string(self.flags));

	def __unicode__(self):
		return u"{0:s}(text={1:s}, type={2:s}, flags={3:s})".format(self.__class__.__name__, repr(self.text), token_type_to_string(self.type), token_flags_to_string(self.flags));



# Tokenizer class
class Lexer(object):
	# Bracket tracking class
	class __Bracket(object):
		def __init__(self, before, tid, id, opener):
			self.before = before;
			self.token_id = tid;
			self.id = id;
			self.opener = opener;
			self.other = None;

	# Format operators to be easier/faster to use tree
	def __format_operators(operators):
		ops_new = {};

		for k in operators:
			o = ops_new;
			for i in range(0, len(k) - 1):
				c = k[i];
				if (c in o):
					if (o[c][1] is None):
						o[c][1] = {};
				else:
					o[c] = [ None , {} ];
				o = o[c][1];

			c = k[-1];
			if (c in o):
				o[c][0] = operators[k];
			else:
				o[c] = [ operators[k] , None ];

		return ops_new;

	__operators = __format_operators({
		">>>": FLAG_NONE,
		">>=": FLAG_NONE,
		">>": FLAG_NONE,
		">=": FLAG_NONE,
		">": FLAG_NONE,

		"<<=": FLAG_NONE,
		"<<": FLAG_NONE,
		"<=": FLAG_NONE,
		"<": FLAG_NONE,

		"===": FLAG_NONE,
		"==": FLAG_NONE,
		"=": FLAG_NONE,

		"!==": FLAG_NONE,
		"!=": FLAG_NONE,
		"!": FLAG_NONE,

		"&&": FLAG_NONE,
		"&=": FLAG_NONE,
		"&": FLAG_NONE,

		"||": FLAG_NONE,
		"|=": FLAG_NONE,
		"|": FLAG_NONE,

		"++": FLAG_NONE | FLAG_NO_REGEX_AFTER | FLAG_NO_OP_PREFIX_AFTER,
		"+=": FLAG_NONE,
		"+": FLAG_NONE,

		"--": FLAG_NONE | FLAG_NO_REGEX_AFTER | FLAG_NO_OP_PREFIX_AFTER,
		"-=": FLAG_NONE,
		"-": FLAG_NONE,

		"*=": FLAG_NONE,
		"*": FLAG_NONE,

		"/=": FLAG_REGEX,
		"/": FLAG_REGEX,

		"%=": FLAG_NONE,
		"%": FLAG_NONE,

		"^=": FLAG_NONE,
		"^": FLAG_NONE,

		"~": FLAG_NONE,
		"?": FLAG_NONE,
		":": FLAG_NONE,
		";": FLAG_NONE,
		",": FLAG_NONE,
		".": FLAG_NEXT_IS_MEMBER | FLAG_NO_REGEX_AFTER | FLAG_NO_OP_PREFIX_AFTER,

		"(": FLAG_BRACKET,
		"[": FLAG_BRACKET,
		"{": FLAG_BRACKET,
		")": FLAG_BRACKET | FLAG_BRACKET_CLOSE | FLAG_NO_REGEX_AFTER | FLAG_NO_REGEX_AFTER_EXT | FLAG_NO_OP_PREFIX_AFTER,
		"]": FLAG_BRACKET | FLAG_BRACKET_CLOSE | FLAG_NO_REGEX_AFTER | FLAG_NO_OP_PREFIX_AFTER,
		"}": FLAG_BRACKET | FLAG_BRACKET_CLOSE,

		"//": FLAG_COMMENT,
		"/*": FLAG_COMMENT,
		"\"": FLAG_STRING,
		"\'": FLAG_STRING,
	});

	__keywords = {
		# keyword: ( type , flags )
		"break":      ( KEYWORD , FLAG_NO_REGEX_AFTER ),
		"case":       ( KEYWORD , FLAG_NONE ),
		"class":      ( KEYWORD , FLAG_NO_REGEX_AFTER ),
		"catch":      ( KEYWORD , FLAG_NO_REGEX_AFTER ),
		"const":      ( KEYWORD , FLAG_NO_REGEX_AFTER ),
		"continue":   ( KEYWORD , FLAG_NO_REGEX_AFTER ),
		"debugger":   ( KEYWORD , FLAG_NO_REGEX_AFTER ),
		"default":    ( KEYWORD , FLAG_NO_REGEX_AFTER ),
		"delete":     ( KEYWORD , FLAG_NONE ),
		"do":         ( KEYWORD , FLAG_NONE ),
		"else":       ( KEYWORD , FLAG_NONE ),
		"export":     ( KEYWORD , FLAG_NO_REGEX_AFTER ),
		"extends":    ( KEYWORD , FLAG_NO_REGEX_AFTER ),
		"finally":    ( KEYWORD , FLAG_NO_REGEX_AFTER ),
		"for":        ( KEYWORD , FLAG_NO_REGEX_AFTER ),
		"function":   ( KEYWORD , FLAG_NO_REGEX_AFTER ),
		"if":         ( KEYWORD , FLAG_NO_REGEX_AFTER ),
		"import":     ( KEYWORD , FLAG_NO_REGEX_AFTER ),
		"in":         ( KEYWORD , FLAG_NONE ),
		"instanceof": ( KEYWORD , FLAG_NONE ),
		"let":        ( KEYWORD , FLAG_NO_REGEX_AFTER ),
		"new":        ( KEYWORD , FLAG_NONE ),
		"return":     ( KEYWORD , FLAG_NONE ),
		"super":      ( KEYWORD , FLAG_NO_REGEX_AFTER ),
		"switch":     ( KEYWORD , FLAG_NO_REGEX_AFTER ),
		"this":       ( KEYWORD , FLAG_NO_REGEX_AFTER | FLAG_NO_OP_PREFIX_AFTER ),
		"throw":      ( KEYWORD , FLAG_NONE ),
		"try":        ( KEYWORD , FLAG_NO_REGEX_AFTER ),
		"typeof":     ( KEYWORD , FLAG_NONE ),
		"var":        ( KEYWORD , FLAG_NO_REGEX_AFTER ),
		"void":       ( KEYWORD , FLAG_NONE ),
		"while":      ( KEYWORD , FLAG_NO_REGEX_AFTER ),
		"with":       ( KEYWORD , FLAG_NO_REGEX_AFTER ),
		"yield":      ( KEYWORD , FLAG_NONE ),

		"await": ( KEYWORD , FLAG_NO_REGEX_AFTER | FLAG_VERSION_FUTURE ),
		"enum":  ( KEYWORD , FLAG_NO_REGEX_AFTER | FLAG_VERSION_FUTURE ),

		"implements": ( KEYWORD , FLAG_NO_REGEX_AFTER | FLAG_VERSION_FUTURE | FLAG_STRICT_REQUIRED ),
		"interface":  ( KEYWORD , FLAG_NO_REGEX_AFTER | FLAG_VERSION_FUTURE | FLAG_STRICT_REQUIRED ),
		"public":     ( KEYWORD , FLAG_NO_REGEX_AFTER | FLAG_VERSION_FUTURE | FLAG_STRICT_REQUIRED ),
		"private":    ( KEYWORD , FLAG_NO_REGEX_AFTER | FLAG_VERSION_FUTURE | FLAG_STRICT_REQUIRED ),
		"package":    ( KEYWORD , FLAG_NO_REGEX_AFTER | FLAG_VERSION_FUTURE | FLAG_STRICT_REQUIRED ),
		"protected":  ( KEYWORD , FLAG_NO_REGEX_AFTER | FLAG_VERSION_FUTURE | FLAG_STRICT_REQUIRED ),
		"static":     ( KEYWORD , FLAG_NO_REGEX_AFTER | FLAG_VERSION_FUTURE | FLAG_STRICT_REQUIRED ),

		"abstract":     ( KEYWORD , FLAG_NO_REGEX_AFTER | FLAG_VERSION_PAST ),
		"boolean":      ( KEYWORD , FLAG_NO_REGEX_AFTER | FLAG_VERSION_PAST ),
		"byte":         ( KEYWORD , FLAG_NO_REGEX_AFTER | FLAG_VERSION_PAST ),
		"char":         ( KEYWORD , FLAG_NO_REGEX_AFTER | FLAG_VERSION_PAST ),
		"double":       ( KEYWORD , FLAG_NO_REGEX_AFTER | FLAG_VERSION_PAST ),
		"final":        ( KEYWORD , FLAG_NO_REGEX_AFTER | FLAG_VERSION_PAST ),
		"float":        ( KEYWORD , FLAG_NO_REGEX_AFTER | FLAG_VERSION_PAST ),
		"goto":         ( KEYWORD , FLAG_NO_REGEX_AFTER | FLAG_VERSION_PAST ),
		"int":          ( KEYWORD , FLAG_NO_REGEX_AFTER | FLAG_VERSION_PAST ),
		"long":         ( KEYWORD , FLAG_NO_REGEX_AFTER | FLAG_VERSION_PAST ),
		"native":       ( KEYWORD , FLAG_NO_REGEX_AFTER | FLAG_VERSION_PAST ),
		"short":        ( KEYWORD , FLAG_NO_REGEX_AFTER | FLAG_VERSION_PAST ),
		"synchronized": ( KEYWORD , FLAG_NO_REGEX_AFTER | FLAG_VERSION_PAST ),
		"transient":    ( KEYWORD , FLAG_NO_REGEX_AFTER | FLAG_VERSION_PAST ),
		"volatile":     ( KEYWORD , FLAG_NO_REGEX_AFTER | FLAG_VERSION_PAST ),

		"null":  ( LITERAL , FLAG_NO_REGEX_AFTER | FLAG_NO_OP_PREFIX_AFTER ),
		"true":  ( LITERAL , FLAG_NO_REGEX_AFTER | FLAG_NO_OP_PREFIX_AFTER ),
		"false": ( LITERAL , FLAG_NO_REGEX_AFTER | FLAG_NO_OP_PREFIX_AFTER ),
	};

	__flags_default = [
		FLAG_NO_REGEX_AFTER, # INVALID
		FLAG_NONE, # KEYWORD
		FLAG_NONE, # LITERAL
		FLAG_NO_REGEX_AFTER | FLAG_NO_OP_PREFIX_AFTER, # IDENTIFIER
		FLAG_NO_REGEX_AFTER | FLAG_NO_OP_PREFIX_AFTER, # NUMBER
		FLAG_NO_REGEX_AFTER | FLAG_NO_OP_PREFIX_AFTER, # STRING
		FLAG_NO_REGEX_AFTER | FLAG_NO_OP_PREFIX_AFTER, # REGEX
		FLAG_NONE, # OPERATOR
		FLAG_IGNORE, # WHITESPACE
		FLAG_IGNORE, # COMMENT
	];

	__re_whitespace = re.compile(r"\s+", re.U);
	__re_word = re.compile(r"[\w\$]+", re.U);
	__re_number = re.compile(r"([+-])?(?:(0[xX](?:[0-9a-fA-F]+))|([0-9]+(?:\.[0-9]*)?(?:[eE][+-]?[0-9]+)?)|(\.[0-9]+(?:[eE][+-]?[0-9]+)?))", re.U);
	__re_invalid = re.compile(r"[^\s\w\${0:s}]+".format(re.escape("".join(__operators.keys()))), re.U);

	__re_newlines = re.compile(u"[\\r\\n\u2028\u2029]", re.U);
	__re_newlines_split = re.compile(u"[\\n\u2028\u2029]|\\r\\n?", re.U);
	__re_regex_flags = re.compile(r"[a-z]*", re.U);

	__re_comment = re.compile(u"[^\\r\\n\u2028\u2029]*", re.U);
	__re_comment_multi = re.compile(r".*?(?:\*/|$)", re.U | re.DOTALL);



	def __init__(self, text):
		self.pos = 0;
		self.text = text;
		self.brackets = [];
		self.bracket_stack = [];
		self.last = Token("", WHITESPACE, FLAG_NONE);
		self.token_id = 0;

	def __match_operator(self, p, p_max):
		value = None;
		ops = self.__operators;

		while (True):
			c = self.text[p];
			if (c not in ops): break;
			p += 1;

			flags = ops[c][0];
			if (flags is not None):
				value = [ flags , p ];

			ops = ops[c][1];
			if (ops is None or p >= p_max): break;

		# Should return [ flags , end ], or None
		return value;

	def __create_token(self, token_type, flags, end):
		token = Token(self.text[self.pos : end], token_type, self.__flags_default[token_type] | flags);

		self.pos = end;

		if ((token.flags & FLAG_IGNORE) == 0):
			self.last = token;
			self.token_id += 1;

		return token;

	def __create_token_string(self, flags, quote, p, p_max):
		# Match to end of string
		escaped = False;
		while (p < p_max):
			c = self.text[p];
			if (escaped):
				escaped = False;
				if (c == "\r" and p + 1 < p_max and self.text[p + 1] == "\n"):
					p += 1;
			else:
				if (c == "\\"):
					escaped = True;
				elif (c == quote):
					p += 1;
					break;
				elif (self.__re_newlines.match(c) is not None):
					break;

			p += 1;

		# Create the token
		return self.__create_token(STRING, flags, p);

	def __create_token_comment(self, flags, opener, p):
		# Check which type
		if (opener == "//"):
			r = self.__re_comment;
		else:
			r = self.__re_comment_multi;

		# Match the comment
		m = r.match(self.text, p);

		# Create the token
		return self.__create_token(COMMENT, flags, m.end());

	def __create_token_regex(self, flags, p, p_max):
		# Check if regex is allowed
		if ((self.last.flags & FLAG_NO_REGEX_AFTER) != 0 and ((self.last.flags & FLAG_NO_REGEX_AFTER_EXT) == 0 or not self.__check_if_regex_valid())):
			return None;

		# Match the regex
		escaped = False;
		bracketed = False;
		while (p < p_max):
			c = self.text[p];
			if (escaped):
				if (self.__re_newlines.match(c)):
					break;
				escaped = False;
			else:
				if (c == "\\"):
					escaped = True;
				elif (c == "/"):
					if (not bracketed):
						# Match flags and end
						p = self.__re_regex_flags.match(self.text, p + 1).end();
						break;
				elif (c == "["):
					bracketed = True;
				elif (c == "]"):
					bracketed = False;
				elif (self.__re_newlines.match(c)):
					break;

			p += 1;

		# Create the token
		return self.__create_token(REGEX, flags, p);

	def __create_token_word(self, end):
		flags = FLAG_NONE;
		token_type = IDENTIFIER;

		if ((self.last.flags & FLAG_NEXT_IS_MEMBER) != 0):
			# Member
			flags |= FLAG_MEMBER;
		else:
			# Check if keyword
			word = self.text[self.pos : end];
			if (word in self.__keywords):
				kw = self.__keywords[word];

				# Not a past feature
				if ((kw[1] & FLAG_VERSION_PAST) == 0):
					token_type = kw[0];
					flags |= kw[1];


		return self.__create_token(token_type, flags, end);

	def __check_if_regex_valid(self):
		# Check for an if, for, or while statement
		# Additionally, if it's a while, make sure it's not a do-while
		if (len(self.brackets) > 0):
			b = self.brackets[-1];
			if (b.token_id == self.token_id - 1 and not b.opener):
				b = b.other;
				t = b.before;
				if (t.type == KEYWORD):
					text = t.text;
					if (text in ( "if" , "for" , "while" )):
						# Probably valid
						return True;

		# Invalid
		return False;

	def get_token(self):
		p = self.pos;
		p_max = len(self.text);
		if (p >= p_max):
			return None;

		flags = FLAG_NONE;

		# Whitespace
		m = self.__re_whitespace.match(self.text, p);
		if (m is not None):
			return self.__create_token(WHITESPACE, flags, m.end());

		# Number
		m = self.__re_number.match(self.text, p);
		if (m is not None):
			# Also check FLAG_NO_OP_PREFIX_AFTER on previous
			if ((self.last.flags & FLAG_NO_OP_PREFIX_AFTER) == 0 or self.__match_operator(p, p + 1) is None):
				return self.__create_token(NUMBER, flags, m.end());

		# Identifier, keyword, etc
		m = self.__re_word.match(self.text, p);
		if (m is not None):
			return self.__create_token_word(m.end());

		# Operator
		m = self.__match_operator(p, p_max);
		if (m is not None):
			flags = m[0];
			end = m[1];

			if ((flags & FLAG_STRING) != 0):
				# String
				return self.__create_token_string(flags, self.text[p : end], end, p_max);
			elif ((flags & FLAG_COMMENT) != 0):
				# Comment
				return self.__create_token_comment(flags, self.text[p : end], end);
			elif ((flags & FLAG_REGEX) != 0):
				# Regex
				t = self.__create_token_regex(flags, end, p_max);
				if (t is not None):
					return t;

			if ((flags & FLAG_BRACKET) != 0):
				# Bracket matching
				if ((flags & FLAG_BRACKET_CLOSE) == 0):
					b = self.__Bracket(self.last, self.token_id, len(self.brackets), True);
					self.brackets.append(b);

					self.bracket_stack.append(b);
				else:
					if (len(self.bracket_stack) > 0):
						b = self.__Bracket(None, self.token_id, len(self.brackets), False);
						self.brackets.append(b);

						b.other = self.bracket_stack.pop();
						b.other.other = b;
					# else: # syntax error

			return self.__create_token(OPERATOR, flags, end);

		# Invalid
		p += 1;
		while (p < p_max):
			m = self.__re_invalid.match(self.text, p);
			if (m is None): break;
			p = m.end();
		return self.__create_token(INVALID, flags, p);

	@classmethod
	def string_contains_newline(cls, text):
		return cls.__re_newlines.search(text) is not None;

	@classmethod
	def string_splitlines(cls, text):
		return cls.__re_newlines_split.split(text);


