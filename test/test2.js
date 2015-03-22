var a = 0..toString(), // double .
	b = 0x1-0.+.0-1*0+-1e-1-1, // math ops which should be separated
	c = ~+""+ +[]+!+[], // why
	i = 0, // try removing the . on the next line
	x = {}.
do
{ ++i; }
while (i < 10) /regex\n/.test('test\n') ? 0 : ++i;
console.log(a, b, c, i, x);