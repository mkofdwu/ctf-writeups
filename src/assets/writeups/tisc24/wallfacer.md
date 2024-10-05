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

It seems to be a page where string decryption is going on, however we have to provide the key and iv. The value of `R.string.str` can be found under `resources/res/values/strings.xml`: 

```xml:strings.xml
...
    <string name="str">4tYKEbM6WqQcItBx0GMJvssyGHpVTJMhpjxHVLEZLVK6cmIH7jAmI/nwEJ1gUDo2</string>
...
```

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

> Stuff that didn't work
> 
> At this point, I went down a few different rabbit holes. Following the hint in the challenge description that *something* was being loaded at runtime, I rooted my android emulator (took way longer than I would like to admit) and used [Fridump](https://github.com/Nightbringer21/fridump) to dump the app memory. I thought that perhaps the sqlite file was being decrypted at runtime, so the decrypted file would be in the memory dump. This proved to be false.

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

# Loading libnative.so

To do testing with this library I created a new project in Android Studio. Then I created a `jniLibs` folder under `app/src/main`, a subfolder `x86_64` under that, and copied libnative.so there. To load the library, I created the following java class:

```java:DynamicClass.java
package com.example.myapplication;

public class DynamicClass {
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
        DynamicClass.nativeMethod()
    }

...
```

Now running the app, we can open up the LogCat window and filter by "TISC":

![](/tisc24/libnative_logs_linkerr.png)

Unfortunately, get the error above: `java.lang.UnsatisfiedLinkError: No implementation found for void com.example.myapplication.DynamicClass.nativeMethod() (tried Java_com_example_myapplication_DynamicClass_nativeMethod and Java_com_example_myapplication_DynamicClass_nativeMethod__)`. So android requires a specific function name to resolve the native function, in the format `Java_<package>_<class_name>_<method_name>`.

Because it's a dynamically loaded java class, the package field is omitted, so the function in libnative.so is just called `Java_DynamicClass_nativeMethod`. But how do we get android to omit the package name when it searches for the function?

My solution was to rename the symbol in libnative.so to `Java_com_a_a_Test_nativeMethod`. This is the same length as the original function name so no problems should occur. I created a new android project with the package name `com.a.a`, and the java class named `Test`. Everything else remained the same. Here is the python script used to patch it:

```python:patch.py
import lief

with open('libnative.so', 'rb') as f:
    data = f.read()

newdata = data[:]

# NOTE: the following doesnt work, i have no idea why...
# newdata = newdata.replace(b'Java_DynamicClass_nativeMethod', b'Java_com_a_a_Test_nativeMethod')

with open('libnative1.so', 'wb') as f:
    f.write(newdata)

# instead i have to use lief to change method name:
lib = lief.parse('libnative1.so')
for x in lib.exported_symbols:
    if x.name == 'Java_DynamicClass_nativeMethod':
        x.name = 'Java_com_a_a_Test_nativeMethod'
lib.write('libnative1.so')
lib.write('/home/smalldonkey/dev/android/A/app/src/main/jniLibs/x86_64/libnative1.so')  # for convenience
```

In Test.java I changed `System.loadLibrary("native")` to `System.loadLibrary("native1")`. Running the app again, we see more logs, showing that the function was invoked successfully:

![](/tisc24/libnative_logs_fail.png)

Recalling the query.java activity earlier, I tried using the printed key and iv to decrypt the string:

```java:Decrypt.java
import java.util.Base64;
import java.util.Arrays;
import javax.crypto.Cipher;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.SecretKeySpec;

class Decrypt {
    public static void main(String[] args) {
        try {
            byte[] decode = Base64.getDecoder().decode("4tYKEbM6WqQcItBx0GMJvssyGHpVTJMhpjxHVLEZLVK6cmIH7jAmI/nwEJ1gUDo2");
            byte[] bytes = "z?<NKKf7m?MUg&>qBp\"b9G$A!bzP&0I(".getBytes();
            System.out.println(bytes.length);
            byte[] bytes2 = "apI3`ipq.?3d!t#6".getBytes();
            System.out.println(bytes2.length);
            Cipher cipher = Cipher.getInstance("AES/CBC/PKCS5Padding");
            cipher.init(2, new SecretKeySpec(bytes, "AES"), new IvParameterSpec(bytes2));
            System.out.println("Decrypted data: ".concat(new String(cipher.doFinal(decode))));
        } catch (Exception unused) {
            System.out.println("Failed to decrypt data");
            System.out.println(unused);
        }
    }
}
```

Unfortunately, this didn't work. Seems like we have to do more reversing to figure out how to get the correct key and iv.

# Reversing libnative.so

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

Referring to [this example](https://developer.android.com/ndk/samples/sample_hellojni#ci) from the android docs, we can see actual function signature:

```c
JNIEXPORT jstring JNICALL
Java_com_example_hellojni_HelloJni_stringFromJNI( JNIEnv* env,
                                                  jobject thiz )
```

I found [this github repo](https://github.com/extremecoders-re/ghidra-jni) containing the definitions for the JNI objects, which should greatly aid our decompilation. I imported it into ghidra following the instructions in the README.

I then updated the function signature (right click function name, edit function signature):

```c
void Java_com_a_a_Test_nativeMethod(JNIEnv *param_1)

{
  undefined4 uVar1;
  uint uVar2;
  
  __android_log_print(3,&DAT_00100a2f,
                      "There are walls ahead that you\'ll need to face. They have been specially des igned to always result in an error. One false move and you won\'t be able to g et the desired result. Are you able to patch your way out of this mess?"
                     );
  uVar1 = FUN_00103230();
  uVar2 = FUN_00101eb0(uVar1);
  uVar2 = FUN_00101f90(param_1,uVar2);
  FUN_001023f0(param_1,uVar2);
  return;
}
```

This will be more useful for the third function call, `FUN_00101f90`, later on. For now, let's look at the first function `FUN_00103230`:

# First wall

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

Looks some something went wrong in the decompilation. Looking at the disassembly, we can see what is actually going on.

```plaintext
   00103230 55         PUSH    RBP
   00103231 48 89 e5   MOV     RBP,RSP
   00103234 48 83      SUB     RSP,0x50
            ec 50
   00103238 48 8d      LEA     RAX,[PTR_LAB_00105c00]                           = 00103316
            05 c1 
            29 00 00
   0010323f 48 89      MOV     qword ptr [RBP + local_10],RAX=>PTR_LAB_00105c00 = 00103316
            45 f8
   00103243 c7 45      MOV     dword ptr [RBP + local_18],0x1
            f0 01 
            00 00 00
   0010324a c7 45      MOV     dword ptr [RBP + local_1c],0xffffff9c
            ec 9c 
            ff ff ff
   00103251 c7 45      MOV     dword ptr [RBP + local_20],0x0
            e8 00 
            00 00 00
   00103258 c7 45      MOV     dword ptr [RBP + local_24],0x0
            e4 00 
            00 00 00
   0010325f 8b 45 e4   MOV     EAX,dword ptr [RBP + local_24]
   00103262 89 45 dc   MOV     dword ptr [RBP + local_2c],EAX
   00103265 8b 7d ec   MOV     EDI,dword ptr [RBP + local_1c]
   00103268 8b 55 e8   MOV     EDX,dword ptr [RBP + local_20]
   0010326b 44 8b      MOV     R10D,dword ptr [RBP + local_2c]
            55 dc
   0010326f 48 8d      LEA     RSI,[s_/sys/wall/facer_00105ab0]                 = "/sys/wall/facer"
            35 3a 
            28 00 00
   00103276 b8 01      MOV     EAX,0x101
            01 00 00
   0010327b 0f 05      SYSCALL
   0010327d 89 45 e0   MOV     dword ptr [RBP + local_28],EAX
   00103280 8b 45 e0   MOV     EAX,dword ptr [RBP + local_28]
   00103283 c1 e8 1f   SHR     EAX,0x1f
   00103286 89 45 f4   MOV     dword ptr [RBP + local_14],EAX
   00103289 48 8b      MOV     RAX,qword ptr [RBP + local_10]
            45 f8
   0010328d 48 63      MOVSXD  RCX,dword ptr [RBP + local_14]
            4d f4
   00103291 48 8b      MOV     RAX=>PTR_LAB_00105c00,qword ptr [RAX + RCX*0x8]  = 00103316
            04 c8
   00103295 48 8d      LEA     RCX,[PTR_LAB_00105b60]                           = 001032b4
            0d c4 
            28 00 00
   0010329c 48 89      MOV     qword ptr [RBP + local_38],RCX=>PTR_LAB_00105b60 = 001032b4
            4d d0
   001032a0 c7 45      MOV     dword ptr [RBP + local_3c],0x2
            cc 02 
            00 00 00
   001032a7 48 89      MOV     qword ptr [RBP + local_48],RCX=>PTR_LAB_00105b60 = 001032b4
            4d c0
   001032ab c7 45      MOV     dword ptr [RBP + local_4c],0x2
            bc 02 
            00 00 00
   001032b2 ff e0      JMP     RAX
