Installing the apk reveals very little:

![](/tisc24/wallfacer_home.jpg)

# Java decompilation

I used jadx to decompile the apk: `jadx wallfacer-x86_64.apk`. We can see a number of decompiled java files under `sources/com/wall/facer`:

![](/tisc24/wallfacer_java_files.png)

Storage is a simple class implementing the singleton pattern, with a secretMessage property:

```java:Storage.java
package com.wall.facer;
/* loaded from: classes.dex */
public class Storage {
    private static Storage instance;
    private String secretMessage;

    private Storage() {
    }

    public static synchronized Storage getInstance() {
        Storage storage;
        synchronized (Storage.class) {
            try {
                if (instance == null) {
                    instance = new Storage();
                }
                storage = instance;
            } catch (Throwable th) {
                throw th;
            }
        }
        return storage;
    }

    public synchronized String getMessage() {
        return this.secretMessage;
    }

    public synchronized void saveMessage(String str) {
        this.secretMessage = str;
    }
}
```

MainActivity.java is the controller for the above home page. Its implementation is also very barebones:

```java:MainActivity.java
package com.wall.facer;

import android.os.Bundle;
import android.view.View;
import android.widget.EditText;
/* loaded from: classes.dex */
public class MainActivity extends C0 {
    public EditText y;

    @Override // defpackage.C0, defpackage.O3, android.app.Activity
    public final void onCreate(Bundle bundle) {
        super.onCreate(bundle);
        setContentView(R.layout.activity_main);
        this.y = (EditText) findViewById(R.id.edit_text);
    }

    public void onSubmitClicked(View view) {
        Storage.getInstance().saveMessage(this.y.getText().toString());
    }
}
```

There is another activity class, query:

```java:query.java
package com.wall.facer;

import android.content.Context;
import android.os.Bundle;
import android.util.Base64;
import android.util.Log;
import android.view.View;
import android.widget.EditText;
import javax.crypto.Cipher;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.SecretKeySpec;
/* loaded from: classes.dex */
public class query extends C0 {
    public EditText y;
    public EditText z;

    @Override // defpackage.C0, defpackage.O3, android.app.Activity
    public final void onCreate(Bundle bundle) {
        super.onCreate(bundle);
        setContentView(R.layout.activity_query);
        this.y = (EditText) findViewById(R.id.key_text);
        this.z = (EditText) findViewById(R.id.iv_text);
    }

    public void onSubmitClicked(View view) {
        Context applicationContext = getApplicationContext();
        String obj = this.y.getText().toString();
        String obj2 = this.z.getText().toString();
        try {
            byte[] decode = Base64.decode(applicationContext.getString(R.string.str), 0);
            byte[] bytes = obj.getBytes();
            byte[] bytes2 = obj2.getBytes();
            Cipher cipher = Cipher.getInstance("AES/CBC/PKCS5Padding");
            cipher.init(2, new SecretKeySpec(bytes, "AES"), new IvParameterSpec(bytes2));
            Log.d(getString(R.string.tag), "Decrypted data: ".concat(new String(cipher.doFinal(decode))));
        } catch (Exception unused) {
            Log.e(getString(R.string.tag), "Failed to decrypt data");
        }
    }
}
```

It seems to be a page where string decryption is going on. the value of `R.string.str` can be found under `resources/res/values/strings.xml`: 

```xml:strings.xml
...
    <string name="str">4tYKEbM6WqQcItBx0GMJvssyGHpVTJMhpjxHVLEZLVK6cmIH7jAmI/nwEJ1gUDo2</string>
...
```

# Looking for strings

Looking around the file, I found a few other interesting strings:

```xml:strings.xml
...
    <string name="base">d2FsbG93aW5wYWlu</string>
...
    <string name="dir">ZGF0YS8</string>
...
    <string name="filename">c3FsaXRlLmRi</string>
...
```

They seem to also be base64-encoded. Decoding them gives base = `wallowinpain`, dir = `data/`, filename = `sqlite.db`.

Under `resources/assets`, I noticed a `sqlite.db` file. However, attempts to open it were met with the error: `file is not a database`. I tried various methods to patch the file unsuccessfully. Furthermore, a strings check on the file does not return any readable text except for the sqlite header.

