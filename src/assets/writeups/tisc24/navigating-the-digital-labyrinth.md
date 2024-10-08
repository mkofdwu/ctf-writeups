# 1. OSINT

This challenge provides us with only a single username: `vi_vox223`. I started by trying to use `sherlock.py` to try and find which site this username is from, but somehow it didn't yield any useful results. After manually searching some common sites, I realised it was an Instagram username. (Lesson learned: sherlock is kinda useless?) 

I looked through the profile and saw an interesting higlights reel titled 'Discord'. 

![](/tisc24/vi_vox223_ig.png)

Seems like this discord bot is the next part of the challenge. A few slides later, another piece of information is revealed:

![](/tisc24/vi_vox223_ig_2.png)

# 2. Discord bot

I created an empty discord server and tried to add the bot from `https://top.gg/bot/1258440262951370813`. However, top.gg returned a 403 error.

After some googling, I found [this guide](https://discordjs.guide/preparations/adding-your-bot-to-servers.html#bot-invite-links) which described the format of the oauth url used to invite the bot to a server. After using the link `https://discord.com/api/oauth2/authorize?client_id=1258440262951370813&permissions=0&scope=bot%20applications.commands` I was able to add the bot to my server. However, the bot didn't seem to respond to my messages.

I thought it was because the bot was missing some permissions, and used the following site to get the correct permissions code: [https://discordapi.com/permissions.html](https://discordapi.com/permissions.html). After some failed attempts (I was pinging the bot when in retrospect I should have just typed the command at the start of each message) I eventually just gave the bot all permissions, inviting it to the server via the following link: `https://discord.com/oauth2/authorize?client_id=1258440262951370813&scope=bot&permissions=1099511627775`. Now the bot seems to be working properly.

![](/tisc24/factbuddy.png)

I created the role `D0PP3L64N63R` and assigned it to myself. Now when running `!help`, we get some new commands:

![](/tisc24/factbuddy_new_commands.png)

I listed the files:

![](/tisc24/factbuddy_list.png)

After looking through each file one by one, I reached `Update_030624.eml`:

```plaintext:Update_030624.eml
From: "Vivoxanderith"
To: "#Headquarters#"
Subject: Update: Current Location
Date: Fri, 3 June 2024 10:04:23 +0000
MIME-Version: 1.0
Content-Type: multipart/alternative; boundary="GHjAUmnVp3pjflDG5IhxdSTQubDQr=_qMq"

This is a multi-part message in MIME format

--GHjAUmnVp3pjflDG5IhxdSTQubDQr=_qMq
Content-Type: text/plain; charset="utf-8"
Content-Transfer-Encoding: quoted-printable
Content-Disposition: inline

Dear Headquarters,=20

I trust this message reaches you securely. I am writing to provide an =
update on my current location. I am currently positioned close to the =
midpoint of the following IDs:

=09
*	8c1e806a3ca19ff=20
=09
*	8c1e806a3c125ff=20
=09
*	8c1e806a3ca1bff=20

My location is pinpointed with precision using Uber's cutting-edge geo=
spatial technology, which employs shape-based location triangulation a=
nd partitions areas of the Earth into identifiable cells.

To initiate secure communication with me, please adhere to the discree=
t method we've established. Transmit the identified location's name th=
rough the secure communication channel accessible at https://www.linke=
din.com/company/the-book-lighthouse


Awaiting your confirmation and further operational directives.=20

Best regards,=20

Vivoxanderith
```

I visited the linkedin page and found [this post](https://www.linkedin.com/posts/the-book-lighthouse_thebooklighthouse-telegrambot-dictionarybot-activity-7217191335089385474-GtDA/). It contains a link to a telegram bot `@TBL_DictioNaryBot`, presumably the 'secure communication channel' refered to in the email.

# 3. Uber geolocation

Back to the email, the following part is an important:

```plaintext
I am currently positioned close to the =
midpoint of the following IDs:

=09
*	8c1e806a3ca19ff=20
=09
*	8c1e806a3c125ff=20
=09
*	8c1e806a3ca1bff=20

My location is pinpointed with precision using Uber's cutting-edge geo=
spatial technology, which employs shape-based location triangulation a=
nd partitions areas of the Earth into identifiable cells.
```

After googling for Uber's geospatial technology, I found the website: [https://h3geo.org/](https://h3geo.org/). Keying in the 3 hex values in the email shows a promising result:

![](/tisc24/uber_geolocation.png)

I tried sending the two locations named on the map, 'San francesco' and 'Cimitero di Sermoneta', to the Telegram bot, but this yielded no results. More digging is required. I found 'Cimitero di Sermoneta' on Google maps, and found that the exact location covered by the three hexagons was 'Quercia secolare'.

Submitting this to the Telegram bot, I got the flag!

![](/tisc24/tisc24_l1_flag.jpg)