```

So it's performing a syscall with rax = 0x101. Consulting [https://x64.syscall.sh/](https://x64.syscall.sh/) shows that is an `openat` call. dfd = 0xffffff9c and filename = "/sys/wall/facer". The output (in rax) is then shifted right by 31 bits and stored in rcx. Then we have `MOV     RAX=>PTR_LAB_00105c00,qword ptr [RAX + RCX*0x8]`. At the end, there is a `jmp rax` instruction.

The output of the `openat` syscall will return a file descriptor or a negative number if an error has occured (if the file does not exist, for example). The SHR instruction is basically checking whether the output is negative, and based on that, take either one of two paths under `PTR_LAB_00105c00`.

Viewing the `PTR_LAB_00105c00` symbol shows those two paths:

![](/tisc24/libnative_filecheck_branch.png)

The second branch (taken when output is negative, rcx = 1) prints out "I need a very specific file to be available. Or do I?". The first branch, however, prints the string "One wall down!", and it can be reached when the file is opened successfully.

```c
void UndefinedFunction_00103316(void)

{
  undefined4 uVar1;
  long unaff_RBP;
  
  *(undefined4 *)(unaff_RBP + -0x4c) = 8;
  uVar1 = FUN_00103370(*(undefined4 *)(unaff_RBP + -0x10));
  *(undefined4 *)(unaff_RBP + -0x10) = uVar1;
  uVar1 = FUN_00103370(*(undefined4 *)(unaff_RBP + -0x10),5);
  *(undefined4 *)(unaff_RBP + -0x10) = uVar1;
  uVar1 = FUN_00103370(*(undefined4 *)(unaff_RBP + -0x10),*(undefined4 *)(unaff_RBP + -0x4c));
  *(undefined4 *)(unaff_RBP + -0x10) = uVar1;
  __android_log_print(4,&DAT_00100a2f,"One wall down!");
                    /* WARNING: Could not recover jumptable at 0x0010336d. Too many branches */
                    /* WARNING: Treating indirect jump as call */
  (**(code **)(*(long *)(unaff_RBP + -0x40) + (long)*(int *)(unaff_RBP + -0x44) * 8))();
  return;
}
```

Looking at `FUN_00103370`, what it's doing is not immediately clear, but it's just doing some operations on some global values.

```c
/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

int FUN_00103370(int param_1,int param_2)

