import type { ChalInfo } from '@/types/ChalInfo'

export const chals: { [slug: string]: ChalInfo } = {
  'the-other-obligatory-pyjail': {
    ctf: 'LITCTF 2023',
    title: 'the other obligatory pyjail',
    author: 'quasar',
    description:
      'nowadays, setattr jails seem to be all the hype, and everyone loves builtins, so enjoy a setattr jail with builtins :>',
    cats: ['misc'],
    numSolves: 6,
    numPoints: 400,
    attachments: [
      {
        name: 'jail.py',
        url: 'http://34.27.167.72/dl/?misc/the%20other%20obligatory%20pyjail/jail.py'
      }
    ],
    sourceUrl: '',
    datePosted: '11/09/2023'
  },
  'disk-archaeology': {
    ctf: 'TISC 2023',
    title: 'Disk Archaeology',
    author: 'unknown',
    description: `Unknown to the world, the sinister organization PALINDROME has been crafting a catastrophic malware that threatens to plunge civilization into chaos. Your mission, if you choose to accept it, is to infiltrate their secret digital lair, a disk image exfiltrated by our spies. This disk holds the key to unraveling their diabolical scheme and preventing the unleashing of a suspected destructive virus.

You will be provided with the following file:
- md5(challenge.tar.xz) = 80ff51568943a39de4975648e688d6a3

Notes:
- challenge.tar.xz decompresses into challenge.img
- FLAG FORMAT is TISC{<some text you have to find>}`,
    cats: ['forensics'],
    numSolves: 327,
    numPoints: 0,
    attachments: [
      {
        name: 'challenge.tar.xz',
        url: 'https://api.tisc.csit-events.sg/file?id=clmdixhae2mx10886l94sz8p6&name=challenge.tar.xz'
      }
    ],
    sourceUrl: '',
    datePosted: '03/10/2023'
  },
  'reckless-mistake': {
    ctf: 'TISC 2023',
    title: "XIPHEREHPIX's Reckless Mistake",
    author: 'unknown',
    description: `Our sources told us that one of PALINDROME's lieutenants, XIPHEREHPIX, wrote a special computer program for certain members of PALINDROME. We have somehow managed to get a copy of the source code and the compiled binary. The intention of the program is unclear, but we think encrypted blob inside the program could contain a valuable secret.`,
    cats: ['crypto'],
    numSolves: 140,
    numPoints: 0,
    attachments: [
      {
        name: 'prog.c',
        url: 'https://api.tisc.csit-events.sg/file?id=clmdizzh52n03088618eflcgi&name=prog.c'
      },
      {
        name: 'XIPHEREHPIX',
        url: 'https://api.tisc.csit-events.sg/file?id=clmdizzk12n0m08863nocse1o&name=XIPHEREHPIX'
      }
    ],
    sourceUrl: '',
    datePosted: '03/10/2023'
  },
  kpa: {
    ctf: 'TISC 2023',
    title: 'KPA',
    author: 'unknown',
    description: `We've managed to grab an app from a suspicious device just before it got reset! The copying couldn't finish so some of the last few bytes got corrupted... But not all is lost! We heard that the file shouldn't have any comments in it! Help us uncover the secrets within this app!`,
    cats: ['mobile'],
    numSolves: 86,
    numPoints: 0,
    attachments: [
      {
        name: 'kpa.apk',
        url: 'https://api.tisc.csit-events.sg/file?id=clmgec1pa2x3908868ief82yt&name=kpa.apk'
      }
    ],
    sourceUrl: '',
    datePosted: '03/10/2023'
  },
  rubg: {
    ctf: 'TISC 2023',
    title: 'Really Unfair Battleships Game',
    author: 'unknown',
    description: `After last year's hit online RPG game "Slay The Dragon", the cybercriminal organization PALINDROME has once again released another seemingly impossible game called "Really Unfair Battleships Game" (RUBG). This version of Battleships is played on a 16x16 grid, and you only have one life. Once again, we suspect that the game is being used as a recruitment campaign. So once again, you're up!

Things are a little different this time. According to the intelligence we've gathered, just getting a VICTORY in the game is not enough.

PALINDROME would only be handing out flags to hackers who can get a FLAWLESS VICTORY.

You are tasked to beat the game and provide us with the flag (a string in the format TISC{xxx}) that would be displayed after getting a FLAWLESS VICTORY. Our success is critical to ensure the safety of Singapore's cyberspace, as it would allow us to send more undercover operatives to infiltrate PALINDROME.

Godspeed!

You will be provided with the following:

1) Windows Client (.exe)
    - Client takes a while to launch, please wait a few seconds.
    - If Windows SmartScreen pops up, tell it to run the client anyway.
    - If exe does not run, make sure Windows Defender isn't putting it on quarantine.

2) Linux Client (.AppImage)
    - Please install fuse before running, you can do "sudo apt install -y fuse"
    - Tested to work on Ubuntu 22.04 LTS`,
    cats: ['pwn', 'misc'],
    numSolves: 79,
    numPoints: 0,
    attachments: [
      {
        name: 'rubg-1.0.0.AppImage',
        url: 'https://api.tisc.csit-events.sg/file?id=clmdj4qc82n8z0886vjgmdvbt&name=rubg-1.0.0.AppImage'
      },
      {
        name: 'rubg-1.0.0.exe',
        url: 'https://api.tisc.csit-events.sg/file?id=clmdj4rw02n9i0886g19l29d5&name=rubg_1.0.0.exe'
      }
    ],
    sourceUrl: '',
    datePosted: '03/10/2023'
  },
  'palindromes-invitation': {
    ctf: 'TISC 2023',
    title: "PALINDROME's Invitation",
    author: 'unknown',
    description: `Valuable intel suggests that PALINDROME has established a secret online chat room for their members to discuss on plans to invade Singapore's cyber space. One of their junior developers accidentally left a repository public, but he was quick enough to remove all the commit history, only leaving some non-classified files behind. One might be able to just dig out some secrets of PALINDROME and get invited to their secret chat room...who knows?

Start here: [https://github.com/palindrome-wow/PALINDROME-PORTAL](https://github.com/palindrome-wow/PALINDROME-PORTAL)`,
    cats: ['osint', 'misc'],
    numSolves: 58,
    numPoints: 0,
    attachments: [],
    sourceUrl: '',
    datePosted: '03/10/2023'
  },
  'the-chosen-ones': {
    ctf: 'TISC 2023',
    title: 'The Chosen Ones',
    author: 'unknown',
    description: `We have discovered PALINDROME's recruitment site. Infiltrate it and see what you can find!

[http://chals.tisc23.ctf.sg:51943](http://chals.tisc23.ctf.sg:51943)`,
    cats: ['web'],
    numSolves: 52,
    numPoints: 0,
    attachments: [],
    sourceUrl: '',
    datePosted: '03/10/2023'
  },
  devsecmeow: {
    ctf: 'TISC 2023',
    title: 'DevSecMeow',
    author: 'unknown',
    description: `Palindrome has accidentally exposed one of their onboarding guide! Sneak in as a new developer and exfiltrate any meaningful intelligence on their production system.

[https://d3mg5a7c6anwbv.cloudfront.net/](https://d3mg5a7c6anwbv.cloudfront.net/)

Note: Concatenate flag1 and flag2 to form the flag for submission.`,
    cats: ['cloud'],
    numSolves: 28,
    numPoints: 0,
    attachments: [],
    sourceUrl: '',
    datePosted: '03/10/2023'
  },
  'blind-sql-injection': {
    ctf: 'TISC 2023',
    title: 'Blind SQL Injection',
    author: 'unknown',
    description: `As part of the anti-PALINDROME task force, you find yourself face to face with another task.

"We found this horribly made website on their web servers," your superior tells you. "It's probably just a trivial SQL injection vulnerability to extract the admin password. I'm expecting this to be done in about an hour."

You ready your fingers on the keyboard, confident that you'll be able to deliver.

[http://chals.tisc23.ctf.sg:28471/](http://chals.tisc23.ctf.sg:28471/)`,
    cats: ['web', 'rev', 'pwn', 'cloud'],
    numSolves: 18,
    numPoints: 0,
    attachments: [
      {
        name: 'Dockerfile',
        url: 'https://api.tisc.csit-events.sg/file?id=clmdje3ze2oee088694zub7xx&name=Dockerfile'
      },
      {
        name: 'server.js',
        url: 'https://api.tisc.csit-events.sg/file?id=clmdje4292oex08860d9xddn2&name=server.js'
      },

      {
        name: 'db-init.sql',
        url: 'https://api.tisc.csit-events.sg/file?id=clmdje4592ofg0886nr2wi4xd&name=db-init.sql'
      }
    ],
    sourceUrl: '',
    datePosted: '03/10/2023'
  },
  'push-and-pickle': {
    ctf: 'UIUCTF 2024',
    title: 'Push and Pickle',
    author: 'Cameron',
    description: `I love how there are so many different types of pickles. I tried experimenting with two of them.

\`ncat --ssl push-and-pickle.chal.uiuc.tf 1337\``,
    cats: ['misc'],
    numSolves: 55,
    numPoints: 468,
    attachments: [
      {
        name: 'Dockerfile',
        url: 'https://uiuctf-2024-rctf-challenge-uploads.storage.googleapis.com/uploads/94b6be18d35c08f9a1debad0f7363b2d4aba03010e9b816f4fd7ebdb572f0cc4/Dockerfile'
      },
      {
        name: 'chal_redacted.py',
        url: 'https://uiuctf-2024-rctf-challenge-uploads.storage.googleapis.com/uploads/7574993618be07501ddce1ab30a80a83528dc3baa43646220a69f66e965392d4/chal_redacted.py'
      }
    ],
    sourceUrl: '',
    datePosted: '07/07/2024'
  },
  'hi-doggy': {
    ctf: 'Greyhats 2024',
    title: 'Hi Doggy',
    author: 'devesh',
    description: `I figured out the best defence against SSTI, just remove the stuff that can execute code from the template! I even used a whitelist like the pros tell you to do!

[http://challs.nusgreyhats.org:33433/](http://challs.nusgreyhats.org:33433/)`,
    cats: ['web'],
    numSolves: 4,
    numPoints: 968,
    attachments: [
      {
        name: 'dist-hi-doggy.zip',
        url: 'https://ctfd.nusgreyhats.org/files/2ff82bee8684e96e347fe9de0a744dd2/dist-hi-doggy.zip?token=eyJ1c2VyX2lkIjozNSwidGVhbV9pZCI6MTEsImZpbGVfaWQiOjM3fQ.Zqcayw.wKbYG8wRwpZ2VZUC7TkEESrBueo'
      }
    ],
    sourceUrl:
      'https://github.com/NUSGreyhats/greyctf24-challs-public/tree/main/finals/web/hi-doggy',
    datePosted: '29/07/2024'
  },
  'proto-grader': {
    ctf: 'Greyhats 2024',
    title: 'Proto Grader',
    author: 'jro',
    description: `Here's a website to check if you've got the right flag! It's just a prototype at the moment, I hope it doesn't break!

[http://challs.nusgreyhats.org:33337](http://challs.nusgreyhats.org:33337)`,
    cats: ['web'],
    numSolves: 2,
    numPoints: 997,
    attachments: [
      {
        name: 'dist-proto_grader.zip',
        url: 'https://ctfd.nusgreyhats.org/files/b109c61e525f342d1f08427dff46ea9d/dist-proto_grader.zip?token=eyJ1c2VyX2lkIjozNSwidGVhbV9pZCI6MTEsImZpbGVfaWQiOjM4fQ.ZrbkIw.JZLnLOMwC6WLvoFgY5eTq_NbCh4'
      }
    ],
    sourceUrl:
      'https://github.com/NUSGreyhats/greyctf24-challs-public/tree/main/finals/web/proto_grader',
    datePosted: '12/08/2024'
  },
  'navigating-the-digital-labyrinth': {
    ctf: 'TISC 2024',
    title: 'Navigating the Digital Labyrinth',
    author: 'unknown',
    description: `The dust has settled since we won the epic battle against PALINDROME one year ago.

Peace returned to cyberspace, but it was short-lived. Two months ago, screens turned deathly blue, and the base went dark. When power returned, a mysterious entity glitched to life on our monitors. No one knows where it came from or what it plans to do.

Amidst the clandestine realm of cyber warfare, intelligence sources have uncovered the presence of a formidable adversary, Vivoxanderith—a digital specter whose footprint spans the darkest corners of the internet. As a skilled cyber operative, you are entrusted with the critical mission of investigating this elusive figure and their network to end their reign of disruption.

Recent breakthroughs have unveiled Vivoxanderith's online persona: vi_vox223. This revelation marks a pivotal advancement in our pursuit, offering a significant lead towards identifying and neutralizing this threat.

Our mission now requires a meticulous investigation into **vi_vox223**'s activities and connections within the cyber underworld. Identifying and tracking Vivoxanderith brings us one crucial step closer to uncovering the source of the attack and restoring stability to our systems. It is up to you, agent!`,
    cats: ['osint', 'misc'],
    numSolves: 981,
    numPoints: 0,
    attachments: [],
    sourceUrl: '',
    datePosted: '30/09/2024'
  },
  'language-labyrinth-and-graphicsmagick': {
    ctf: 'TISC 2024',
    title: 'Language, Labyrinth and (Graphics)Magick',
    author: 'unknown',
    description: `Good job on identifying the source of the attack! We are one step closer to identifying the mysterious entity, but there's still much we do not know.

Beyond Discord and Uber H3, seems like our enemies are super excited about AI and using it for image transformation. Your fellow agents have managed to gain access to their image transformation app. Is there anyyy chance we could find some vulnerabilities to identify the secrets they are hiding?

Any one of the following instances will work:

[http://chals.tisc24.ctf.sg:36183/](http://chals.tisc24.ctf.sg:36183/)

[http://chals.tisc24.ctf.sg:45018/](http://chals.tisc24.ctf.sg:45018/)

[http://chals.tisc24.ctf.sg:51817/](http://chals.tisc24.ctf.sg:51817/)`,
    cats: ['misc'],
    numSolves: 451,
    numPoints: 0,
    attachments: [],
    sourceUrl: '',
    datePosted: '30/09/2024'
  },
  'digging-up-history': {
    ctf: 'TISC 2024',
    title: 'Digging Up History',
    author: 'unknown',
    description: `Ah, who exactly is behind the attacks? If only our enemies left more images on their image transformation server. We are one step closer, but there is still so much to uncover...

A disc image file was recovered from them! We have heard that they have a history of hiding sensitive data through file hosting sites... Can you help us determine what they might be hiding this time?

[https://assets-hgsv2z3wsyxzjayx.sgp1.digitaloceanspaces.com/disk.zip](https://assets-hgsv2z3wsyxzjayx.sgp1.digitaloceanspaces.com/disk.zip)`,
    cats: ['forensics'],
    numSolves: 342,
    numPoints: 0,
    attachments: [
      {
        name: 'metadata.txt',
        url: 'https://api.tisc24.csit-events.sg/file?id=cm0y2897q386d0854o00mm0rp&name=metadata.txt&req=clzv2z8zr0c5q0854jk6g5acs&reqHash=f316095a237261216e1674a9501c74d2129ef2734263c6cedbc04ddcc4edc5049442a55e83eef141e093af331a2db2e0bc2d8f0cea3803ec5104932fb45f6856&reqExp=1727782114'
      }
    ],
    sourceUrl: '',
    datePosted: '30/09/2024'
  },
  alligatorpay: {
    ctf: 'TISC 2024',
    title: 'AlligatorPay',
    author: 'unknown',
    description: `![AlligatorPay logo](https://assets-hgsv2z3wsyxzjayx.sgp1.digitaloceanspaces.com/agpay.png)

In the dark corners of the internet, whispers of an elite group of hackers aiding our enemies have surfaced. The word on the street is that a good number of members from the elite group happens to be part of an exclusive member tier within AlligatorPay (agpay), a popular payment service.

![AlligatorPay mascot](https://assets-hgsv2z3wsyxzjayx.sgp1.digitaloceanspaces.com/albert.png)

Your task is to find a way to join this exclusive member tier within AlligatorPay and give us intel on future cyberattacks. AlligatorPay recently launched an [online balance checker](https://agpay.chals.tisc24.ctf.sg/) for their payment cards. We heard it's still in beta, so maybe you might find something useful.`,
    cats: ['web'],
    numSolves: 304,
    numPoints: 0,
    attachments: [],
    sourceUrl: '',
    datePosted: '30/09/2024'
  },
  'hardware-isnt-that-hard': {
    ctf: 'TISC 2024',
    title: 'Hardware isnt that Hard!',
    author: 'jiefeng',
    description: `Shucks... it seems like our enemies are making their own silicon chips??!? They have decided to make their own source of trust, a TPM (Trusted Platform Module) or I guess their best attempt at it.

Your fellow agent smuggled one out for us to reverse engineer. Don't ask us how we did it, we just did it, it was hard ...

All we know so far is that their TPM connects to other devices using the i2c bus and does some security stuff inside. Agent! Your mission, should you choose to accept it, is to get us unparalleled intel by finding their TPM's weakness and exfiltrating its secrets.

You will be provided with the following compressed flash dump:
- MD5 (flash_dump.bin.xz) = fdff2dbda38f694111ad744061ca2f8a

Flash was dumped from the device using the command:
\`esptool.py -p /dev/REDACTED -b 921600 read_flash 0 0x400000 flash_dump.bin\`

You can perform your attack on a live TPM module via the i2c implant device hosted behind enemy lines: \`nc chals.tisc24.ctf.sg 61622\``,
    cats: ['rev', 'hardware'],
    numSolves: 89,
    numPoints: 0,
    attachments: [],
    sourceUrl: '',
    datePosted: ''
  },
  noncevigator: {
    ctf: 'TISC 2024',
    title: 'Noncevigator',
    author: 'unknown',
    description: `I guess their Trusted Platform Modules were not so trusted afterall. What about blockchain? Blockchain is secure by design, right?

It seems like our enemies may have hidden some of their treasures somewhere along in our little island, all secured by this blockchain technology.

We have heard rumours that to access the treasure, you must navigate to the correct location and possess the correct value of the "number used only once". This unique code is essential for unlocking the fortified gate guarding the treasure!

Ensure your wallet is sufficiently funded for travel and any potential challenges you may encounter. Your journey begins now. It's your mission now - crack the code and see what treasures they are hiding!

\`nc chals.tisc24.ctf.sg 31127\``,
    cats: ['blockchain'],
    numSolves: 27,
    numPoints: 0,
    attachments: [
      {
        name: 'Noncevigator.sol',
        url: 'https://api.tisc24.csit-events.sg/file?id=cm0y2ck5t38p80854hillis2k&name=Noncevigator.sol&req=clzv2z8zr0c5q0854jk6g5acs&reqHash=f316095a237261216e1674a9501c74d2129ef2734263c6cedbc04ddcc4edc5049442a55e83eef141e093af331a2db2e0bc2d8f0cea3803ec5104932fb45f6856&reqExp=1727782114'
      }
    ],
    sourceUrl: '',
    datePosted: ''
  },
  'baby-flagchecker': {
    ctf: 'TISC 2024',
    title: 'Baby Flagchecker',
    author: 'unknown',
    description: `You've come so far, brave agents! Let us continue our mission to identify our threats, and retrieve the crucial information that they are hiding from the world.

While scanning their network, your fellow agents chanced upon a tool used by the adversary that checks for the validity of a secret passphrase.

We know that they use this phrase for establishing communications between one another, but the one we have is way outdated... It's time for an update.

[http://chals.tisc24.ctf.sg:52416/](http://chals.tisc24.ctf.sg:52416/)`,
    cats: ['rev', 'blockchain'],
    numSolves: 17,
    numPoints: 0,
    attachments: [
      {
        name: 'baby_flagchecker.zip',
        url: 'https://api.tisc24.csit-events.sg/file?id=cm0y2eipy38w208543nwsh40i&name=baby_flagchecker.zip&req=clzv2z8zr0c5q0854jk6g5acs&reqHash=f316095a237261216e1674a9501c74d2129ef2734263c6cedbc04ddcc4edc5049442a55e83eef141e093af331a2db2e0bc2d8f0cea3803ec5104932fb45f6856&reqExp=1727782114'
      }
    ],
    sourceUrl: '',
    datePosted: ''
  },
  wallfacer: {
    ctf: 'TISC 2024',
    title: 'Wallfacer',
    author: 'unknown',
    description: `Breaking news! We've managed to seize an app from their device.

It seems to be an app that stores user data, but doesn't seem to do much other than that... The other agent who recovered this said he heard them say something about parts of the app are only loaded during runtime, hiding crucial details.

It's up to you now! Can you break through the walls and unveil the hidden secrets within this app?`,
    cats: ['rev', 'mobile'],
    numSolves: 33,
    numPoints: 0,
    attachments: [
      {
        name: 'wallfacer-x86_64.apk',
        url: 'https://api.tisc24.csit-events.sg/file?id=cm0y2fvoj39f30854r5m17r1q&name=wallfacer-x86_64.apk&req=clzv2z8zr0c5q0854jk6g5acs&reqHash=f316095a237261216e1674a9501c74d2129ef2734263c6cedbc04ddcc4edc5049442a55e83eef141e093af331a2db2e0bc2d8f0cea3803ec5104932fb45f6856&reqExp=1727782114'
      }
    ],
    sourceUrl: '',
    datePosted: ''
  },
  imphash: {
    ctf: 'TISC 2024',
    title: 'Imphash',
    author: 'jro',
    description: `Almost there agent, we might have a chance to gain access into the enemy's systems again!! We are so close.

But, it seems like they've developed a robust anti-malware service that's thwarting all attempts to breach their systems!

We've found this import hashing plugin which is a key component of their malware analysis pipeline. Agent, can you find a way around it?

\`nc chals.tisc24.ctf.sg 53719\``,
    cats: ['pwn'],
    numSolves: 17,
    numPoints: 0,
    attachments: [
      {
        name: 'imphash.zip',
        url: 'https://api.tisc24.csit-events.sg/file?id=cm0y2gp5539kc0854kuz8ze52&name=imphash.zip&req=clzv2z8zr0c5q0854jk6g5acs&reqHash=f316095a237261216e1674a9501c74d2129ef2734263c6cedbc04ddcc4edc5049442a55e83eef141e093af331a2db2e0bc2d8f0cea3803ec5104932fb45f6856&reqExp=1727782114'
      }
    ],
    sourceUrl: '',
    datePosted: ''
  },
  diffuse: {
    ctf: 'TISC 2024',
    title: 'Diffuse',
    author: 'Jon Chiang',
    description: `!!! We've found a weird device with a timer counting down! Ccould..it... be...a bomb....?? Your fellow agents found some access into the engineer's machine, will you be able to find some clues and diffuse it before it's too late?

For details on your instance, talk to @DiffuseInstanceBot on Telegram.

Note: Instances may be refreshed periodically. Remember to save your work outside of the instance!`,
    cats: ['forensics', 'web', 'rev', 'hardware'],
    numSolves: 14,
    numPoints: 0,
    attachments: [],
    sourceUrl: '',
    datePosted: ''
  }
}
