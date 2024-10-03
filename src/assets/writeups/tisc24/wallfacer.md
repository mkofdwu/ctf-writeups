NOTE: this writeup is still WIP

* decompile using jadx. Later on I used apktool as well (with apktool i can modify the AndroidManifest.xml file and rebuild the apk)
* sqlite.db cannot be opened: possibly encrypted
* found str in strings.xml: `4tYKEbM6WqQcItBx0GMJvssyGHpVTJMhpjxHVLEZLVK6cmIH7jAmI/nwEJ1gUDo2`
	* Seems to be the encrypted flag?
* sus strings:
	* filename: `c3FsaXRlLmRi` -> `sqlite.db` (base64 decode)
	* dir: `ZGF0YS8`
	* base: `d2FsbG93aW5wYWlu` -> `wallowinpain` (base64 decode)
* where are `filename` and `base` used?
* search for usages of string ids
	* found usage of filename id, `0x7f0f0038` in K0.smali (apktool decompile)
	* first found by using binary grep: `grep -aRP '8\x00\x0f\x7f' .`
* InMemoryDexClassLoader
* dex bytebuffer is obtained using `invoke-static {p0, v1}, LA8;->K(Landroid/content/Context;Ljava/lang/String;)Ljava/nio/ByteBuffer;`
* check the `A8` class (from here on we can use the java decomp instead of smali)
* translate java to python script, extract dex file. Decompile with jadx
* Will provide more details on libnative patching later.

The following script was used to extract the dex file from sqlite.db

```python:h.py
with open('sqlite.db', 'rb') as f:
    data = f.read()
    chunksize = int.from_bytes(data[4096:4100], 'big')
    chunk = data[4100: 4100+chunksize]
    keything = data[4100+chunksize: 4100+chunksize+128]

    # calculate c0289q1.c
    c = [i for i in range(256)]
    acc = 0
    for i in range(256):
        temp = c[i]
        acc = (acc + temp + keything[i % 128]) & 255
        c[i] = c[acc]
        c[acc] = temp
    print(c)

    bArr5 = [0 for _ in range(chunksize)]
    i4 = 0
    i5 = 0
    for i in range(chunksize):
        i4 = (i4 + 1) & 255
        b2 = c[i4]
        i5 = (i5 + (b2 & 255)) & 255
        c[i4] = c[i5]
        c[i5] = b2
        bArr5[i] = (c[(c[i4] + b2) & 255] ^ chunk[i])

with open('output.dex', 'wb') as f:
    f.write(bytes(bArr5))
```

The following script was used to patch the libnative.so file, thereby passing all the 'walls'

```python:patch.py
from Crypto.Util.number import long_to_bytes as ltb
import lief

with open('libnative.so', 'rb') as f:
    data = f.read()
newdata = data[:]

# NOTE: the following doesnt work, i have no idea why...
# newdata = newdata.replace(b'Java_DynamicClass_nativeMethod', b'Java_com_a_a_Test_nativeMethod')

# no idea why this doesnt work either...
# newdata = newdata.replace(b'/sys/wall/facer', b'/data/local/ttt')

# handle file check
j = 0x2277
newdata = newdata[:j] + b'\x01\x00\x00\x00\x90\x90' + newdata[j+6:]

# handle parameter check
i = 0x2450  # 0xf79
newdata = newdata[:i] + b'\x01\x00' + newdata[i+2:]

# replace eax with the correct value ...
k = 0x25ef
newdata = newdata[:k] + b'1\xc0\x83\xc0\x05\x90\x90\x90' + newdata[k+8:]

# for debugging
# k = 0x2830
# newdata = newdata[:k] + b'\xcc' + newdata[k+1:]

with open('libnative1.so', 'wb') as f:
    f.write(newdata)

# instead i have to use lief to change method name:
lib = lief.parse('libnative1.so')
for x in lib.exported_symbols:
    if x.name == 'Java_DynamicClass_nativeMethod':
        x.name = 'Java_com_a_a_Test_nativeMethod'
lib.write('libnative1.so')
```

I ran the patched libnative1.so file in a new project on android studio and got the flag: