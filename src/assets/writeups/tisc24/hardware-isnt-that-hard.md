NOTE: This writeup is still WIP. Here are some notes I took while solving the challenge, as well as any solve script(s)

- watched videos on tpm
  - https://www.youtube.com/watch?v=RW2zHvVO09g
- Found more articles on reverse engineering firmware dump
	- https://olof-astrand.medium.com/reverse-engineering-of-esp32-flash-dumps-with-ghidra-or-ida-pro-8c7c58871e68
	- https://github.com/BlackVS/ESP32-reversing?tab=readme-ov-file#firmware
	- https://github.com/tenable/esp32_image_parser
- Useful video explaining esp32 partitions: https://www.youtube.com/watch?v=eGZ-TxHpm24
- dump app partitions using the command:
	- `python esp32_image_parser.py dump_partition ../flash_dump.bin -partition app0`
	- `file app0_out.bin` -> `app0_out.bin: DOS executable (COM)`
- fixed the code in `esp32_image_parser.py` to finally extract the elf file successfully

```plaintext:git diff
diff --git a/esp32_image_parser.py b/esp32_image_parser.py
index 6503cf7..0abcc86 100755
--- a/esp32_image_parser.py
+++ b/esp32_image_parser.py
@@ -6,6 +6,7 @@ import json
 import os, argparse
 from makeelf.elf import *
 from esptool import *
+from esptool.bin_image import *
 from esp32_firmware_reader import *
 from read_nvs import *
 
@@ -53,6 +54,7 @@ def image2elf(filename, output_file, verbose=False):
     section_map = {
         'DROM'                      : '.flash.rodata',
         'BYTE_ACCESSIBLE, DRAM, DMA': '.dram0.data',
+        'BYTE_ACCESSIBLE, DRAM': '.dram0.data',  # hope this works
         'IROM'                      : '.flash.text',
         #'RTC_IRAM'                  : '.rtc.text' TODO
     }
@@ -154,7 +156,9 @@ def image2elf(filename, output_file, verbose=False):
 
         if (name == '.iram0.vectors'):
             # combine these
-            size = len(section_data['.iram0.vectors']['data']) + len(section_data['.iram0.text']['data'])
+            size = len(section_data['.iram0.vectors']['data']) # + len(section_data['.iram0.text']['data'])
+            if '.iram0.text' in section_data:
+                size += len(section_data['.iram0.text']['data'])
         else:
             size = len(section_data[name]['data'])
```

- open elf file in ghidra
- use strings to find main program logic
  <TODO: show ghidra reversed code)
- reversing
	- xtensa isa reference: https://0x04.net/~mwk/doc/xtensa.pdf
- fuzzing to get the flag

```python:t.py
from pwn import *
import random

t = remote('chals.tisc24.ctf.sg', 61622)

t.recvuntil(b'\n\n> ')

arr = list(range(256))
# random.shuffle(arr)

for i in arr:
    t.sendline(f'SEND {hex(i)[2:]} 4d'.encode())
    t.sendlineafter(b'> ', b'RECV 10')
    data = t.recvline()
    if data != b'00 00 00 00 00 00 00 00 00 00\n':
        print(hex(i))
        print(data)
    t.recvuntil(b'> ')
```

I decided to do fuzzing to figure out how to interact with the firmware, since I couldn't find any easy to understand manual/guide.

```python:t2.py
from pwn import *

t = remote('chals.tisc24.ctf.sg', 61622)

t.recvuntil(b'\n\n> ')

for i in range(0xd3):
    print(i)
    t.sendline(f'SEND {hex(i)[2:]} 46'.encode())
    t.recvuntil(b'> ')

t.sendline(b'SEND d3 46')
t.sendlineafter(b'> ', b'RECV 16')
print(t.recvline())
t.interactive()
```

^ code to extract the encoded thing

```python:s.py
enc = b'\xaf\x02\xdf\xed\x8b\xc2\xb8\x58\x2a\xe8\x94\x69\x91\x2e\xb9\x6f'

for i in range(65536):
    curr = i
    mask = 2**16 - 1
    res = []
    for i in range(16):
        curr = ((curr << 7) ^ curr) & mask
        curr = ((curr >> 9) ^ curr) & mask
        curr = ((curr << 8) ^ curr) & mask
        res.append(curr & 255)
    decoded = bytes([a ^ b for a, b in zip(res, enc)])
    if decoded.startswith(b'TISC'):
        print(i)
        print(decoded)
```

after running my solve script, the flag is printed out!

`TISC{hwfuninnit}`