{
  int iVar1;
  int *piVar2;
  int *piVar3;
  int local_38 [4];
  int local_28;
  undefined auStack_18 [4];
  int local_14;
  int local_10;
  int local_c;
  
  piVar3 = (int *)auStack_18;
  local_10 = param_1;
  local_c = param_2;
  if (0x933c5b6d < (((DAT_00105b50 & _DAT_00105b54) / 0xe671c09a ^ 0x509a612a) & 0x2517461d)) {
    piVar3 = local_38;
    local_38[0] = param_2;
    local_28 = param_1 * param_2;
  }
  do {
    iVar1 = local_c;
    piVar2 = piVar3 + -4;
    piVar3 = piVar3 + -8;
    *piVar2 = local_10;
    *piVar3 = iVar1;
    *piVar2 = *piVar3 * *piVar2;
    local_14 = *piVar2;
  } while ((DAT_00105b58 * DAT_00105b5c & 0xdb331b78U) == 0x5971cd31);
  return *piVar2;
}
```

I just thought of it as a black box, perhaps some 'hash function', and postulated that these values are used to calculate the key and iv. Notice that the "One wall down!" branch calls this function with different values compared to the branch that prints "I need a very specific file to be available. Or do I?". Hence, I just assumed that as long as we reach the branch that prints the correct string, the correct values will be updated which will hopefully result in the correct key and iv later being printed. I applied the same logic to walls 2 and 3.

I tried creating the file at `sys/wall/facer` but it didn't work, even though I was root. So I tried replacing the file path with something I could write to by patching the binary:

```python:patch.py
...
newdata = newdata.replace(b'/sys/wall/facer', b'/data/local/ttt')
...
```

For some reason, this still didn't work even though the file was clearly present. Eventually I just patched the assembly code itself, replacing

```x86asm
mov eax, 0x101
syscall
```

with

```x86asm
mov eax, 0x1
nop
nop
```

So it will be as if the syscall returned a fd of 1.

I updated patch.py:

```python:patch.py
...
# handle file check
j = 0x2277
newdata = newdata[:j] + b'\x01\x00\x00\x00\x90\x90' + newdata[j+6:]
...
```

Running the app with the patched libnative.so successfully prints `One wall down!`. However, there are more errors, more patching to be done. Let's look at the next function:

# Second wall

```c
undefined4 FUN_00101eb0(undefined4 param_1)

{
  undefined4 uVar1;
  uint local_2c;
  undefined8 local_18;
  undefined4 local_10;
  undefined4 local_c;
  
  local_c = param_1;
  local_18 = 0x90ec8148e5894855;
  local_10 = 0x48000000;
  for (local_2c = 0;
      (local_2c < 0xc &&
      (FUN_00103430[(int)local_2c] == *(code *)((long)&local_18 + (long)(int)local_2c)));
      local_2c = local_2c + 1) {
  }
  if (local_2c != 0xc) {
    for (local_2c = 0; local_2c < 0xc; local_2c = local_2c + 1) {
      FUN_00103430[(int)local_2c] = *(code *)((long)&local_18 + (long)(int)local_2c);
    }
  }
  uVar1 = FUN_00103430(0x1,param_1);
  return uVar1;
}
```

There is clearly some dynamic updating of executable code going on in the first part. However, upon inspection I realised it wasn't actually changing anything. Let's look at `FUN_00103430`:

```c
void FUN_00103430(int param_1)

{
  switch(param_1 == 0x539) {
  case false:
    __android_log_print(6,&DAT_00100a2f,"HAHAHA are you sure you\'ve got the right input parameter?"
                       );
                    /* WARNING: Could not recover jumptable at 0x001035a2. Too many branches */
                    /* WARNING: Treating indirect jump as call */
    (*(code *)PTR_LAB_00105ba8)();
    return;
  case true:
    __android_log_print(4,&DAT_00100a2f,"Input verification success!");
                    /* WARNING: Could not recover jumptable at 0x0010357a. Too many branches */
                    /* WARNING: Treating indirect jump as call */
    (*(code *)PTR_LAB_00105b98)();
    return;
  }
}
```

It's checking that the first parameter is 0x539. However, it is clearly being passed the constant value of 0x1.

There are many ways to patch this, the solution I settled on was replacing 0x539 with 0x1:

```python:patch.py
# handle parameter check
i = 0x2450
newdata = newdata[:i] + b'\x01\x00' + newdata[i+2:]
```

Now we get `Input verification success!`. Let's continue to the third function.

# Third wall

This function is a bit longer. I retyped the function so that the first parameter is correctly typed as `JNIEnv *`. Now the code is much more understandable.

```c
undefined4 FUN_00101f90(JNIEnv *param_1,uint param_2)

