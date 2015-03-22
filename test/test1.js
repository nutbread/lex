// This is all completely valid syntax
function test() {
	var dont = 0x1-0.+.0-1.0e0*0+-1e-1-1+0.e+1;

	if (0) /regex/i;
	else /regex/i;
	for (;0;) /regex/i;
	while (0) /regex/i;
	do /regex/i; while (0);

	dont
	{} while (0) /regex/i;

	dont.
	do
	{} while (0) /regex/i;

	new /regex/i;
	delete /regex/i;
	void /regex/i;
	typeof /regex/i;
	throw /regex/i;
	return /regex/i;

	'' in /regex/i;
	"" instanceof /regex/i;

	switch (0) { case /regex/i: break; }
	(function () { yield /regex/i; });
};