Eventually, I returned to the three mysterious strings and tried to figure out where they were being used. We can find the string ids in `R.java`

```java:R.java
...
        public static final int base = 0x7f0f001e;
...
        public static final int dir = 0x7f0f0030;
...
        public static final int filename = 0x7f0f0038;
...
```

Running a global search for the string ids (both hex and decimal format) yielded nothing. Maybe they are referenced in binary files? I searched for this using: `grep -aRP '8\x00\x0f\x7f' .`. Sure enough, a match was returned for `filename`'s id inside `resoucers/classes.dex`. I postulated that the java decompilation was missing something, so I looked in the smali decompilation (smali is basically a human readable representation of Dalvik bytecode, so decompiling to smali is lossless).

Using `apktool d wallfacer-x86_64.apk`, we can access the smali files. Searching for `0x7f0f0038` shows that is being used in `K0.smali`.

# Extracting DynamicClass

We reverse it section by section:

```plaintext:K0.smali
    const v0, 0x7f0f0038

    :try_start_0
    invoke-virtual {p0, v0}, Landroid/content/Context;->getString(I)Ljava/lang/String;

    move-result-object v0
```

Fortunately, the smali decompilation is verbose enough that we can kind of figure out what's going on. For parts that I didn't understand, I consulted ChatGPT or Google. The above section does something like `v0 = context.getString(0x7f0f0038)`.

```plaintext:K0.smali
    new-instance v1, Ljava/lang/String;

    const/4 v2, 0x0

    invoke-static {v0, v2}, Landroid/util/Base64;->decode(Ljava/lang/String;I)[B

    move-result-object v0

    invoke-direct {v1, v0}, Ljava/lang/String;-><init>([B)V

    invoke-static {p0, v1}, LA8;->K(Landroid/content/Context;Ljava/lang/String;)Ljava/nio/ByteBuffer;

    move-result-object v0
```

Now this does `v0 = A8.K(context, new String(Base64.decode(v0, 0)))`. We will investigate the `A8.K` function later.

```plaintext:K0.smali
    new-instance v1, Ldalvik/system/InMemoryDexClassLoader;

    invoke-virtual {p0}, Landroid/content/Context;->getClassLoader()Ljava/lang/ClassLoader;

    move-result-object v2

    invoke-direct {v1, v0, v2}, Ldalvik/system/InMemoryDexClassLoader;-><init>(Ljava/nio/ByteBuffer;Ljava/lang/ClassLoader;)V
```

`v1 = new InMemoryDexClassLoader(v0, context.getClassLoader())`

```plaintext:K0.smali
    const-string v0, "DynamicClass"

    invoke-virtual {v1, v0}, Ljava/lang/ClassLoader;->loadClass(Ljava/lang/String;)Ljava/lang/Class;

    move-result-object v0
```

`v0 = v1.loadClass("DynamicClass")`

```plaintext:K0.smali
    const-class v1, Landroid/content/Context;

    filled-new-array {v1}, [Ljava/lang/Class;

    move-result-object v1

    const-string v2, "dynamicMethod"

    invoke-virtual {v0, v2, v1}, Ljava/lang/Class;->getMethod(Ljava/lang/String;[Ljava/lang/Class;)Ljava/lang/reflect/Method;

    move-result-object v0
```

`v0.getMethod("dynamicMethod", new java.lang.Class[] { android.content.Context })`

So it seems that `A8.K` is loading bytecode used to construct DynamicClass, and the method dynamicMethod is then invoked on it.

Fortunately for us, the `A8` class seems to be correctly decompiled to java and we can find it under `sources/defpackage` (in the jadx decompilation).