{
  _func_259 *p_Var1;
  JNIEnv *env;
  jclass clazz;
  jsize digestLen;
  uint local_bc;
  undefined8 local_a4;
  undefined4 local_9c;
  int i;
  int local_94;
  jbyte *local_90;
  long local_88;
  jbyte *local_80;
  int local_74;
  jbyteArray digest;
  jobject p2bytes;
  jmethodID String_getBytes;
  jobject msgDigestSHA1;
  jstring s_SHA_1;
  jmethodID MessageDigest_digest;
  jmethodID MessageDigest_update;
  jmethodID MessageDigestClass_getInstance;
  jclass MessageDigestClass;
  jstring p2str;
  char local_1f [11];
  uint local_14;
  JNIEnv *local_10;
  
  local_14 = param_2;
  local_10 = param_1;
  sprintf(local_1f,"%d",(ulong)param_2);
  p2str = (*(*local_10)->NewStringUTF)(local_10,local_1f);
  MessageDigestClass = (*(*local_10)->FindClass)(local_10,"java/security/MessageDigest");
  MessageDigestClass_getInstance =
       (*(*local_10)->GetStaticMethodID)
                 (local_10,MessageDigestClass,"getInstance",
                  "(Ljava/lang/String;)Ljava/security/MessageDigest;");
  MessageDigest_update = (*(*local_10)->GetMethodID)(local_10,MessageDigestClass,"update","([B)V");
  MessageDigest_digest = (*(*local_10)->GetMethodID)(local_10,MessageDigestClass,"digest","()[B");
  s_SHA_1 = (*(*local_10)->NewStringUTF)(local_10,"SHA-1");
  msgDigestSHA1 =
       (*(*local_10)->CallStaticObjectMethod)
                 (local_10,MessageDigestClass,MessageDigestClass_getInstance,s_SHA_1);
  env = local_10;
  p_Var1 = (*local_10)->GetMethodID;
  clazz = (*(*local_10)->GetObjectClass)(local_10,p2str);
  String_getBytes = (*p_Var1)(env,clazz,"getBytes","()[B");
  p2bytes = (*(*local_10)->CallObjectMethod)(local_10,p2str,String_getBytes);
  (*(*local_10)->CallVoidMethod)(local_10,msgDigestSHA1,MessageDigest_update,p2bytes);
  digest = (*(*local_10)->CallObjectMethod)(local_10,msgDigestSHA1,MessageDigest_digest);
  digestLen = (*(*local_10)->GetArrayLength)(local_10,digest);
  local_74 = (int)digestLen;
  local_80 = (*(*local_10)->GetByteArrayElements)(local_10,digest,(jboolean *)0x0);
  local_88 = (long)local_74;
  local_90 = local_80;
  local_94 = 0;
  for (i = 0; i < 0x14; i = i + 1) {
    local_94 = (uint)(byte)local_80[i] + local_94;
  }
  local_a4 = 0xb0ec8148e5894855;
  local_9c = 0x48000000;
  for (local_bc = 0;
      (local_bc < 0xc &&
      (FUN_001035b0[(int)local_bc] == *(code *)((long)&local_a4 + (long)(int)local_bc)));
      local_bc = local_bc + 1) {
  }
  if (local_bc != 0xc) {
    for (local_bc = 0; local_bc < 0xc; local_bc = local_bc + 1) {
      FUN_001035b0[(int)local_bc] = *(code *)((long)&local_a4 + (long)(int)local_bc);
    }
  }
  local_14 = FUN_001035b0(local_94,local_14);
  (*(*local_10)->ReleaseByteArrayElements)(local_10,digest,local_80,0);
  (*(*local_10)->DeleteLocalRef)(local_10,p2str);
  (*(*local_10)->DeleteLocalRef)(local_10,s_SHA_1);
  (*(*local_10)->DeleteLocalRef)(local_10,p2bytes);
  (*(*local_10)->DeleteLocalRef)(local_10,digest);
  (*(*local_10)->DeleteLocalRef)(local_10,msgDigestSHA1);
  (*(*local_10)->DeleteLocalRef)(local_10,MessageDigestClass);
  return local_14;
}
```

Reversing the java part reveals that it does something like this (translated to python): `local_94 = sum(hashlib.sha1(str(param_2).encode()).digest())`. This value is then passed as the first parameter to `FUN_001035b0`:

```c
void FUN_001035b0(int param_1)

{
  __android_log_print(3,&DAT_00100a2f,"Bet you can\'t fix the correct constant :)");
  switch(param_1 == 0x539) {
  case false:
    __android_log_print(6,&DAT_00100a2f,
                        "I\'m afraid I\'m going to have to stop you from getting the correct key and  IV."
                       );
                    /* WARNING: Could not recover jumptable at 0x00103830. Too many branches */
                    /* WARNING: Treating indirect jump as call */
    (*(code *)PTR_LAB_00105bc8)();
    return;
  case true:
                    /* WARNING: Could not recover jumptable at 0x001036e2. Too many branches */
                    /* WARNING: Treating indirect jump as call */
    (*(code *)PTR_LAB_00105bc8)();
    return;
  }
}
```

Here's the relevant disassembly:

```plaintext
   001035bb 48 8d      LEA     RAX,[switchD_0010366e::switchdataD_00105c30]                         = 0010380a
            05 6e 
            26 00 00
   001035c2 48 89      MOV     qword ptr [RBP + local_10],RAX=>switchD_0010366e::switchdataD_00105  = 0010380a
            45 f8

...

   001035e6 8b 45 f0   MOV     EAX,dword ptr [RBP + local_18] // param_1
   001035e9 8b 0d      MOV     ECX,dword ptr [DAT_00100ba8]                                         = 00000539h
            b9 d5 
            ff ff
   001035ef 29 c8      SUB     EAX,ECX
   001035f1 0f 94 c0   SETZ    AL
   001035f4 0f b6 c0   MOVZX   EAX,AL
   001035f7 89 45 f4   MOV     dword ptr [RBP + local_14],EAX
   001035fa 48 8b      MOV     RAX,qword ptr [RBP + local_10]
            45 f8
   001035fe 48 63      MOVSXD  RCX,dword ptr [RBP + local_14]
            4d f4
   00103602 48 8b      MOV     RAX=>switchD_0010366e::switchdataD_00105c30,qword ptr [RAX + RCX*0x8]= 0010380a
            04 c8

...

                    switchD_0010366e::switchD
   0010366e ff e0      JMP     RAX
```

So at the end, it's jumping to the code at `switchD_0010366e::switchdataD_00105c30[param_1 - 0x539]`. We clearly want to avoid the first branch, so let's look at the what the second branch does:

```plaintext
                    switchD_0010366e::caseD_1         XREF[3]: 0010366e(j), 
                                                               00105bb8(*), 
                                                               00105c38(*)  
   001036d6 48 63      MOVSXD  RCX,dword ptr [RBP + local_2c]
            4d dc
   001036da 48 8b      MOV     RAX,qword ptr [RBP + local_28]
            45 e0
   001036de 48 8b      MOV     RAX,qword ptr [RAX + RCX*0x8]=>PTR_LAB_00105bc8                      = 00103779
            04 c8
   001036e2 ff e0      JMP     RAX=>LAB_00103779
```

local_2c and local_28 are constants previously set in the parent function:

```plaintext
   00103606 48 8d      LEA     RCX,[PTR_LAB_00105b60]                                               = 001032b4
            0d 53 
            25 00 00
   0010360d 48 89      MOV     qword ptr [RBP + local_28],RCX=>PTR_LAB_00105b60                     = 001032b4
            4d e0
   00103611 c7 45      MOV     dword ptr [RBP + local_2c],0xd
            dc 0d 
            00 00 00
```

So calculating the expected value, we should end up at jumping to the address at 0x105bc8:

```plaintext
                    PTR_LAB_00105bc8                  XREF[2]: check_constant:001036d
                                                               check_constant:0010382
   00105bc8 79 37      addr    LAB_00103779
            10 00 
            00 00 
   00105bd0 70 36      addr    LAB_00103670
            10 00 
            00 00 
   00105bd8 43 37      addr    LAB_00103743
            10 00 
            00 00 
   00105be0 e4 36      addr    LAB_001036e4 // win function
            10 00 
            00 00 
   00105be8 9b 37      addr    LAB_0010379b
            10 00 
            00 00 
   00105bf0 65 37      addr    LAB_00103765
            10 00 
            00 00 
   00105bf8 fe 37      addr    LAB_001037fe
            10 00 
            00 00 
```

Looking at the code at `LAB_00103779` we see it eventually leads to printing "Not like this..." However, we can also see that `LAB_001036e4` is in the array of pointers, and it prints "I guess it\'s time to reveal the correct key and IV!". So by setting `param_1` to 0x53a and replacing 0xd with 0x10 we should reach that branch.

However, there is a simpler solution. Looking back at `switchD_0010366e::switchdataD` we see the our desired destination is also in this array of pointers:

```plaintext
                    switchD_0010366e::switchdataD_00  XREF[3]: check_constant:001035b
                                                               check_constant:001035c
                                                               check_constant:0010360
   00105c30 0a 38      addr    switchD_0010366e::caseD_0
            10 00 
            00 00 
   00105c38 d6 36      addr    switchD_0010366e::caseD_1
            10 00 
            00 00 
                    PTR_LAB_00105c40                  XREF[2]: check_constant:0010362
                                                               check_constant:0010362
   00105c40 43 37      addr    LAB_00103743
            10 00 
            00 00 
   00105c48 70 36      addr    LAB_00103670
            10 00 
            00 00 
                    PTR_LAB_00105c50                  XREF[2]: check_constant:0010363
                                                               check_constant:0010364
   00105c50 9b 37      addr    LAB_0010379b
            10 00 
            00 00 
   00105c58 e4 36      addr    LAB_001036e4 // <-- here!
            10 00 
            00 00 
```

So if we set `param_1 = 0x539 + 5`, we should jump to the correct branch immediately!

For this patch, I replaced the following assembly:

```x86asm
sub eax, ecx ; eax = param_1, ecx = 0x539
setz al
movzx eax, al
```

with:

```x86asm
xor eax, eax
add eax, 0x5
nop
nop
nop
```

This was done in the patch.py script (assembly was compiled with pwntools `asm` function):

```python:patch.py
...
# replace eax with the correct value ...
k = 0x25ef
newdata = newdata[:k] + b'1\xc0\x83\xc0\x05\x90\x90\x90' + newdata[k+8:]
...
```

Running the app with the patched libnative.so, there seem to be no errors, and a new key and iv is printed:

![](/tisc24/libnative_logs_success.png)

Running Decrypt.java with the updated key and iv, the flag is printed!

`TISC{1_4m_y0ur_w4llbr34k3r_!i#Leb}`

Here is the final patch.py script:

```python:patch.py
from Crypto.Util.number import long_to_bytes as ltb
import lief

with open('libnative.so', 'rb') as f:
    data = f.read()
newdata = data[:]

# handle file check
j = 0x2277
newdata = newdata[:j] + b'\x01\x00\x00\x00\x90\x90' + newdata[j+6:]

# handle parameter check
i = 0x2450
newdata = newdata[:i] + b'\x01\x00' + newdata[i+2:]

# replace eax with the correct value ...
k = 0x25ef
newdata = newdata[:k] + b'1\xc0\x83\xc0\x05\x90\x90\x90' + newdata[k+8:]

with open('libnative1.so', 'wb') as f:
    f.write(newdata)

lib = lief.parse('libnative1.so')
for x in lib.exported_symbols:
    if x.name == 'Java_DynamicClass_nativeMethod':
        x.name = 'Java_com_a_a_Test_nativeMethod'
lib.write('libnative1.so')
```

# More debugging notes

While patching libnative.so, there were many times I needed to see what was actually going on in memory. I wasn't able to attach gdb or setup any other debugger, however I found the following approach sufficient:

I would replace a certain instruction with the `\xcc` opcode, as follows:

```python:patch.py
...
# for debugging
k = 0x2830
newdata = newdata[:k] + b'\xcc' + newdata[k+1:]
...
```

When android reaches this instruction, the app would crash a memory dump would be printed to LogCat:

![](/tisc24/libnative_logs_memdump.png)

Thus, I was able to inspect the values of each register, which for this challenge was sufficient to debug effectively.
