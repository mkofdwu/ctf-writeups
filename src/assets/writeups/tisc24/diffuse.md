NOTE: This writeup is still WIP. Here are some notes I took while solving the challenge, as well as any solve script(s)

# Stuff I did (and stuff todo)

- Listed processes using `get-process`
- Used script at https://stackoverflow.com/questions/43810090/print-directory-tree-but-exclude-a-folder-on-windows-cmd/43810460#43810460 to list all files below home directory, including hidden
- potentially useful folders (to explore)
    - `C:\WindowsAzure\Logs`
        - Doesn’t seem to be useful
    - `C:\ProgramData\USOPrivate\UpdateStore\store.db`
        - windows Update Session Orchestrator (doesnt seem to be important)
    - `C:\$Recycle.Bin`
    - `C:\Users\diffuser\AppData\Local\ConnectedDevicesPlatform`
    - `C:\Users\diffuser\AppData\Local\Comms\UnistoreDB`
        - Stores mail application data: https://darkdefender.medium.com/windows-10-mail-app-forensics-39025f5418d2
    - `C:\Users\diffuser\AppData\Local\Microsoft\Credentials`
        - Contains a file which im not sure how to decode, or if it even contains useful data
    - `C:\Users\diffuser\AppData\Local\Microsoft\Edge\User Data\Default`
    - There is nothing in firefox appdata
- https://cybercx.com/blog/forensic-applications-of-microsoft-recall/
- NOTE: the embedded key *might* be inside `ukg.db-wal` (3x the size of ukg.db, seems to contain 5 sqlite databases inside). If stuck maybe look into this
- https://www.avrfreaks.net/s/topic/a5C3l000000U4mYEAS/t032182
- https://www.avrfreaks.net/s/topic/a5C3l000000UU2mEAG/t129282
- https://security-bits.de/posts/2022/10/28/h2hc22_ctf.html

# Discoveries

- `C:\Users\diffuser\AppData\Roaming\Notepad++\session.xml`
    
    ```xml
    <?xml version="1.0" encoding="UTF-8" ?>
    <NotepadPlus>
        <Session activeView="0">
            <mainView activeIndex="0">
                <File firstVisibleLine="0" xOffset="0" scrollWidth="767" startPos="0" endPos="0" selMode="0" offset="0" wrapCount="1" lang="None (Normal Text)" encoding="-1" userReadOnly="no" filename="C:\ProgramData\ssh\administrators_authorized_keys" backupFilePath="" originalFileLastModifTimestamp="2063987712" originalFileLastModifTimestampHigh="31125496" tabColourId="-1" RTL="no" mapFirstVisibleDisplayLine="-1" mapFirstVisibleDocLine="-1" mapLastVisibleDocLine="-1" mapNbLine="-1" mapHigherPos="-1" mapWidth="-1" mapHeight="-1" mapKByteInDoc="512" mapWrapIndentMode="-1" mapIsWrap="no" />
            </mainView>
            <subView activeIndex="0" />
        </Session>
    </NotepadPlus>
    ```
    
- The file can be read! `C:\ProgramData\ssh\administrators_authorized_keys`

```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIJTqgxgPGCQeH4WIBaJUzINUJI9AODN49u3L3PgZ+0gf diffuse@DIFFUSE
```

- We can’t use it in any way though…
- `C:\Users\diffuser\AppData\Local\Microsoft\Edge\User Data\Default\History`, open the database in vscode, we see that the user has been browsing the following:
    - https://github.com/thebookisclosed/AmperageKit?tab=readme-ov-file
    - https://github.com/xaitax/TotalRecall/tree/main
- Sounds like its related to the challenge
    - cannot access the folder at `C:\Users\diffuser\AppData\Local\CoreAIPlatform.00\UKP`
    - are the github repos downloaded anywhere?
- Wait what, I can just run the command to grant myself permissions to access the folder!?
    - `icacls UKP /grant diffuser:(OI)(CI)F /T /C /Q`
    - Taken from totalrecall.py
- But I still cannot access `ukg.db`
    - Find out more about `icacls` command from ChatGPT
    - After giving read permission (`icacls ukg.db /grant diffuser:R /T /C /Q` ), I can now read the database!
- Found out there is a server running on [localhost](http://localhost) port 80 (from commands curling it in ukg database)
- The (incomplete) curl command found in `ukg.db` provided me with a hint that there is a php rce vulnerability
- Searched google for `xampp php hacktricks`
    - Found this very interesting part: https://book.hacktricks.xyz/network-services-pentesting/pentesting-web/php-tricks-esp#xampp-cgi-rce-cve-2024-4577
    - Linked to this article: https://labs.watchtowr.com/no-way-php-strikes-again-cve-2024-4577/
    - Sending the payload returns 403 error
    - Testing different payloads reveals that the word `prepend` is being blacklisted
    - Just replace with `pr%65pend`
    - We are administrator!

```plaintext
C:\USERS\DIFFUSE
����Contacts
����Desktop
��  ��  key1.pub
��  ��  Microsoft Edge.lnk
��  ��  note_to_self.txt
��  ��  results.txt
��  ��
��  ����favourites
��  ��      arnold.png
��  ��      colin.png
��  ��      Screenshot 2024-08-02 150042.png
��  ��      Screenshot 2024-08-02 150059.png
��  ��
��  ����project_incendiary
��      ��  firmware.hex
��      ��  purchases.txt
��      ��
��      ����designs
��      ��      arduino.jpg
��      ��      cs explosive.jpg
��      ��      maxresdefault.jpg
��      ��      timer design.jpg
��      ��
��      ����locations
��      ��      m1.png
��      ��      map.jpg
��      ��      R.png
��      ��      Screenshot 2024-08-02 145507.png
��      ��
��      ����schemetics
��              key_to_embed.txt
��
����Documents
����Downloads
��      burpsuite_community_windows-arm64_v2024_5_5.exe
��      burpsuite_community_windows-x64_v2024_5_5.exe
��      burpsuite_pro_windows-arm64_v2024_5_5.exe
��      Firefox Installer.exe
��      OpenSSH-ARM64-v9.5.0.0.msi
��      OpenSSH-Win64-v9.5.0.0.msi
��      SysinternalsSuite-ARM64.zip
��      VC_redist.arm64.exe
��      xampp-windows-x64-8.1.25-0-VS16-installer.exe
��
����Favorites
��  ��  Bing.url
��  ��
��  ����Links
����Links
��      Desktop.lnk
��      Downloads.lnk
��
����Music
����OneDrive
����Pictures
��  ����Camera Roll
��  ����Saved Pictures
��  ����Screenshots
����Saved Games
����Searches
��      winrt--{S-1-5-21-2604933677-963243298-2121304844-500}-.searchconnector-ms
��
����Videos
    ����Captures
    ����Captures
```

- Finally got ssh working
    - Overwrite `C:\ProgramData\ssh\administrators_authorized_keys` with the following content:
        - `ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIBTGZOQYdeIrRMlhsHhpkFMVuUDOLXxDxHUUJ4wZJXkQ diffuse@DIFFUSE`
        - copied the private key over, ssh with `ssh -i diffusekey diffuse@20.212.177.201`
- Now there’s a firmware we presumably need to reverse
    - write a python script to convert hex strings to binary file
- Continue searching `diffuse` directory
    - Find interesting files in Notepad++ session: `AppData/Local/Setup.ps1`
    - Find `AppData/Roaming/Incendiary/Schematics/schematics.pdf`
- Realised I was decoding the .hex wrongly (in my python script to convert to it binary)
    - https://forum.arduino.cc/t/understanding-the-hex-file/59358/5
    - fixed the script and decomp in ghidra works flawlessly
- Cant make head or tail of either the ghidra decomp or the avr-objdump disassembly
    - Consult avr isa manual: https://ww1.microchip.com/downloads/en/devicedoc/atmel-0856-avr-instruction-set-manual.pdf
- Setup gdb with wokwi
    - https://rpmfind.net/linux/rpm2html/search.php?query=avr-gdb
    - https://linuxlink.timesys.com/docs/wiki/engineering/HOWTO_Use_GDBServer
    - https://github.com/alextrical/wokwi-24C01-custom-chip/tree/main
- After a lot of reversing (requiring both static and dynamic analysis), we realise its doing AES CBC decryption on some encrypted text, and checking that the flag is in the decrypted text. Also there's a seemingly randomly generated value we need to set to 0xe8 (done in gdb).
    - Presumably, the flag inside is not the actual flag
- Spent 1 day searching for the actual embedded key
- Realised there's a second page on schematics.pdf. it contains the key

```python:s.py
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad

with open('result_e8.bin', 'rb') as f: # binary dump of arduino memory from gdb
    data = f.read()[:0x900]

key = b'm59F$6/lHI^wR~C6'  # b'F8g3a_9V7G2$d#0h'
key = bytes([c ^ 0xe8 for c in key])
iv = b'K2Yl`b7X~2-(S.5('
iv = bytes([c ^ 0xe8 for c in iv])
cipher = AES.new(key, AES.MODE_CBC, iv)
out = cipher.decrypt(data[0x13f:0x1cf])
print(out)
```

`TISC{h3y_Lo0k_1_m4d3_My_0wn_h4rdw4r3_t0k3n!}`