```java:A8.java
    public static ByteBuffer K(Context context, String str) {
        int i2;
        InputStream open = context.getAssets().open(str);
        ByteArrayOutputStream byteArrayOutputStream = new ByteArrayOutputStream();
        byte[] bArr = new byte[1024];
        while (true) {
            int read = open.read(bArr);
            if (read == -1) {
                break;
            }
            byteArrayOutputStream.write(bArr, 0, read);
        }
        open.close();
        byte[] byteArray = byteArrayOutputStream.toByteArray();
        // here, contents of assets/sqlite.db have been read to byteArray
        byte[] bArr2 = new byte[128];
        byte[] bArr3 = new byte[4];
        System.arraycopy(byteArray, 4096, bArr3, 0, 4);
        int i3 = ByteBuffer.wrap(bArr3).getInt();
        byte[] bArr4 = new byte[i3];
        System.arraycopy(byteArray, 4100, bArr4, 0, i3);
        System.arraycopy(byteArray, 4100 + i3, bArr2, 0, 128);
        C0289q1 c0289q1 = new C0289q1(bArr2);
        byte[] bArr5 = new byte[i3];
        int i4 = 0;
        int i5 = 0;
        for (i2 = 0; i2 < i3; i2++) {
            i4 = (i4 + 1) & 255;
            byte[] bArr6 = (byte[]) c0289q1.c;
            byte b2 = bArr6[i4];
            i5 = (i5 + (b2 & 255)) & 255;
            bArr6[i4] = bArr6[i5];
            bArr6[i5] = b2;
            bArr5[i2] = (byte) (bArr6[(bArr6[i4] + b2) & 255] ^ bArr4[i2]);
        }
        return ByteBuffer.wrap(bArr5);
    }
```

Here, the contents of `sqlite.db` are read to `byteArray`, and some copying is done. The signature of `System.arraycopy` is  `arraycopy(Object src, int srcPos, Object dest, int destPos, int length)`. The first 4 bytes read to bArr3 seem to be a length specifier, and the specified number of bytes is then read into bArr4, then the next 128 bytes are read to bArr2. Then the `C0289q1` class is created. I looked up the implementation:

```java:C0289q1.java
    public C0289q1(byte[] bArr) {
        this.a = 17;
        this.b = bArr;
        this.c = new byte[256];
        for (int i = 0; i < 256; i++) {
            ((byte[]) this.c)[i] = (byte) i;
        }
        int i2 = 0;
        for (int i3 = 0; i3 < 256; i3++) {
            byte[] bArr2 = (byte[]) this.c;
            byte b = bArr2[i3];
            byte[] bArr3 = (byte[]) this.b;
            i2 = (i2 + (b & 255) + (bArr3[i3 % bArr3.length] & 255)) & 255;
            bArr2[i3] = bArr2[i2];
            bArr2[i2] = b;
        }
    }
```

I can't remember whether I reversed the function logic, but either way it is not necessary to figure out exactly what is going on, since the function is just moving values around. All we need for decryption is the sqlite.db file, and to translate the algorithm to python:

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

# Extracting libnative.so

The resulting .dex file can be decompiled with `jadx output.dex`. Then we have the decompiled class under `output/sources/defpackage` (I added some comments):

