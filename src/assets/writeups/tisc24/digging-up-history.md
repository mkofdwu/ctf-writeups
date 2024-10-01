# Overview

Unzipping `disk.zip` we see a single disk file: `csitfanUPDATED0509.ad1`. I ran some preliminary strings checks to see if there was anything immediately obvious, but nothing came up.

I opened the disk file in FTKImager, and began by looking in the user’s home folder.

![](/ftk_1.png)

There is a file `csitfan1@google[2].txt` under the Cookies folder (this later proved to be useless), as well as some program called `mypal`, which a quick google search reveals is a “web browser for windows XP”.

Looking under the Recent folder, we see there link files, shown below:

![](/ftk_2.png)

`flag.lnk` contains a reference to a file path `C:\Documents and Settings\csitfan1\Desktop\flag.sus`. Examining the contents of `flag.txt (2).lnk` and `flag.txt.lnk` show that the point to similar files in the Desktop folder, named `flag.txt` and `flag.txt.sus` respectively. Of course, these files did not exist. Perhaps they had been deleted?

# Recycle bins & restore points

I continued my search in the recycle bin and system restore points to try and find any trace of these files. 

![](/ftk_3.png)

This looks promising, there are seem to be 3 restore points as well as recycle bin data.

In the recycle bin, there is one INFO2 file (a few null bytes) and one INFO2.FileSlack file. The .FileSlack file seems to contain some JSON data from another deleted file, but otherwise nothing useful.

We have 3 restore points. I did some googling on Windows restore point data, and learned that each restore point stores important system files as well as registry info.

Take RP1 as an example:

![](/ftk_4.png)

Each `AXXXXXXX.ext` file contains the data of whichever file was backed up. The original filenames can be retrieved by referencing the `change.log` files, for example:

![](/ftk_5.png)

So `A0000011.dll` is actually `C:\Windows\System32\dllcache\fp4autl.dll`.

I spent some time looking through all the change.log files as well as the A files in each restore point but found nothing useful. I got stuck here for a while until I recalled the name of this challenge: `Digging Through History`. Remembering the mypal download I found in the user’s home folder, I put two and two together and realised I should probably try looking for any browsing history.

# Browsing history

Another google search revealed that mypal browsing history is stored under `places.sqlite` in mypal’s AppData folder. I exported the entire folder:

![](/ftk_6.png)

Then I opened up places.sqlite in vscode:

![](/places_sqlite.png)

The last url immediately caught my eye: `https://csitfan-chall.s3.amazonaws.com/flag.sus`. This was probably what the challenge description meant by 'hiding sensitive data through file hosting sites'. I downloaded the file, it contained the text `VElTQ3t0cnUzXzFudDNybjN0X2gxc3QwcjEzXzg0NDU2MzJwcTc4ZGZuM3N9`. Looks like base64. Decoding it with `echo VElTQ3t0cnUzXzFudDNybjN0X2gxc3QwcjEzXzg0NDU2MzJwcTc4ZGZuM3N9 | base64 -d`, we get the flag:

`TISC{tru3_1nt3rn3t_h1st0r13_8445632pq78dfn3s}`