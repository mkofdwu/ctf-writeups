This was a very charming level, although it was definitely the easiest one in the CTF. I like how the challenge author designed a logo, mascot, and even a soundtrack for this fictional payment service.

![](/agpay.png)

# JS Code

One of the first things I did was upload a random file and try sending it, and check the chrome devtools network tab to see what kind of request was being sent. To my surprise, there was no request at all. Taking a look at the javascript code, it becomes clear that checks are being done client side:

```javascript
document.addEventListener("DOMContentLoaded", function () {
  ...

  document
    .getElementById("parseButton")
    .addEventListener("click", parseFile);
});

async function parseFile() {
  const fileInput = document.getElementById("fileInput");
  const file = fileInput.files[0];
  if (!file) {
    alert("Please select a file");
    return;
  }

  const arrayBuffer = await file.arrayBuffer();
  const dataView = new DataView(arrayBuffer);

  const signature = getString(dataView, 0, 5);
  if (signature !== "AGPAY") {
    alert("Invalid Card");
    return;
  }
  const version = getString(dataView, 5, 2);
  const encryptionKey = new Uint8Array(arrayBuffer.slice(7, 39));
  const reserved = new Uint8Array(arrayBuffer.slice(39, 49));

  const footerSignature = getString(
    dataView,
    arrayBuffer.byteLength - 22,
    6
  );
  if (footerSignature !== "ENDAGP") {
    alert("Invalid Card");
    return;
  }
  const checksum = new Uint8Array(
    arrayBuffer.slice(arrayBuffer.byteLength - 16, arrayBuffer.byteLength)
  );

  const iv = new Uint8Array(arrayBuffer.slice(49, 65));
  const encryptedData = new Uint8Array(
    arrayBuffer.slice(65, arrayBuffer.byteLength - 22)
  );

  const calculatedChecksum = hexToBytes(
    SparkMD5.ArrayBuffer.hash(new Uint8Array([...iv, ...encryptedData]))
  );

  if (!arrayEquals(calculatedChecksum, checksum)) {
    alert("Invalid Card");
    return;
  }

  const decryptedData = await decryptData(
    encryptedData,
    encryptionKey,
    iv
  );

  const cardNumber = getString(decryptedData, 0, 16);
  const cardExpiryDate = decryptedData.getUint32(20, false);
  const balance = decryptedData.getBigUint64(24, false);

  document.getElementById("cardNumber").textContent =
    formatCardNumber(cardNumber);
  document.getElementById("cardExpiryDate").textContent =
    "VALID THRU " + formatDate(new Date(cardExpiryDate * 1000));
  document.getElementById("balance").textContent =
    "$" + balance.toString();
  console.log(balance);
  if (balance == 313371337) {
    function arrayBufferToBase64(buffer) {
      let binary = "";
      const bytes = new Uint8Array(buffer);
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return window.btoa(binary);
    }

    const base64CardData = arrayBufferToBase64(arrayBuffer);

    const formData = new FormData();
    formData.append("data", base64CardData);

    try {
      const response = await fetch("submit", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      if (result.success) {
        alert(result.success);
      } else {
        alert("Invalid Card");
      }
    } catch (error) {
      alert("Invalid Card");
    }
  }
}

async function decryptData(encryptedData, key, iv) {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "AES-CBC" },
    false,
    ["decrypt"]
  );
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: "AES-CBC", iv: iv },
    cryptoKey,
    encryptedData
  );
  return new DataView(decryptedBuffer);
}
```

# Binary file format

After reading the `parseFile()` function, I realised the code is basically parsing a custom binary file format (also each field is stored in big endian format):

```plaintext
5 bytes: header 'AGPAY'
2 bytes: version number
32 bytes: AES (CBC mode) encryption key
10 bytes: reserved section
16 bytes: IV for above AES encryption
32 bytes: AES-encrypted data as follows:
  - 16 bytes: card number
  - 8 bytes: expiry date
  - 8 bytes: card balance
6 bytes: footer 'ENDAGP'
16 bytes: MD5 hash of the IV + encrypted data part
```

The home page tells us we can "join the agleets", "only for $313371337". So I wrote a python script that generates an alligator pay card with that balance:

# Python script

```python:card_maker.py
import hashlib
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad
from Crypto.Random import get_random_bytes

def encrypt_text(text, key, iv):
    cipher = AES.new(key, AES.MODE_CBC, iv)
    padded_text = pad(text, 16)
    return cipher.encrypt(padded_text)


key = b'A' * 32
iv = b'C' * 16

data = b''
data += b'AGPAY' # header signature
data += b'\x00\x01' # 2 byte version
data += key # 32 byte encryption key
data += b'B' * 10 # 10 byte reserved section

body = b''
body += iv # 16 byte iv
body += encrypt_text(
    b'1234567890123456' # 16 byte card number
    + b'\x00\x00\x00\x00h\xc6\xa1\x82' # expiry date (timestamp, big endian)
    + b'\x00\x00\x00\x00\x12\xad\xaa\xc9', # balance
    key,
    iv
) # encrypted data part

checksum = hashlib.md5(body).digest()
assert len(checksum) == 16

data += body
data += b'ENDAGP' # footer signature
data += checksum # 16 byte checksum

with open('card.agp', 'wb') as f:
    f.write(data)
```

Running the script and uploading `card.agp` gives us the flag:

`TISC{533_Y4_L4T3R_4LL1G4T0R_a8515a1f7004dbf7d5f704b7305cdc5d}`