```java:DynamicClass.java
package defpackage;

import android.content.Context;
import android.content.res.AssetManager;
import android.content.res.Resources;
import android.os.SystemClock;
import android.util.Base64;
import android.util.Log;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.Comparator;
/* renamed from: DynamicClass  reason: default package */
/* loaded from: /home/smalldonkey/ctf/tisc24/l8/l8/wallfacer-x86_64/resources/assets/output.dex */
public class DynamicClass {
    static final /* synthetic */ boolean $assertionsDisabled = false;
    private static final String TAG = "TISC";

    public static native void nativeMethod();

    public static void dynamicMethod(Context context) throws Exception {
        pollForTombMessage();
        Log.i(TAG, "Tomb message received!");
        File generateNativeLibrary = generateNativeLibrary(context);
        try {
            System.load(generateNativeLibrary.getAbsolutePath());
        } catch (Throwable th) {
            String message = th.getMessage();
            message.getClass();
            Log.e(TAG, message);
            System.exit(-1);
        }
        Log.i(TAG, "Native library loaded!");
        if (generateNativeLibrary.exists()) {
            generateNativeLibrary.delete();
        }
        pollForAdvanceMessage();
        Log.i(TAG, "Advance message received!");
        nativeMethod();
    }

    private static void pollForTombMessage() throws ClassNotFoundException, NoSuchMethodException, InvocationTargetException, IllegalAccessException {
        Class<?> cls;
        do {
            SystemClock.sleep(1000L);
            cls = Class.forName("com.wall.facer.Storage");
        } while (!DynamicClass$$ExternalSyntheticBackport1.m((String) cls.getMethod("getMessage", new Class[0]).invoke(cls.getMethod("getInstance", new Class[0]).invoke(null, new Object[0]), new Object[0]), "I am a tomb")); // Storage.getInstance().getMessage() == "I am a tomb"
    }

    private static void pollForAdvanceMessage() throws ClassNotFoundException, NoSuchMethodException, InvocationTargetException, IllegalAccessException {
        Class<?> cls;
        do {
            SystemClock.sleep(1000L);
            cls = Class.forName("com.wall.facer.Storage");
        } while (!DynamicClass$$ExternalSyntheticBackport1.m((String) cls.getMethod("getMessage", new Class[0]).invoke(cls.getMethod("getInstance", new Class[0]).invoke(null, new Object[0]), new Object[0]), "Only Advance")); // Storage.getInstance().getMessage() == "Only Advance"
    }

    public static File generateNativeLibrary(Context context) throws ClassNotFoundException, NoSuchMethodException, InvocationTargetException, IllegalAccessException, IOException {
        AssetManager assets = context.getAssets();
        Resources resources = context.getResources();
        String str = new String(Base64.decode(resources.getString(resources.getIdentifier("dir", "string", context.getPackageName())) + "=", 0));
        // str = "data/"
        String[] list = assets.list(str);
        // sort files alphabetically
        Arrays.sort(list, new Comparator() { // from class: DynamicClass$$ExternalSyntheticLambda3
            @Override // java.util.Comparator
            public final int compare(Object obj, Object obj2) {
                int m;
                m = DynamicClass$$ExternalSyntheticBackport0.m(Integer.parseInt(((String) obj).split("\\$")[0]), Integer.parseInt(((String) obj2).split("\\$")[0]));
                return m;
            }
        });
        String str2 = new String(Base64.decode(resources.getString(resources.getIdentifier("base", "string", context.getPackageName())), 0));
        // str2 = "wallowinpain"
        File file = new File(context.getFilesDir(), "libnative.so");
        Method method = Class.forName("Oa").getMethod("a", byte[].class, String.class, byte[].class);
        FileOutputStream fileOutputStream = new FileOutputStream(file);
        try {
            for (String str3 : list) {
                InputStream open = assets.open(str + str3);
                byte[] readAllBytes = open.readAllBytes();
                open.close();
                fileOutputStream.write((byte[]) method.invoke(null, readAllBytes, str2, Base64.decode(str3.split("\\$")[1] + "==", 8)));
            }
            fileOutputStream.close();
            return file;
        } catch (Throwable th) {
            try {
                fileOutputStream.close();
            } catch (Throwable th2) {
                Throwable.class.getDeclaredMethod("addSuppressed", Throwable.class).invoke(th, th2);
            }
            throw th;
        }
    }
}
```

`dynamicMethod` waits for the "I am a tomb" message, then loads a native library. This native library is dynamically loaded in `generateNativeLibrary`. 

Reading the decompilation, `generateNativeLibrary` is reading the files under `assets/data`, decrypting them, then combining the result to form the final native library. Let's take a look at the decryption function, `Oa.a`:

```java:Oa.java
package defpackage;

import javax.crypto.Cipher;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.PBEKeySpec;
import javax.crypto.spec.SecretKeySpec;
/* renamed from: Oa  reason: default package */
/* loaded from: classes.dex */
public class Oa {
    public static byte[] a(byte[] bArr, String str, byte[] bArr2) {
        byte[] b = b(str, bArr2);
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        byte[] bArr3 = new byte[12];
        int length = bArr.length - 12;
        byte[] bArr4 = new byte[length];
        System.arraycopy(bArr, 0, bArr3, 0, 12);
        System.arraycopy(bArr, 12, bArr4, 0, length);
        cipher.init(2, new SecretKeySpec(b, "AES"), new GCMParameterSpec(128, bArr3));
        return cipher.doFinal(bArr4);
    }

    private static byte[] b(String str, byte[] bArr) {
        return SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(new PBEKeySpec(str.toCharArray(), bArr, 16384, 256)).getEncoded();
    }
}
```

So the function `a` is doing AES GCM decryption. I compiled the necessary parts together to form the following java script:

```java:h2.java
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.util.Base64;
import java.util.Arrays;
import java.util.Comparator;
import javax.crypto.Cipher;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.PBEKeySpec;
import javax.crypto.spec.SecretKeySpec;
import java.io.FileOutputStream;

public class h2 {
    public static byte[] a(byte[] bArr, String str, byte[] bArr2) throws Throwable {
        byte[] b = b(str, bArr2);
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        byte[] bArr3 = new byte[12];
        int length = bArr.length - 12;
        byte[] bArr4 = new byte[length];
        System.arraycopy(bArr, 0, bArr3, 0, 12);
        System.arraycopy(bArr, 12, bArr4, 0, length);
        cipher.init(2, new SecretKeySpec(b, "AES"), new GCMParameterSpec(128, bArr3));
        return cipher.doFinal(bArr4);
    }

    private static byte[] b(String str, byte[] bArr) throws Throwable {
        return SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(new PBEKeySpec(str.toCharArray(), bArr, 16384, 256)).getEncoded();
    }

    public static void main(String[] args) {
      try {
      File folder = new File("data/");
        File outFile = new File("libnative.so");
        FileOutputStream fileOutputStream = new FileOutputStream(outFile);

        // Check if the folder exists and is indeed a directory
        if (!folder.exists() || !folder.isDirectory()) {
            System.out.println("Invalid folder path.");
            return;
        }

        // List all files in the directory
        File[] files = folder.listFiles();
        Arrays.sort(files, new Comparator<File>() {
            @Override
            public int compare(File o1, File o2) {
                int n1 = Integer.parseInt(o1.getName().split("\\$")[0]);
                int n2 = Integer.parseInt(o2.getName().split("\\$")[0]);
                return n1 - n2;
            }
        });
        if (files != null) {
            for (File file : files) {
                if (file.isFile()) { // Only process files (not directories)
                System.out.println("reading file: " + file.getName());
                    try (FileInputStream fis = new FileInputStream(file)) {
                        // Read file into byte array
                        byte[] fileBytes = new byte[(int) file.length()];
                        fis.read(fileBytes);
                        
                        // Call the function with filename and file bytes
                        byte[] result = a(fileBytes, "wallowinpain", Base64.getDecoder().decode(file.getName().split("\\$")[1].replace('-', '+').replace('_', '/') + "=="));
                        fileOutputStream.write(result);
                    } catch (IOException e) {
                        System.out.println("Error reading file: " + file.getName());
                        e.printStackTrace();
                    }
                }
            }
            fileOutputStream.close();
        } else {
            System.out.println("No files found in the folder.");
        }
    } catch (Throwable th) {
      System.out.println("An error occurred: " + th);
    }
    }
}
```

I placed this file in `resources/assets`. Compile with `javac h2.java` and run it with `java h2.java`, and libnative.so pops out.

# Debugging setup

To do testing with this library I created a new project in Android Studio. Then I created a `jniLibs` folder under `app/src/main`, a subfolder `x86_64` under that, and copied libnative.so there. To load the library, I created the following java class:

```java:Test.java
package com.example.myapplication;

public class Test {
    static {
        System.loadLibrary("native");
    }

    public static native void nativeMethod();
}
```

I called nativeMethod when the main activity starts:

```kotlin:MainActivity.kt
...
    
    override fun onStart() {
        super.onStart()
        Test.nativeMethod()
    }

...
```

# libnative.so reversing

After importing libnative.so into ghidra, we can see the nativeMethod hook:

```c
void Java_DynamicClass_nativeMethod(undefined8 param_1)

{
  undefined4 uVar1;
  
  __android_log_print(3,&DAT_00100a2f,
                      "There are walls ahead that you\'ll need to face. They have been specially designed to always result in an error. One false move and you won\'t be able to get the desired result. Are you able to patch your way out of this mess?"
                     );
  uVar1 = FUN_00103230();
  uVar1 = FUN_00101eb0(uVar1);
  uVar1 = FUN_00101f90(param_1,uVar1);
  FUN_001023f0(param_1,uVar1);
  return;
}
```

Let's look at the first function `FUN_00103230`:

```c
void FUN_00103230(void)

{
  syscall();
                    /* WARNING: Could not recover jumptable at 0x001032b2. Too many branches */
                    /* WARNING: Treating indirect jump as call */
  (*(code *)PTR_LAB_00105c00)(0xffffff9c,s_/sys/wall/facer_00105ab0,0);
  return;
}
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